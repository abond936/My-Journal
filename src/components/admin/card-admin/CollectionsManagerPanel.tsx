'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import styles from '@/app/admin/collections/page.module.css';

function normalizeChildren(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  ids.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const id = raw.trim();
    if (!id) return;
    seen.add(id);
  });
  return Array.from(seen);
}

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
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function ParentDropZone({
  parentId,
  className,
  children,
}: {
  parentId: string;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `parent:${parentId}` });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

function UnparentDropZone({ className, children }: { className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unparented' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

function TreeRootDropZone({ className, children }: { className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tree-root' });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

interface CollectionsManagerPanelProps {
  cards: Card[];
  onReload: () => Promise<unknown>;
}

export default function CollectionsManagerPanel({
  cards,
  onReload,
}: CollectionsManagerPanelProps) {
  const [allCards, setAllCards] = useState<Card[]>(cards);
  const [loadingAllCards, setLoadingAllCards] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusValue, setStatusValue] = useState<'all' | 'draft' | 'published'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const {
    expandedIds,
    toggleExpanded,
    initializeIfEmpty,
    expandAll: setExpandedAll,
    collapseAll,
  } = usePersistentTreeExpansion('myjournal:collections-tree:expanded');
  const sensors = useSensors(useSensor(PointerSensor));

  const loadAllCards = async () => {
    setLoadingAllCards(true);
    try {
      const res = await fetch('/api/cards?limit=1000&status=all&hydration=cover-only&sort=newest');
      const data = (await res.json().catch(() => ({}))) as { items?: Card[] };
      if (res.ok && Array.isArray(data.items)) setAllCards(data.items);
    } finally {
      setLoadingAllCards(false);
    }
  };

  useEffect(() => {
    void loadAllCards();
  }, []);

  const cardById = useMemo(() => new Map(allCards.map((c) => [c.docId, c])), [allCards]);

  const parentByChild = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of allCards) {
      const children = normalizeChildren(parent.childrenIds);
      children.forEach((childId) => map.set(childId, parent.docId));
    }
    return map;
  }, [allCards]);

  const childIdSet = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((card) => normalizeChildren(card.childrenIds).forEach((id) => set.add(id)));
    return set;
  }, [allCards]);

  const rootedCollections = useMemo(
    () =>
      allCards.filter((card) => {
        if (parentByChild.has(card.docId)) return false;
        const children = normalizeChildren(card.childrenIds);
        return children.length > 0 || card.curatedRoot === true;
      }),
    [allCards, parentByChild]
  );

  useEffect(() => {
    initializeIfEmpty(rootedCollections.map((root) => root.docId));
  }, [rootedCollections, initializeIfEmpty]);

  const unparentedCards = useMemo(() => {
    const list = cards.filter((card) => {
      if (parentByChild.has(card.docId)) return false;
      if (childIdSet.has(card.docId)) return false;
      if (statusValue !== 'all' && card.status !== statusValue) return false;
      const q = searchValue.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().startsWith(q)) return false;
      return true;
    });
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [cards, parentByChild, childIdSet, searchValue, statusValue]);

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

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId || childId === parentId || parentByChild.get(childId) === parentId) return;
    const parent = cardById.get(parentId);
    if (!parent) return;
    const nextChildren = Array.from(new Set([...normalizeChildren(parent.childrenIds), childId]));
    setSaving(true);
    setError(null);
    try {
      await patchCard(parentId, { childrenIds: nextChildren });
      await patchCard(childId, { curatedRoot: false });
      await onReload();
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
    const parent = cardById.get(parentId);
    if (!parent) return;
    const nextChildren = normalizeChildren(parent.childrenIds).filter((id) => id !== childId);
    setSaving(true);
    setError(null);
    try {
      await patchCard(parentId, { childrenIds: nextChildren });
      await onReload();
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
    allCards.forEach((card) => {
      if (normalizeChildren(card.childrenIds).length > 0) next.add(card.docId);
    });
    rootedCollections.forEach((root) => next.add(root.docId));
    setExpandedAll(Array.from(next));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingCardId(parseCardId(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const childId = parseCardId(event.active.id);
    const overId = event.over?.id ?? null;
    setDraggingCardId(null);
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
            const nextChildren = normalizeChildren(currentParent.childrenIds).filter((id) => id !== childId);
            await patchCard(currentParentId, { childrenIds: nextChildren });
          }
        }
        await patchCard(childId, { curatedRoot: true });
        await onReload();
        await loadAllCards();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set curated root');
      } finally {
        setSaving(false);
      }
      return;
    }

    const parentId = parseParentId(overId);
    if (!parentId) return;
    await handleAttachChild(childId, parentId);
  };

  const renderTreeNode = (node: Card, seen: Set<string> = new Set()) => {
    if (seen.has(node.docId)) {
      return (
        <li key={`${node.docId}-cycle`} className={styles.treeNode}>
          <div className={styles.nodeRow}>
            <span className={styles.nodeTitle}>Cycle detected</span>
          </div>
        </li>
      );
    }
    const nextSeen = new Set(seen);
    nextSeen.add(node.docId);
    const children = normalizeChildren(node.childrenIds)
      .map((id) => cardById.get(id))
      .filter((c): c is Card => Boolean(c));
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.docId);
    return (
      <li key={node.docId} className={styles.treeNode}>
        <ParentDropZone parentId={node.docId} className={styles.nodeDropZone}>
          <DraggableCard card={node} className={styles.nodeRow} disabled={saving}>
            <div className={styles.nodeLead}>
              {hasChildren ? (
                <>
                  <button
                    type="button"
                    className={styles.treeExpandButton}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpanded(node.docId);
                    }}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <span className={styles.treeExpandIcon}>{isExpanded ? '▼' : '►'}</span>
                  </button>
                  <span
                    className={styles.treePersistedMarker}
                    title={isExpanded ? 'Saved as expanded' : 'Saved as collapsed'}
                    aria-hidden="true"
                  >
                    {isExpanded ? '⊟' : '⊞'}
                  </span>
                </>
              ) : null}
              <span className={styles.nodeTitle}>{cardLabel(node)}</span>
            </div>
            <div className={styles.nodeActions}>
              {parentByChild.has(node.docId) ? (
                <button
                  type="button"
                  onClick={() => void handleDetachChild(node.docId)}
                  disabled={saving}
                  className={styles.smallButton}
                >
                  Unparent
                </button>
              ) : null}
            </div>
          </DraggableCard>
        </ParentDropZone>
        {hasChildren && isExpanded ? (
          <ul className={styles.treeList}>{children.map((child) => renderTreeNode(child, nextSeen))}</ul>
        ) : null}
      </li>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>Curated Tree</h2>
          <p className={styles.hint}>Drag a card here to set parent/child relationship.</p>
          <div className={styles.treeToolbar}>
            <button type="button" className={styles.smallButton} onClick={expandAll}>Expand all</button>
            <button type="button" className={styles.smallButton} onClick={collapseAll}>Collapse all</button>
          </div>
          <TreeRootDropZone className={styles.treeRootDropZone}>
            {rootedCollections.length === 0 ? (
              <p className={styles.emptyTreeHint}>Drop a card here to start your curated tree.</p>
            ) : null}
            <ul className={styles.treeList}>{rootedCollections.map((root) => renderTreeNode(root))}</ul>
          </TreeRootDropZone>
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
          <UnparentDropZone className={styles.unparentDropZone}>
            <ul className={styles.list}>
              {unparentedCards.map((card) => (
                <li key={card.docId} className={styles.listRowWrap}>
                  <DraggableCard card={card} className={styles.listRow} disabled={saving}>
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
        </section>
      </div>
      {draggingCardId ? <p className={styles.draggingStatus}>Dragging card...</p> : null}
    </DndContext>
  );
}

