'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import styles from './page.module.css';

interface CardsResponse {
  items: Card[];
}

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
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface ParentDropZoneProps {
  parentId: string;
  className: string;
  children: React.ReactNode;
}

function ParentDropZone({ parentId, className, children }: ParentDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `parent:${parentId}` });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

interface UnparentDropZoneProps {
  className: string;
  children: React.ReactNode;
}

function UnparentDropZone({ className, children }: UnparentDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unparented' });
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
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
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
      const children = normalizeChildren(parent.childrenIds);
      children.forEach(childId => {
        map.set(childId, parent.docId);
      });
    }
    return map;
  }, [cards]);

  const childIdSet = useMemo(() => {
    const set = new Set<string>();
    cards.forEach(card => normalizeChildren(card.childrenIds).forEach(id => set.add(id)));
    return set;
  }, [cards]);

  const rootedCollections = useMemo(
    () =>
      cards.filter(card => {
        const children = normalizeChildren(card.childrenIds);
        return children.length > 0 && !parentByChild.has(card.docId);
      }),
    [cards, parentByChild]
  );

  const unparentedCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter(card => {
      if (parentByChild.has(card.docId)) return false;
      if (childIdSet.has(card.docId)) return false; // hide roots from the right pane
      if (!q) return true;
      return (
        (card.title || '').toLowerCase().includes(q) ||
        (card.subtitle || '').toLowerCase().includes(q) ||
        card.docId.toLowerCase().includes(q)
      );
    });
  }, [cards, parentByChild, childIdSet, search]);

  const patchChildren = async (parentId: string, nextChildren: string[]) => {
    const res = await fetch(`/api/cards/${parentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childrenIds: nextChildren }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update collection membership');
    }
  };

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId) return;
    if (childId === parentId) return;
    if (parentByChild.get(childId) === parentId) return;
    const parent = cardById.get(parentId);
    if (!parent) return;
    const nextChildren = Array.from(new Set([...normalizeChildren(parent.childrenIds), childId]));
    setSaving(true);
    setError(null);
    try {
      await patchChildren(parentId, nextChildren);
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
    const nextChildren = normalizeChildren(parent.childrenIds).filter(id => id !== childId);
    setSaving(true);
    setError(null);
    try {
      await patchChildren(parentId, nextChildren);
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
    const cardId = parseCardId(event.active.id);
    setDraggingCardId(cardId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const childId = parseCardId(event.active.id);
    const overId = event.over?.id ?? null;
    setDraggingCardId(null);
    if (!childId || !overId || saving) return;

    if (overId === 'unparented') {
      void handleDetachChild(childId);
      return;
    }

    const parentId = parseParentId(overId);
    if (!parentId) return;
    void handleAttachChild(childId, parentId);
  };

  const renderTreeNode = (node: Card, seen: Set<string> = new Set()) => {
    if (seen.has(node.docId)) {
      return (
        <li key={`${node.docId}-cycle`} className={styles.treeNode}>
          <div className={styles.nodeRow}>
            <span className={styles.nodeTitle}>Cycle detected at {node.docId}</span>
          </div>
        </li>
      );
    }
    const nextSeen = new Set(seen);
    nextSeen.add(node.docId);
    const children = normalizeChildren(node.childrenIds)
      .map(id => cardById.get(id))
      .filter((c): c is Card => Boolean(c));
    return (
      <li key={node.docId} className={styles.treeNode}>
        <ParentDropZone parentId={node.docId} className={styles.nodeDropZone}>
          <DraggableCard card={node} className={styles.nodeRow} disabled={saving}>
            <span className={styles.nodeTitle}>{cardLabel(node)}</span>
            <div className={styles.nodeActions}>
              <span className={styles.nodeMeta}>{node.docId}</span>
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
        {children.length > 0 ? (
          <ul className={styles.treeList}>
            {children.map(child => renderTreeNode(child, nextSeen))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <h1>Collections Management</h1>
        <p className={styles.intro}>
          Curated mode uses single-parent relationships. A card can belong to at most one parent at a time.
          Collection card type is optional; any card can have children.
        </p>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading cards...</p> : null}

      {!loading ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className={styles.layout}>
            <section className={styles.panel}>
              <h2>Curated Tree</h2>
              <p className={styles.hint}>Drag cards onto a card to set parent/child.</p>
              <ul className={styles.treeList}>
                {rootedCollections.map(root => renderTreeNode(root))}
              </ul>
            </section>

            <section className={styles.panel}>
              <h2>Unparented Cards</h2>
              <p className={styles.hint}>Drop a card here to remove its parent.</p>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.input}
                placeholder="Search unparented cards..."
              />
              <UnparentDropZone className={styles.unparentDropZone}>
                <ul className={styles.list}>
                  {unparentedCards.map(card => (
                    <li key={card.docId} className={styles.listRowWrap}>
                      <DraggableCard card={card} className={styles.listRow} disabled={saving}>
                        <div>
                          <div className={styles.nodeTitle}>{cardLabel(card)}</div>
                          <div className={styles.nodeMeta}>{card.docId}</div>
                        </div>
                        <span className={styles.dragHint}>Drag to tree</span>
                      </DraggableCard>
                    </li>
                  ))}
                </ul>
              </UnparentDropZone>
            </section>
          </div>
          {draggingCardId ? (
            <p className={styles.draggingStatus}>Dragging card: {draggingCardId}</p>
          ) : null}
        </DndContext>
      ) : null}
    </div>
  );
}
