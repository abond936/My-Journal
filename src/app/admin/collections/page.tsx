'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import styles from './page.module.css';

interface CardsResponse {
  items: Card[];
}

type BulkCardTypeFilter = 'all' | Card['type'];

function cardLabel(card: Card): string {
  return card.title || card.subtitle || 'Untitled';
}

interface DraggableCardProps {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function DraggableCard({ card, className, children, disabled }: DraggableCardProps) {
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

interface UnparentDropZoneProps {
  className: string;
  children: React.ReactNode;
}

function UnparentDropZone({ className, children }: UnparentDropZoneProps) {
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({ id: 'unparented', disabled: dragKind !== 'reparent' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

interface TreeRootDropZoneProps {
  className: string;
  children: React.ReactNode;
}

function TreeRootDropZone({ className, children }: TreeRootDropZoneProps) {
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({ id: 'tree-root', disabled: dragKind !== 'reparent' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

export default function CollectionsAdminPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [curatedDragKind, setCuratedDragKind] = useState<CuratedTreeDragKind>(null);
  const hasInitializedTreeExpansionRef = useRef(false);
  const [bulkParentId, setBulkParentId] = useState<string | null>(null);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [bulkType, setBulkType] = useState<BulkCardTypeFilter>('all');
  const [bulkUnparentedOnly, setBulkUnparentedOnly] = useState(true);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );
  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      if (!tabsEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cards?limit=1000&status=all&hydration=cover-only&sort=newest');
      const data = (await res.json()) as CardsResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load cards');
      setCards(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const cardById = useMemo(() => new Map(cards.map(c => [c.docId, c])), [cards]);

  const parentByChild = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of cards) {
      const children = normalizeCuratedChildIds(parent.childrenIds);
      children.forEach(childId => {
        map.set(childId, parent.docId);
      });
    }
    return map;
  }, [cards]);

  const childIdSet = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((card) => normalizeCuratedChildIds(card.childrenIds).forEach((id) => set.add(id)));
    return set;
  }, [cards]);

  const rootedCollections = useMemo(() => {
    const list = cards.filter((card) => {
      if (parentByChild.has(card.docId)) return false;
      const children = normalizeCuratedChildIds(card.childrenIds);
      return children.length > 0 || card.curatedRoot === true;
    });
    list.sort(compareCuratedRootCards);
    return list;
  }, [cards, parentByChild]);

  const [treeExpandedIds, setTreeExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const expandableIds = new Set<string>();
    for (const c of cards) {
      if (c.docId && normalizeCuratedChildIds(c.childrenIds).length > 0) {
        expandableIds.add(c.docId);
      }
    }

    if (!hasInitializedTreeExpansionRef.current) {
      hasInitializedTreeExpansionRef.current = true;
      setTreeExpandedIds(expandableIds);
      return;
    }

    setTreeExpandedIds((prev) => {
      const next = new Set<string>();
      // After initial load, preserve only explicit user choices for currently expandable nodes.
      prev.forEach((id) => {
        if (expandableIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [cards]);

  const toggleTreeExpanded = useCallback((id: string) => {
    setTreeExpandedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const collectDescendantIds = useCallback(
    (rootId: string): Set<string> => {
      const descendants = new Set<string>();
      const stack = [rootId];
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        const currentCard = cardById.get(currentId);
        if (!currentCard) continue;
        for (const childId of normalizeCuratedChildIds(currentCard.childrenIds)) {
          if (descendants.has(childId)) continue;
          descendants.add(childId);
          stack.push(childId);
        }
      }
      return descendants;
    },
    [cardById]
  );

  const openBulkAddForParent = useCallback((parentId: string) => {
    setBulkParentId(parentId);
    setBulkSearch('');
    setBulkStatus('all');
    setBulkType('all');
    setBulkUnparentedOnly(true);
    setBulkSelectedIds(new Set());
    setBulkSummary(null);
  }, []);

  const closeBulkAdd = useCallback(() => {
    setBulkParentId(null);
    setBulkSelectedIds(new Set());
  }, []);

  const unparentedCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = cards.filter(card => {
      if (parentByChild.has(card.docId)) return false;
      if (childIdSet.has(card.docId)) return false; // hide collection parents from the right pane
      if (card.curatedRoot === true) return false; // hide explicit curated roots even without children
      if (statusFilter !== 'all' && card.status !== statusFilter) return false;
      if (!q) return true;
      return (card.title || '').toLowerCase().includes(q);
    });
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return filtered;
  }, [cards, parentByChild, childIdSet, search, statusFilter]);

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
    const parent = cardById.get(parentId);
    if (!parent?.docId) return;
    const nextChildren = buildChildrenIdsWithInsertBefore(parent.childrenIds, childId, beforeSiblingId);
    setSaving(true);
    setError(null);
    try {
      await patchCard(parentId, { childrenIds: nextChildren });
      await patchCard(childId, { curatedRoot: false });
      await load();
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
        const currentParent = cardById.get(currentParentId);
        if (currentParent?.docId) {
          const detached = normalizeCuratedChildIds(currentParent.childrenIds).filter((id) => id !== childId);
          await patchCard(currentParentId, { childrenIds: detached });
        }
      }
      await Promise.all(
        newRootIds.map((id, idx) =>
          patchCard(id, {
            curatedRootOrder: idx * 10,
            ...(id === childId ? { curatedRoot: true } : {}),
          })
        )
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert root');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId) return;
    if (childId === parentId) return;
    if (parentByChild.get(childId) === parentId) return;
    const parent = cardById.get(parentId);
    if (!parent) return;
    const nextChildren = Array.from(new Set([...normalizeCuratedChildIds(parent.childrenIds), childId]));
    setSaving(true);
    setError(null);
    try {
      await patchCard(parentId, { childrenIds: nextChildren });
      await patchCard(childId, { curatedRoot: false });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach child');
    } finally {
      setSaving(false);
    }
  };

  const handleDetachChild = async (childId: string) => {
    const parentId = parentByChild.get(childId);
    if (!parentId) return;
    const parent = cardById.get(parentId);
    if (!parent) return;
    const nextChildren = normalizeCuratedChildIds(parent.childrenIds).filter((id) => id !== childId);
    setSaving(true);
    setError(null);
    try {
      await patchCard(parentId, { childrenIds: nextChildren });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to detach child');
    } finally {
      setSaving(false);
    }
  };

  const parseCardId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.startsWith('card:') ? value.slice(5) : null;
  };

  const parseParentId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.startsWith('parent:') ? value.slice(7) : null;
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
          const currentParent = cardById.get(currentParentId);
          if (currentParent) {
            const nextChildren = normalizeCuratedChildIds(currentParent.childrenIds).filter(
              (id) => id !== childId
            );
            await patchCard(currentParentId, { childrenIds: nextChildren });
          }
        }
        const nextOrder = nextCuratedRootOrderForAppend(rootedCollections, childId);
        await patchCard(childId, { curatedRoot: true, curatedRootOrder: nextOrder });
        await load();
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

  const bulkParentCard = bulkParentId ? cardById.get(bulkParentId) ?? null : null;
  const bulkParentDescendants = useMemo(
    () => (bulkParentId ? collectDescendantIds(bulkParentId) : new Set<string>()),
    [bulkParentId, collectDescendantIds]
  );
  const bulkParentChildrenSet = useMemo(
    () => new Set(normalizeCuratedChildIds(bulkParentCard?.childrenIds)),
    [bulkParentCard]
  );
  const bulkCandidates = useMemo(() => {
    if (!bulkParentId) return [] as Card[];
    const q = bulkSearch.trim().toLowerCase();
    const list = cards.filter((card) => {
      if (!card.docId) return false;
      if (card.docId === bulkParentId) return false;
      if (bulkParentDescendants.has(card.docId)) return false;
      if (bulkUnparentedOnly && parentByChild.has(card.docId)) return false;
      if (bulkStatus !== 'all' && card.status !== bulkStatus) return false;
      if (bulkType !== 'all' && card.type !== bulkType) return false;
      if (q) {
        const title = (card.title || '').toLowerCase();
        const subtitle = (card.subtitle || '').toLowerCase();
        if (!title.includes(q) && !subtitle.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [bulkParentId, bulkSearch, bulkStatus, bulkType, bulkUnparentedOnly, bulkParentDescendants, cards, parentByChild]);

  const bulkSelectableIds = useMemo(
    () => new Set(bulkCandidates.filter((card) => card.docId && !bulkParentChildrenSet.has(card.docId)).map((card) => card.docId!)),
    [bulkCandidates, bulkParentChildrenSet]
  );

  const bulkSelectedCount = useMemo(() => {
    let count = 0;
    bulkSelectedIds.forEach((id) => {
      if (bulkSelectableIds.has(id)) count += 1;
    });
    return count;
  }, [bulkSelectedIds, bulkSelectableIds]);

  const toggleBulkSelection = useCallback((cardId: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const handleSelectAllBulk = useCallback(() => {
    setBulkSelectedIds(new Set(bulkSelectableIds));
  }, [bulkSelectableIds]);

  const handleClearAllBulk = useCallback(() => {
    setBulkSelectedIds(new Set());
  }, []);

  const handleApplyBulkAdd = useCallback(async () => {
    if (!bulkParentCard?.docId) return;
    const selectedIds = Array.from(bulkSelectedIds).filter((id) => bulkSelectableIds.has(id));
    if (selectedIds.length === 0) return;
    const existingChildren = normalizeCuratedChildIds(bulkParentCard.childrenIds);
    const existingSet = new Set(existingChildren);
    const added = selectedIds.filter((id) => !existingSet.has(id));
    if (added.length === 0) {
      setBulkSummary('No changes needed. All selected cards were already children.');
      return;
    }
    const nextChildren = Array.from(new Set([...existingChildren, ...selectedIds]));
    setSaving(true);
    setError(null);
    setBulkSummary(null);
    try {
      await patchCard(bulkParentCard.docId, { childrenIds: nextChildren });
      await load();
      setBulkSelectedIds(new Set());
      setBulkSummary(`Added ${added.length} card${added.length === 1 ? '' : 's'} to "${cardLabel(bulkParentCard)}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to bulk add cards');
    } finally {
      setSaving(false);
    }
  }, [bulkParentCard, bulkSelectedIds, bulkSelectableIds]);

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <h1>Collections Management</h1>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading cards...</p> : null}

      {!loading ? (
        <DndContext
          sensors={sensors}
          collisionDetection={curatedTreeCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <CuratedTreeDragProvider value={curatedDragKind}>
          <div className={styles.layout}>
            <section className={styles.panel}>
              <h2>Curated Tree</h2>
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
                        expandedIds={treeExpandedIds}
                        toggleExpanded={toggleTreeExpanded}
                        saving={saving}
                        onDetachChild={(id) => void handleDetachChild(id)}
                        onOpenBulkAdd={openBulkAddForParent}
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
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={styles.input}
                  placeholder="Search by title..."
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                  className={styles.statusSelect}
                  aria-label="Filter unparented cards by status"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className={styles.panelScroll}>
                <UnparentDropZone className={styles.unparentDropZone}>
                  <ul className={styles.list}>
                    {unparentedCards.map(card => (
                      <li key={card.docId} className={styles.listRowWrap}>
                        <DraggableCard
                          card={card}
                          className={styles.listRow}
                          disabled={saving}
                        >
                          <div>
                            <div className={styles.nodeTitle}>{cardLabel(card)}</div>
                          </div>
                        </DraggableCard>
                      </li>
                    ))}
                  </ul>
                </UnparentDropZone>
              </div>
            </section>
          </div>
          {curatedDragKind === 'reparent' && draggingCardId ? (
            <p className={`${styles.draggingStatus} ${styles.draggingStatusReparent}`} role="status" aria-live="polite">
              <strong>Reparenting</strong> — «{reparentTitle}». Drop on a <strong>title</strong> to nest, the{' '}
              <strong>band above a row</strong> to insert before that row, the dashed box for a root at the end, or{' '}
              <strong>Unparented</strong>.
            </p>
          ) : null}
          {bulkParentCard ? (
            <div className={styles.modalBackdrop} role="presentation" onClick={closeBulkAdd}>
              <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Bulk add cards to parent"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h3>Bulk add to: {cardLabel(bulkParentCard)}</h3>
                  <button type="button" className={styles.smallButton} onClick={closeBulkAdd}>
                    Close
                  </button>
                </div>
                <p className={styles.hint}>
                  Select cards to add as direct children. Existing children are shown but cannot be selected.
                </p>
                {bulkSummary ? <p className={styles.bulkSummary}>{bulkSummary}</p> : null}
                <div className={styles.bulkControlsGrid}>
                  <input
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className={styles.input}
                    placeholder="Search title or subtitle..."
                    aria-label="Search bulk-add candidates"
                  />
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as 'all' | 'draft' | 'published')}
                    className={styles.statusSelect}
                    aria-label="Filter candidates by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as BulkCardTypeFilter)}
                    className={styles.statusSelect}
                    aria-label="Filter candidates by type"
                  >
                    <option value="all">All types</option>
                    <option value="story">Story</option>
                    <option value="gallery">Gallery</option>
                    <option value="qa">Q&A</option>
                    <option value="quote">Quote</option>
                    <option value="callout">Callout</option>
                  </select>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={bulkUnparentedOnly}
                      onChange={(e) => setBulkUnparentedOnly(e.target.checked)}
                    />
                    Unparented only
                  </label>
                </div>
                <div className={styles.bulkActionsRow}>
                  <button type="button" className={styles.smallButton} onClick={handleSelectAllBulk}>
                    Select all visible
                  </button>
                  <button type="button" className={styles.smallButton} onClick={handleClearAllBulk}>
                    Clear
                  </button>
                  <span className={styles.hint}>
                    {bulkSelectedCount} selected · {bulkCandidates.length} candidates
                  </span>
                </div>
                <div className={styles.bulkList}>
                  <ul className={styles.list}>
                    {bulkCandidates.map((card) => {
                      const cardId = card.docId!;
                      const alreadyChild = bulkParentChildrenSet.has(cardId);
                      const disabled = alreadyChild;
                      const checked = bulkSelectedIds.has(cardId);
                      return (
                        <li key={cardId} className={styles.bulkListRow}>
                          <label className={styles.bulkRowLabel}>
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={() => toggleBulkSelection(cardId)}
                            />
                            <span className={styles.nodeTitle}>{cardLabel(card)}</span>
                          </label>
                          <span className={styles.nodeMeta}>
                            {alreadyChild ? 'Already child' : `${card.type} · ${card.status}`}
                          </span>
                        </li>
                      );
                    })}
                    {bulkCandidates.length === 0 ? (
                      <li className={styles.bulkListRow}>
                        <span className={styles.hint}>No cards match current filters.</span>
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className={styles.bulkFooter}>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => void handleApplyBulkAdd()}
                    disabled={saving || bulkSelectedCount === 0}
                  >
                    Add selected to TOC card
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          </CuratedTreeDragProvider>
        </DndContext>
      ) : null}
    </div>
  );
}
