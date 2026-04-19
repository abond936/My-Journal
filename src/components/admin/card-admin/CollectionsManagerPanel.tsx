'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/lib/types/card';
import { usePersistentTreeExpansion } from '@/lib/hooks/usePersistentTreeExpansion';
import { useTag } from '@/components/providers/TagProvider';
import { useCardContext } from '@/components/providers/CardProvider';
import { CuratedTreeNode } from '@/components/admin/card-admin/CuratedTreeNode';
import {
  CuratedTreeDragProvider,
  useCuratedTreeDragKind,
  type CuratedTreeDragKind,
} from '@/components/admin/card-admin/curatedTreeDragContext';
import { curatedTreeCollisionDetection } from '@/components/admin/card-admin/curatedTreeCollisionDetection';
import {
  buildChildrenIdsWithInsertBefore,
  buildRootDocIdListWithInsertBefore,
  compareCuratedRootCards,
  nextCuratedRootOrderForAppend,
  normalizeCuratedChildIds,
} from '@/lib/utils/curatedCollectionTree';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import styles from '@/app/admin/collections/page.module.css';

function cardLabel(card: Card): string {
  return card.title || card.subtitle || 'Untitled';
}

function DraggableCard({
  card,
  className,
  children,
  disabled,
}: {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: { cardId: card.docId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function UnparentDropZone({ className, children }: { className: string; children: React.ReactNode }) {
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({ id: 'unparented', disabled: dragKind !== 'reparent' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

function TreeRootDropZone({ className, children }: { className: string; children: React.ReactNode }) {
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({ id: 'tree-root', disabled: dragKind !== 'reparent' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

interface CollectionsManagerPanelProps {
  cards: Card[];
  /** When true, refetch the full card catalog for tree + unparented (avoids stale data). */
  collectionsActive?: boolean;
}

function intersectsAny(haystack: string[] | undefined, needles: string[]): boolean {
  if (!needles.length) return true;
  const set = new Set(haystack || []);
  return needles.some((id) => set.has(id));
}

export default function CollectionsManagerPanel({
  cards,
  collectionsActive = false,
}: CollectionsManagerPanelProps) {
  const { selectedFilterTagIds, tags: providerTags } = useTag();
  const { cardType, searchTerm } = useCardContext();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loadingAllCards, setLoadingAllCards] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusValue, setStatusValue] = useState<'all' | 'draft' | 'published'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [curatedDragKind, setCuratedDragKind] = useState<CuratedTreeDragKind>(null);
  const {
    expandedIds,
    toggleExpanded,
    initializeIfEmpty,
    expandAll: setExpandedAll,
    collapseAll,
  } = usePersistentTreeExpansion('myjournal:collections-tree:expanded');
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const loadAllCards = useCallback(async () => {
    setLoadingAllCards(true);
    try {
      const params = new URLSearchParams({
        limit: '2500',
        status: 'all',
        hydration: 'cover-only',
        sortBy: 'created',
        sortDir: 'desc',
      });
      const res = await fetch(`/api/cards?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as { items?: Card[] };
      if (res.ok && Array.isArray(data.items)) setAllCards(data.items);
    } finally {
      setLoadingAllCards(false);
    }
  }, []);

  useEffect(() => {
    if (collectionsActive) void loadAllCards();
  }, [collectionsActive, loadAllCards]);

  /** Merge paginated `cards` (fresher after edits) with full `allCards` so new/updated rows appear. */
  const mergedCatalog = useMemo(() => {
    const byId = new Map<string, Card>();
    for (const c of allCards) {
      if (c.docId) byId.set(c.docId, c);
    }
    for (const c of cards) {
      if (!c.docId) continue;
      const prev = byId.get(c.docId);
      if (!prev) {
        byId.set(c.docId, c);
        continue;
      }
      const merged: Card = { ...prev, ...c };
      // Paginated SWR rows can omit fields; shallow spread would wipe `childrenIds` / curated flags and
      // break parentByChild (children wrongly listed as unparented).
      if (!Object.hasOwn(c, 'childrenIds')) merged.childrenIds = prev.childrenIds;
      if (!Object.hasOwn(c, 'curatedRoot')) merged.curatedRoot = prev.curatedRoot;
      if (!Object.hasOwn(c, 'curatedRootOrder')) merged.curatedRootOrder = prev.curatedRootOrder;
      byId.set(c.docId, merged);
    }
    return Array.from(byId.values());
  }, [allCards, cards]);

  const dimensionalTags = useMemo(() => {
    const map: { who?: string[]; what?: string[]; when?: string[]; where?: string[] } = {};
    const all = providerTags || [];
    selectedFilterTagIds.forEach((tagId) => {
      const tag = all.find((t) => t.docId === tagId);
      if (!tag?.dimension) return;
      const dim = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
      if (dim !== 'who' && dim !== 'what' && dim !== 'when' && dim !== 'where') return;
      if (!map[dim]) map[dim] = [];
      map[dim]!.push(tagId);
    });
    return map;
  }, [selectedFilterTagIds, providerTags]);

  const cardMatchesSidebar = useCallback(
    (card: Card): boolean => {
      if (cardType && cardType !== 'all' && card.type !== cardType) return false;
      const q = searchTerm?.trim().toLowerCase();
      if (q) {
        const title = (card.title || '').toLowerCase();
        if (!title.includes(q)) return false;
      }
      const { who, what, when, where } = dimensionalTags;
      if (who?.length && !intersectsAny(card.who, who)) return false;
      if (what?.length && !intersectsAny(card.what, what)) return false;
      if (when?.length && !intersectsAny(card.when, when)) return false;
      if (where?.length && !intersectsAny(card.where, where)) return false;
      return true;
    },
    [cardType, searchTerm, dimensionalTags]
  );

  const cardById = useMemo(() => new Map(mergedCatalog.map((c) => [c.docId, c])), [mergedCatalog]);

  const parentByChild = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of mergedCatalog) {
      const children = normalizeCuratedChildIds(parent.childrenIds);
      children.forEach((childId) => map.set(childId, parent.docId!));
    }
    return map;
  }, [mergedCatalog]);

  const childIdSet = useMemo(() => {
    const set = new Set<string>();
    mergedCatalog.forEach((card) => normalizeCuratedChildIds(card.childrenIds).forEach((id) => set.add(id)));
    return set;
  }, [mergedCatalog]);

  const rootedCollections = useMemo(() => {
    const list = mergedCatalog.filter((card) => {
      if (parentByChild.has(card.docId)) return false;
      const children = normalizeCuratedChildIds(card.childrenIds);
      return children.length > 0 || card.curatedRoot === true;
    });
    list.sort(compareCuratedRootCards);
    return list;
  }, [mergedCatalog, parentByChild]);

  useEffect(() => {
    initializeIfEmpty(rootedCollections.map((root) => root.docId));
  }, [rootedCollections, initializeIfEmpty]);

  const unparentedCards = useMemo(() => {
    const list = mergedCatalog.filter((card) => {
      if (!card.docId) return false;
      if (!cardMatchesSidebar(card)) return false;
      if (parentByChild.has(card.docId)) return false;
      if (childIdSet.has(card.docId)) return false;
      if (card.curatedRoot === true) return false;
      if (statusValue !== 'all' && card.status !== statusValue) return false;
      const q = searchValue.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [mergedCatalog, parentByChild, childIdSet, searchValue, statusValue, cardMatchesSidebar]);

  const patchCard = async (cardId: string, payload: Partial<Card>) => {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update collection membership');
    }
  };

  const handleInsertChildBeforeSibling = async (childId: string, beforeSiblingId: string) => {
    if (!childId || !beforeSiblingId || childId === beforeSiblingId) return;
    if (parentByChild.get(beforeSiblingId) === childId) return;

    const parentId = parentByChild.get(beforeSiblingId);
    if (!parentId) {
      await handleInsertRootBefore(childId, beforeSiblingId);
      return;
    }
    if (!cardById.get(parentId)?.docId) return;
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = buildChildrenIdsWithInsertBefore(parentFresh.childrenIds, childId, beforeSiblingId);
      await patchCard(parentId, { childrenIds: nextChildren });
      await patchCard(childId, { curatedRoot: false });
      await loadAllCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert card');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertRootBefore = async (childId: string, beforeRootId: string) => {
    if (!beforeRootId || childId === beforeRootId) return;
    const rootIds = rootedCollections.map((r) => r.docId!);
    const newRootIds = buildRootDocIdListWithInsertBefore(rootIds, childId, beforeRootId);
    const currentParentId = parentByChild.get(childId);
    setSaving(true);
    setError(null);
    try {
      if (currentParentId) {
        const currentFresh = await fetchAdminCardSnapshot(currentParentId);
        const detached = normalizeCuratedChildIds(currentFresh.childrenIds).filter((id) => id !== childId);
        await patchCard(currentParentId, { childrenIds: detached });
      }
      await Promise.all(
        newRootIds.map((id, idx) =>
          patchCard(id, {
            curatedRootOrder: idx * 10,
            ...(id === childId ? { curatedRoot: true } : {}),
          })
        )
      );
      await loadAllCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert root');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId || childId === parentId || parentByChild.get(childId) === parentId) return;
    if (!cardById.get(parentId)) return;
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = Array.from(
        new Set([...normalizeCuratedChildIds(parentFresh.childrenIds), childId])
      );
      await patchCard(parentId, { childrenIds: nextChildren });
      await patchCard(childId, { curatedRoot: false });
      await loadAllCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach child');
    } finally {
      setSaving(false);
    }
  };

  const handleDetachChild = async (childId: string) => {
    const parentId = parentByChild.get(childId);
    if (!parentId) return;
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = normalizeCuratedChildIds(parentFresh.childrenIds).filter((id) => id !== childId);
      await patchCard(parentId, { childrenIds: nextChildren });
      await loadAllCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to detach child');
    } finally {
      setSaving(false);
    }
  };

  const parseCardId = (value: unknown): string | null =>
    typeof value === 'string' && value.startsWith('card:') ? value.slice(5) : null;
  const parseParentId = (value: unknown): string | null =>
    typeof value === 'string' && value.startsWith('parent:') ? value.slice(7) : null;

  const expandAll = () => {
    const next = new Set<string>();
    mergedCatalog.forEach((card) => {
      if (card.docId && normalizeCuratedChildIds(card.childrenIds).length > 0) next.add(card.docId);
    });
    rootedCollections.forEach((root) => next.add(root.docId));
    setExpandedAll(Array.from(next));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const raw = event.active.id;
    const id = typeof raw === 'string' ? raw : String(raw);
    if (id.startsWith('card:')) {
      setCuratedDragKind('reparent');
      setDraggingCardId(id.slice(5));
    } else {
      setCuratedDragKind(null);
      setDraggingCardId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setCuratedDragKind(null);
    setDraggingCardId(null);
    const rawActive = event.active.id;
    const rawOver = event.over?.id ?? null;
    const activeStr = typeof rawActive === 'string' ? rawActive : String(rawActive);
    const overStr = rawOver != null ? (typeof rawOver === 'string' ? rawOver : String(rawOver)) : null;

    const childId = parseCardId(activeStr);
    const overId = overStr;
    if (!childId || !overId || saving) return;

    if (overId === 'unparented') {
      await handleDetachChild(childId);
      return;
    }

    if (overId === 'tree-root') {
      setSaving(true);
      setError(null);
      try {
        const currentParentId = parentByChild.get(childId);
        if (currentParentId) {
          const currentFresh = await fetchAdminCardSnapshot(currentParentId);
          const nextChildren = normalizeCuratedChildIds(currentFresh.childrenIds).filter((id) => id !== childId);
          await patchCard(currentParentId, { childrenIds: nextChildren });
        }
        const nextOrder = nextCuratedRootOrderForAppend(rootedCollections, childId);
        await patchCard(childId, { curatedRoot: true, curatedRootOrder: nextOrder });
        await loadAllCards();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set curated root');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (overId.startsWith('insertBefore:')) {
      const beforeId = overId.slice('insertBefore:'.length);
      if (beforeId) await handleInsertChildBeforeSibling(childId, beforeId);
      return;
    }

    const parentId = parseParentId(overId);
    if (!parentId) return;
    await handleAttachChild(childId, parentId);
  };

  const reparentTitle =
    draggingCardId && cardById.get(draggingCardId) ? cardLabel(cardById.get(draggingCardId)!) : draggingCardId || '';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={curatedTreeCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CuratedTreeDragProvider value={curatedDragKind}>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>Curated Tree</h2>
          <div className={styles.treeToolbar}>
            <button type="button" className={styles.smallButton} onClick={expandAll}>Expand all</button>
            <button type="button" className={styles.smallButton} onClick={collapseAll}>Collapse all</button>
          </div>
          <div className={styles.panelScroll}>
            <TreeRootDropZone className={styles.treeRootDropZone}>
              {rootedCollections.length === 0 ? (
                <p className={styles.emptyTreeHint}>Drop a card here to start your curated tree.</p>
              ) : null}
              <ul className={styles.treeList}>
                {rootedCollections.map((root) => (
                  <CuratedTreeNode
                    key={root.docId}
                    node={root}
                    seen={new Set()}
                    cardById={cardById}
                    parentByChild={parentByChild}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    saving={saving}
                    onDetachChild={(id) => void handleDetachChild(id)}
                    onOpenBulkAdd={() => {
                      // Legacy panel does not expose bulk modal yet.
                    }}
                  />
                ))}
              </ul>
            </TreeRootDropZone>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Unparented Cards</h2>
          <p className={styles.hint}>Drop a card here to remove its parent.</p>
          <div className={styles.controlsRow}>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={styles.input}
              placeholder="Search by title..."
              aria-label="Search cards by title"
            />
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value as 'all' | 'draft' | 'published')}
              className={styles.statusSelect}
              aria-label="Filter cards by status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          {loadingAllCards ? <p className={styles.hint}>Loading cards...</p> : null}
          <div className={styles.panelScroll}>
            <UnparentDropZone className={styles.unparentDropZone}>
              <ul className={styles.list}>
                {unparentedCards.map((card) => (
                  <li key={card.docId} className={styles.listRowWrap}>
                    <DraggableCard
                      card={card}
                      className={styles.listRow}
                      disabled={saving}
                    >
                      <div className={styles.nodeTitle}>{cardLabel(card)}</div>
                    </DraggableCard>
                  </li>
                ))}
                {unparentedCards.length === 0 ? (
                  <li className={styles.listRowWrap}>
                    <div className={styles.hint}>No unparented cards match current sidebar and local filters.</div>
                  </li>
                ) : null}
              </ul>
            </UnparentDropZone>
          </div>
        </section>
      </div>
      {curatedDragKind === 'reparent' && draggingCardId ? (
        <p className={`${styles.draggingStatus} ${styles.draggingStatusReparent}`} role="status" aria-live="polite">
          <strong>Reparenting</strong> — «{reparentTitle}». Drop on a <strong>title</strong> to nest under it, the{' '}
          <strong>band above a row</strong> to insert before that row, the dashed box for a root at the end, or{' '}
          <strong>Unparented</strong> to detach.
        </p>
      ) : null}
      </CuratedTreeDragProvider>
    </DndContext>
  );
}

