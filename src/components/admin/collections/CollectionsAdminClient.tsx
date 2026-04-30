'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
  useDraggable,
  useDndContext,
  useDroppable,
} from '@dnd-kit/core';
import { Card } from '@/lib/types/card';
import { CuratedTreeNode } from '@/components/admin/card-admin/CuratedTreeNode';
import { CuratedTreeDragProvider, type CuratedTreeDragKind } from '@/components/admin/card-admin/curatedTreeDragContext';
import {
  CuratedTreeDropHighlightSync,
  useCuratedTreeDropHighlight,
} from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import { curatedTreeCollisionDetection } from '@/components/admin/card-admin/curatedTreeCollisionDetection';
import {
  buildParentIdsByChild,
  buildChildrenIdsWithInsertBefore,
  listCollectionRootCards,
  normalizeCuratedChildIds,
  nextCollectionRootOrderForAppend,
  resolveCuratedDropIntent,
  wouldAttachChildCreateCuratedCycle,
} from '@/lib/utils/curatedCollectionTree';
import { listOrphanedCards } from '@/lib/utils/curatedTreeAttachCandidates';
import {
  optimisticAttachChildAsLast,
  optimisticDetachChild,
  optimisticDetachChildFromParent,
  optimisticInsertChildBeforeSibling,
  optimisticReorderCollectionRoots,
  optimisticSetCollectionRoot,
} from '@/lib/utils/optimisticCuratedCollections';
import { EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX } from '@/lib/admin/embeddedWideMinWidthPx';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from '@/app/admin/collections/page.module.css';
import CollectionsMediaPanel from '@/components/admin/collections/CollectionsMediaPanel';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import { isCuratedTreeDndEnabled } from '@/lib/config/curatedTreeDnd';
import { DND_POINTER_IGNORE_ATTR, useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import TagAdminStudioPane from '@/components/admin/studio/TagAdminStudioPane';
import JournalImage from '@/components/common/JournalImage';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import type { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import { usePersistentTreeExpansion } from '@/lib/hooks/usePersistentTreeExpansion';
import {
  buildStudioCollectionCardDragData,
  isStudioCollectionCardDragData,
  parseCollectionCardDragId,
} from '@/lib/dnd/studioDragContract';

const COLLECTIONS_CENTER_COLUMNS_KEY = 'collectionsCenterPaneWidths';
const COLLECTIONS_TREE_EXPANSION_KEY = 'collectionsTreeExpandedIds';
const COL_HANDLE = 8;
const MIN_TREE_COL = 200;
const MIN_UNPARENT_COL = 200;
/** Minimum width for the Media / Studio right column (grid area); user-resizable. Kept below old 280px to reduce default horizontal sprawl. */
const MIN_MEDIA_COL = 220;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function parseGapPx(el: HTMLElement): number {
  const s = getComputedStyle(el);
  const raw = s.columnGap && s.columnGap !== 'normal' ? s.columnGap : s.gap;
  if (!raw || raw === 'normal') return 16;
  const m = String(raw).match(/([\d.]+)px/);
  return m && Number.isFinite(parseFloat(m[1])) ? parseFloat(m[1]) : 16;
}

function readCenterColumnWidths(): { tree: number; unparent: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COLLECTIONS_CENTER_COLUMNS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { tree?: number; unparent?: number };
    if (typeof o.tree === 'number' && typeof o.unparent === 'number') return { tree: o.tree, unparent: o.unparent };
  } catch {
    /* ignore */
  }
  return null;
}

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
  onClick?: () => void;
}

function StaticUnparentCard({ className, children, disabled, onClick }: Omit<DraggableCardProps, 'card'>) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
}

function DraggableCard({ card, className, children, disabled, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: buildStudioCollectionCardDragData(card.docId),
  });

  const style = {
    transform: undefined as string | undefined,
    opacity: isDragging ? 0 : 1,
    cursor: disabled ? 'not-allowed' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

interface UnparentDropZoneProps {
  className: string;
  children: React.ReactNode;
  /** No droppable registration (curated drag disabled). */
  readOnly?: boolean;
  suppressActiveHighlight?: boolean;
}

function UnparentDropZoneReadOnly({
  className,
  children,
}: Omit<UnparentDropZoneProps, 'readOnly'>) {
  return <div className={className}>{children}</div>;
}

function UnparentDropZoneInteractive({
  className,
  children,
  suppressActiveHighlight = false,
}: Omit<UnparentDropZoneProps, 'readOnly'>) {
  const { active } = useDndContext();
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({ id: 'unparented', disabled: !reparentFromCard });
  const activeDrop = highlightId === 'unparented' || (highlightId?.startsWith('unparented-row:') ?? false);
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${activeDrop && !suppressActiveHighlight ? styles.dropTargetActive : ''}`}
    >
      {children}
    </div>
  );
}

function UnparentRowDropZone({
  rowId,
  className,
  children,
}: {
  rowId: string;
  className: string;
  children: React.ReactNode;
}) {
  const { active } = useDndContext();
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({ id: `unparented-row:${rowId}`, disabled: !reparentFromCard });
  const activeDrop = highlightId === `unparented-row:${rowId}`;
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${activeDrop ? styles.unparentRowDropZoneActive : ''}`}
    >
      {children}
    </div>
  );
}

function UnparentDropZone({
  className,
  children,
  readOnly,
  suppressActiveHighlight,
}: UnparentDropZoneProps) {
  if (readOnly) {
    return (
      <UnparentDropZoneReadOnly
        className={className}
        suppressActiveHighlight={suppressActiveHighlight}
      >
        {children}
      </UnparentDropZoneReadOnly>
    );
  }
  return (
    <UnparentDropZoneInteractive
      className={className}
      suppressActiveHighlight={suppressActiveHighlight}
    >
      {children}
    </UnparentDropZoneInteractive>
  );
}

interface TreeRootDropZoneProps {
  className: string;
  children: React.ReactNode;
  readOnly?: boolean;
}

function TreeRootDropZoneReadOnly({ className, children }: Omit<TreeRootDropZoneProps, 'readOnly'>) {
  return <div className={className}>{children}</div>;
}

function TreeRootDropZoneInteractive({ className, children }: Omit<TreeRootDropZoneProps, 'readOnly'>) {
  const { active } = useDndContext();
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({ id: 'tree-root', disabled: !reparentFromCard });
  const activeDrop = highlightId === 'tree-root';
  return (
    <div ref={setNodeRef} className={`${className} ${activeDrop ? styles.dropTargetActive : ''}`}>
      {children}
    </div>
  );
}

function TreeRootDropZone({ className, children, readOnly }: TreeRootDropZoneProps) {
  if (readOnly) {
    return <TreeRootDropZoneReadOnly className={className}>{children}</TreeRootDropZoneReadOnly>;
  }
  return <TreeRootDropZoneInteractive className={className}>{children}</TreeRootDropZoneInteractive>;
}

export type EmbeddedStudioSlotContext = {
  refreshCards: () => void;
};

export default function CollectionsAdminClient({
  embedded = false,
  onSelectCard,
  embeddedRightSlot,
  embeddedUnparentedReplacement,
  embeddedOrganizationCollapsed = false,
  embeddedCardsCollapsed = false,
  onStudioRelationshipDragEnd,
}: {
  embedded?: boolean;
  onSelectCard?: (cardId: string) => void;
  embeddedRightSlot?: React.ReactNode | ((ctx: EmbeddedStudioSlotContext) => React.ReactNode);
  /** When set with `embedded`, replaces the title-only unparented list with this UI (e.g. card admin table/grid). */
  embeddedUnparentedReplacement?: (ctx: EmbeddedUnparentedBankContext) => React.ReactNode;
  embeddedOrganizationCollapsed?: boolean;
  embeddedCardsCollapsed?: boolean;
  onStudioRelationshipDragEnd?: (event: DragEndEvent) => Promise<boolean>;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [curatedDragKind, setCuratedDragKind] = useState<CuratedTreeDragKind>(null);
  const [dragOverlayCard, setDragOverlayCard] = useState<Card | null>(null);
  /** Studio bank → body/cover/gallery: show a ghost under the pointer while dragging `source:*`. */
  const [dragOverlaySourceMedia, setDragOverlaySourceMedia] = useState<Media | null>(null);
  const lastValidOverIdRef = useRef<string | null>(null);
  const hasInitializedTreeExpansionRef = useRef(false);
  const [bulkParentId, setBulkParentId] = useState<string | null>(null);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [bulkType, setBulkType] = useState<BulkCardTypeFilter>('all');
  const [bulkUnparentedOnly, setBulkUnparentedOnly] = useState(true);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [studioLeftTab, setStudioLeftTab] = useState<'tags' | 'tree'>(() => {
    if (typeof window === 'undefined') return 'tags';
    return window.localStorage.getItem('studioLeftTab') === 'tree' ? 'tree' : 'tags';
  });
  const sensors = useDefaultDndSensors({ pointerActivationDistance: 4 });
  const { media: mediaBankList } = useMedia();
  const curatedTreeDnd = isCuratedTreeDndEnabled();
  /** Admin Studio: middle column uses `embeddedUnparentedReplacement` (card bank) instead of the title-only list. */
  const studioAttachBank = embedded && Boolean(embeddedUnparentedReplacement);
  const showOrganizationPane = !(studioAttachBank && embeddedOrganizationCollapsed);
  const showCardsPane = !(studioAttachBank && embeddedCardsCollapsed);
  const treeDropZonesReadOnly = !curatedTreeDnd;
  /** Studio embed registers its own droppables; keep DndContext when embedded even if tree drag is off. */
  const needsDndContext = curatedTreeDnd || Boolean(embeddedRightSlot);
  const stickyTopRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [wideCenterLayout, setWideCenterLayout] = useState(true);
  const [wTree, setWTree] = useState(312);
  const [wUnparent, setWUnparent] = useState(296);
  const wTreeRef = useRef(wTree);
  const wUnparentRef = useRef(wUnparent);
  const dragActiveRef = useRef(false);
  const [colDrag, setColDrag] = useState<
    | { which: 1; startX: number; startTree: number; startUnparent: number }
    | { which: 2; startX: number; startWidth: number; target: 'tree' | 'cards'; fixedLeading: number }
    | null
  >(null);

  wTreeRef.current = wTree;
  wUnparentRef.current = wUnparent;
  dragActiveRef.current = colDrag !== null;

  useEffect(() => {
    const stored = readCenterColumnWidths();
    if (stored) {
      setWTree(stored.tree);
      setWUnparent(stored.unparent);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX}px)`);
    const apply = () => setWideCenterLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('studioLeftTab', studioLeftTab);
    } catch {
      /* ignore */
    }
  }, [studioLeftTab]);

  const persistCenterWidths = useCallback((tree: number, unparent: number) => {
    try {
      localStorage.setItem(COLLECTIONS_CENTER_COLUMNS_KEY, JSON.stringify({ tree, unparent }));
    } catch {
      /* ignore */
    }
  }, []);

  const normalizeWidthsToContainer = useCallback(() => {
    const el = layoutRef.current;
    if (!el || !wideCenterLayout || dragActiveRef.current) return;
    const gapPx = parseGapPx(el);
    const usable = el.clientWidth - 2 * COL_HANDLE - 4 * gapPx;
    if (usable < MIN_TREE_COL + MIN_UNPARENT_COL + MIN_MEDIA_COL) return;

    const t = wTreeRef.current;
    const u = wUnparentRef.current;
    let nt = clamp(t, MIN_TREE_COL, usable - MIN_UNPARENT_COL - MIN_MEDIA_COL);
    let nu = clamp(u, MIN_UNPARENT_COL, usable - MIN_TREE_COL - MIN_MEDIA_COL);
    if (nt + nu + MIN_MEDIA_COL > usable) {
      const pairBudget = usable - MIN_MEDIA_COL;
      nt = clamp(t, MIN_TREE_COL, pairBudget - MIN_UNPARENT_COL);
      nu = pairBudget - nt;
      if (nu < MIN_UNPARENT_COL) {
        nu = MIN_UNPARENT_COL;
        nt = pairBudget - nu;
      }
      if (nt < MIN_TREE_COL) {
        nt = MIN_TREE_COL;
        nu = pairBudget - nt;
      }
    }
    if (nt !== t) setWTree(nt);
    if (nu !== u) setWUnparent(nu);
  }, [wideCenterLayout]);

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

  useLayoutEffect(() => {
    const el = layoutRef.current;
    if (!el || !wideCenterLayout) return;
    const ro = new ResizeObserver(() => {
      normalizeWidthsToContainer();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [wideCenterLayout, normalizeWidthsToContainer]);

  useEffect(() => {
    if (!colDrag) return;
    const el = layoutRef.current;

    const onMove = (e: PointerEvent) => {
      if (!el) return;
      const gapPx = parseGapPx(el);
      const usable = el.clientWidth - 2 * COL_HANDLE - 4 * gapPx;
      const dx = e.clientX - colDrag.startX;

      if (colDrag.which === 1) {
        const s = colDrag.startTree + colDrag.startUnparent;
        const newTree = clamp(colDrag.startTree + dx, MIN_TREE_COL, s - MIN_UNPARENT_COL);
        const newUnparent = s - newTree;
        setWTree(newTree);
        setWUnparent(newUnparent);
      } else {
        const maxWidth = usable - colDrag.fixedLeading - MIN_MEDIA_COL;
        const minWidth = colDrag.target === 'tree' ? MIN_TREE_COL : MIN_UNPARENT_COL;
        const raw = colDrag.startWidth + dx;
        const nextWidth = maxWidth < minWidth ? minWidth : clamp(raw, minWidth, maxWidth);
        if (colDrag.target === 'tree') {
          setWTree(nextWidth);
        } else {
          setWUnparent(nextWidth);
        }
      }
    };

    const onUp = () => {
      persistCenterWidths(wTreeRef.current, wUnparentRef.current);
      setColDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [colDrag, persistCenterWidths]);

  const onColResizePointerDown = useCallback(
    (which: 1 | 2) => (e: React.PointerEvent) => {
      if (!wideCenterLayout) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (which === 1) {
        setColDrag({ which: 1, startX: e.clientX, startTree: wTree, startUnparent: wUnparent });
      } else {
        const target: 'tree' | 'cards' = showCardsPane ? 'cards' : 'tree';
        const startWidth = target === 'cards' ? wUnparent : wTree;
        const fixedLeading = showOrganizationPane && showCardsPane ? wTree : 0;
        setColDrag({ which: 2, startX: e.clientX, startWidth, target, fixedLeading });
      }
    },
    [showCardsPane, showOrganizationPane, wideCenterLayout, wTree, wUnparent]
  );

  const centerGridStyle = useMemo((): React.CSSProperties | undefined => {
    if (!wideCenterLayout) return undefined;
    return {
      gridTemplateColumns: `${wTree}px ${COL_HANDLE}px ${wUnparent}px ${COL_HANDLE}px minmax(${MIN_MEDIA_COL}px, 1fr)`,
    };
  }, [wideCenterLayout, wTree, wUnparent]);

  const load = async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) {
      setLoading(true);
    }
    setError(null);
    try {
      const [res, rootsRes] = await Promise.all([
        fetch('/api/cards?limit=1000&status=all&hydration=cover-only&sort=newest'),
        fetch('/api/cards?collectionsOnly=true&status=all&hydration=cover-only&limit=200'),
      ]);
      const data = (await res.json()) as CardsResponse & { error?: string };
      const rootsData = (await rootsRes.json()) as CardsResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load cards');
      if (!rootsRes.ok) throw new Error(rootsData.error || 'Failed to load collection roots');

      const merged = new Map<string, Card>();
      for (const card of data.items || []) {
        if (card.docId) merged.set(card.docId, card);
      }
      for (const card of rootsData.items || []) {
        if (!card.docId) continue;
        const prev = merged.get(card.docId);
        merged.set(card.docId, prev ? { ...prev, ...card } : card);
      }
      const items = Array.from(merged.values());
      if (soft) {
        setCards((prev) => {
          if (prev.length === 0) return items;
          const merged = new Map<string, Card>();
          for (const c of prev) {
            if (c.docId) merged.set(c.docId, c);
          }
          for (const c of items) {
            if (!c.docId) continue;
            const old = merged.get(c.docId);
            if (!old) {
              merged.set(c.docId, c);
              continue;
            }
            const next: Card = { ...old, ...c };
            // cover-only / partial API rows can omit fields; shallow spread would wipe tree state.
            if (!Object.hasOwn(c, 'childrenIds')) next.childrenIds = old.childrenIds;
            merged.set(c.docId, next);
          }
          return Array.from(merged.values());
        });
      } else {
        setCards(items);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cards');
    } finally {
      if (!soft) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const cardById = useMemo(() => new Map(cards.map(c => [c.docId, c])), [cards]);
  const parentIdsByChild = useMemo(() => buildParentIdsByChild(cards), [cards]);
  const rootedCollections = useMemo(
    () => listCollectionRootCards(cards),
    [cards]
  );

  useEffect(() => {
    if (!cards.length) {
      setSelectedCardId(null);
      return;
    }
    const stillExists = selectedCardId && cardById.has(selectedCardId);
    if (stillExists) return;
    const fallback = rootedCollections[0]?.docId ?? cards[0]?.docId ?? null;
    setSelectedCardId(fallback);
    if (fallback) onSelectCard?.(fallback);
  }, [cards, cardById, selectedCardId, rootedCollections, onSelectCard]);

  const handleSelectCard = useCallback(
    (cardId: string) => {
      setSelectedCardId(cardId);
      onSelectCard?.(cardId);
    },
    [onSelectCard]
  );

  const {
    expandedIds: treeExpandedIds,
    hydrated: treeExpansionHydrated,
    toggleExpanded: toggleTreeExpanded,
    initializeIfEmpty: initializeTreeExpansionIfEmpty,
  } = usePersistentTreeExpansion(COLLECTIONS_TREE_EXPANSION_KEY);

  useEffect(() => {
    const expandableIds = new Set<string>();
    for (const c of cards) {
      if (c.docId && normalizeCuratedChildIds(c.childrenIds).length > 0) {
        expandableIds.add(c.docId);
      }
    }

    if (!treeExpansionHydrated) return;

    if (!hasInitializedTreeExpansionRef.current) {
      hasInitializedTreeExpansionRef.current = true;
      initializeTreeExpansionIfEmpty(Array.from(expandableIds));
      return;
    }

  }, [cards, initializeTreeExpansionIfEmpty, treeExpansionHydrated]);

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

  const closeBulkAdd = useCallback(() => {
    setBulkParentId(null);
    setBulkSelectedIds(new Set());
  }, []);

  const matchesEmbeddedCards = useCallback(
    (card: Card) => {
      const q = search.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      return true;
    },
    [search]
  );

  const orphanedCards = useMemo(
    () => listOrphanedCards(cards).filter(matchesEmbeddedCards),
    [cards, matchesEmbeddedCards]
  );

  const patchCard = async (cardId: string, payload: Partial<Card>) => {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    throwIfJsonApiFailed(res, data, 'Failed to update collection membership');
  };

  const handleInsertChildBeforeSibling = async (childId: string, beforeSiblingId: string) => {
    if (!childId || !beforeSiblingId || childId === beforeSiblingId) return;
    const parentIds = parentIdsByChild.get(beforeSiblingId) ?? [];
    if (parentIds.includes(childId)) return;

    const parentId = parentIds[0];
    if (!parentId) {
      await handleInsertRootBefore(childId, beforeSiblingId);
      return;
    }
    if (!cardById.get(parentId)?.docId) return;
    const snapshot = cards;
    const optimistic = optimisticInsertChildBeforeSibling(cards, childId, beforeSiblingId, parentId);
    if (optimistic) setCards(optimistic);
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = buildChildrenIdsWithInsertBefore(parentFresh.childrenIds, childId, beforeSiblingId);
      await patchCard(parentId, { childrenIds: nextChildren });
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to insert card');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertRootBefore = async (childId: string, beforeRootId: string) => {
    if (!beforeRootId || childId === beforeRootId) return;
    const snapshot = cards;
    const currentRootIds = rootedCollections.map((card) => card.docId!).filter(Boolean);
    const currentIndex = currentRootIds.indexOf(childId);
    const beforeIndex = currentRootIds.indexOf(beforeRootId);
    const movingWithinRoots = currentIndex >= 0 && beforeIndex >= 0;
    let nextOrder = 10;
    if (movingWithinRoots) {
      const reordered = currentRootIds.filter((id) => id !== childId);
      reordered.splice(beforeIndex, 0, childId);
      nextOrder = reordered.indexOf(childId) * 10;
      const optimistic = optimisticReorderCollectionRoots(snapshot, reordered);
      if (optimistic) setCards(optimistic);
    } else {
      const reordered = currentRootIds.slice();
      const idx = reordered.indexOf(beforeRootId);
      reordered.splice(idx < 0 ? reordered.length : idx, 0, childId);
      nextOrder = reordered.indexOf(childId) * 10;
      const optimistic = optimisticReorderCollectionRoots(snapshot, reordered);
      if (optimistic) setCards(optimistic);
    }
    setSaving(true);
    setError(null);
    try {
      await patchCard(childId, {
        isCollectionRoot: true,
        collectionRootOrder: nextOrder,
      });
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to insert top-level card');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId) return;
    if (childId === parentId) return;
    if ((parentIdsByChild.get(childId) ?? []).includes(parentId)) return;
    if (!cardById.get(parentId)) return;
    if (wouldAttachChildCreateCuratedCycle(cards, childId, parentId)) {
      setError('Cannot move a card under one of its own descendants.');
      return;
    }
    const snapshot = cards;
    const optimistic = optimisticAttachChildAsLast(cards, childId, parentId);
    if (optimistic) setCards(optimistic);
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = Array.from(
        new Set([...normalizeCuratedChildIds(parentFresh.childrenIds), childId])
      );
      await patchCard(parentId, { childrenIds: nextChildren });
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to attach child');
    } finally {
      setSaving(false);
    }
  };

  const handleDetachChild = useCallback(async (childId: string, parentId: string) => {
    if (!parentId) return;
    const snapshot = cards;
    const optimistic = optimisticDetachChildFromParent(cards, childId, parentId) ?? optimisticDetachChild(cards, childId, parentId);
    if (optimistic) setCards(optimistic);
    setSaving(true);
    setError(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = normalizeCuratedChildIds(parentFresh.childrenIds).filter((id) => id !== childId);
      await patchCard(parentId, { childrenIds: nextChildren });
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to detach child');
    } finally {
      setSaving(false);
    }
  }, [cards]);

  const handleClearRoot = useCallback(async (cardId: string) => {
    const snapshot = cards;
    const optimistic = optimisticSetCollectionRoot(cards, cardId, {
      isCollectionRoot: false,
      collectionRootOrder: undefined,
    });
    if (optimistic) setCards(optimistic);
    setSaving(true);
    setError(null);
    try {
      await patchCard(cardId, { isCollectionRoot: false });
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to remove root');
    } finally {
      setSaving(false);
    }
  }, [cards]);

  const handleDetachChildAction = useCallback(
    (childId: string, parentId: string) => {
      void handleDetachChild(childId, parentId);
    },
    [handleDetachChild]
  );

  const handleClearRootAction = useCallback(
    (cardId: string) => {
      void handleClearRoot(cardId);
    },
    [handleClearRoot]
  );

  /** After Studio relationship drags, return focus to the row handle (keyboard + screen-reader UX). */
  const restoreStudioRelationshipFocus = useCallback((activeId: string) => {
    if (typeof document === 'undefined') return;
    const run = () => {
      let el: Element | null = null;
      if (activeId.startsWith('gallery:')) {
        const mediaId = activeId.split(':')[1];
        if (mediaId) {
          el = document.querySelector(`[data-studio-gallery-focus="${CSS.escape(mediaId)}"]`);
        }
      } else {
        el = document.querySelector(`[data-studio-dnd-return-focus="${CSS.escape(activeId)}"]`);
      }
      if (el instanceof HTMLElement) el.focus({ preventScroll: false });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const handleDragCancel = useCallback(() => {
    setCuratedDragKind(null);
    setDraggingCardId(null);
    setDragOverlayCard(null);
    setDragOverlaySourceMedia(null);
    lastValidOverIdRef.current = null;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const id = event.over?.id != null ? String(event.over.id) : null;
    if (id) lastValidOverIdRef.current = id;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    lastValidOverIdRef.current = null;
    const raw = event.active.id;
    const id = typeof raw === 'string' ? raw : String(raw);
    if (id.startsWith('studioChild:') || id.startsWith('gallery:') || id.startsWith('source:')) {
      setCuratedDragKind(null);
      setDraggingCardId(null);
      setDragOverlayCard(null);
      if (id.startsWith('source:')) {
        const mid = id.slice('source:'.length);
        const fromData = event.active.data.current as { studioBankMedia?: Media } | undefined;
        setDragOverlaySourceMedia(
          fromData?.studioBankMedia ?? mediaBankList.find((m) => m.docId === mid) ?? null
        );
      } else {
        setDragOverlaySourceMedia(null);
      }
      return;
    }
    if (isStudioCollectionCardDragData(event.active.data.current)) {
      setCuratedDragKind('reparent');
      const cid = event.active.data.current.cardId;
      setDraggingCardId(cid);
      setDragOverlayCard(cardById.get(cid) ?? null);
      setDragOverlaySourceMedia(null);
    } else {
      setCuratedDragKind(null);
      setDraggingCardId(null);
      setDragOverlayCard(null);
      setDragOverlaySourceMedia(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragOverlayCard(null);
    setDragOverlaySourceMedia(null);
    const rawActive = event.active.id;
    const rawOver = event.over?.id ?? null;
    const activeStr = typeof rawActive === 'string' ? rawActive : String(rawActive);
    const overStr =
      rawOver != null
        ? (typeof rawOver === 'string' ? rawOver : String(rawOver))
        : lastValidOverIdRef.current;

    try {
      if (onStudioRelationshipDragEnd) {
        try {
          const handled = await onStudioRelationshipDragEnd(event);
          if (handled) {
            setCuratedDragKind(null);
            setDraggingCardId(null);
            setDragOverlayCard(null);
            restoreStudioRelationshipFocus(activeStr);
            return;
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Studio relationship update failed');
          setCuratedDragKind(null);
          setDraggingCardId(null);
          setDragOverlayCard(null);
          restoreStudioRelationshipFocus(activeStr);
          return;
        }
      }

      setCuratedDragKind(null);
      setDraggingCardId(null);

      const childId =
        isStudioCollectionCardDragData(event.active.data.current)
          ? event.active.data.current.cardId
          : parseCollectionCardDragId(activeStr);
      const overId = overStr;
      if (!childId || !overId || saving) return;
      const activeData = isStudioCollectionCardDragData(event.active.data.current)
        ? event.active.data.current
        : null;

      const intent = resolveCuratedDropIntent(overId);
      if (intent.kind === 'orphaned') {
        if (activeData?.sourceParentId) {
          await handleDetachChild(childId, activeData.sourceParentId);
          return;
        }
        if (activeData?.sourceIsRoot) {
          await handleClearRoot(childId);
          return;
        }
        const parentIds = parentIdsByChild.get(childId) ?? [];
        if (parentIds.length === 0) {
          await handleClearRoot(childId);
          return;
        }
        await handleDetachChild(childId, parentIds[0]);
        return;
      }

      if (intent.kind === 'tree-root') {
        const snapshot = cards;
        setSaving(true);
        setError(null);
        try {
          const nextOrder = nextCollectionRootOrderForAppend(rootedCollections, childId);
          const optimistic = optimisticSetCollectionRoot(snapshot, childId, {
            isCollectionRoot: true,
            collectionRootOrder: nextOrder,
          });
          if (optimistic) setCards(optimistic);
          await patchCard(childId, {
            isCollectionRoot: true,
            collectionRootOrder: nextOrder,
          });
          await load({ soft: true });
        } catch (e) {
          setCards(snapshot);
          setError(e instanceof Error ? e.message : 'Failed to append top-level card');
        } finally {
          setSaving(false);
        }
        return;
      }

      if (intent.kind === 'insert-before') {
        await handleInsertChildBeforeSibling(childId, intent.beforeId);
        return;
      }

      if (intent.kind === 'parent') {
        await handleAttachChild(childId, intent.parentId);
      }
    } finally {
      lastValidOverIdRef.current = null;
    }
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
      if (bulkUnparentedOnly && (parentIdsByChild.get(card.docId) ?? []).length > 0) return false;
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
  }, [bulkParentId, bulkSearch, bulkStatus, bulkType, bulkUnparentedOnly, bulkParentDescendants, cards, parentIdsByChild]);

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
    setSaving(true);
    setError(null);
    setBulkSummary(null);
    try {
      const parentFresh = await fetchAdminCardSnapshot(bulkParentCard.docId);
      const existingChildren = normalizeCuratedChildIds(parentFresh.childrenIds);
      const existingSet = new Set(existingChildren);
      const added = selectedIds.filter((id) => !existingSet.has(id));
      if (added.length === 0) {
        setBulkSummary('No changes needed. All selected cards were already children.');
        return;
      }
      const nextChildren = Array.from(new Set([...existingChildren, ...selectedIds]));
      await patchCard(bulkParentCard.docId, { childrenIds: nextChildren });
      await load({ soft: true });
      setBulkSelectedIds(new Set());
      setBulkSummary(`Added ${added.length} card${added.length === 1 ? '' : 's'} to "${cardLabel(bulkParentCard)}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to bulk add cards');
    } finally {
      setSaving(false);
    }
  }, [bulkParentCard, bulkSelectedIds, bulkSelectableIds]);

  const collectionsCenterGridStyle = useMemo((): React.CSSProperties | undefined => {
    if (!wideCenterLayout) return undefined;
    if (!showOrganizationPane && !showCardsPane) {
      return { gridTemplateColumns: `minmax(${MIN_MEDIA_COL}px, 1fr)` };
    }
    if (!showOrganizationPane) {
      return { gridTemplateColumns: `${wUnparent}px ${COL_HANDLE}px minmax(${MIN_MEDIA_COL}px, 1fr)` };
    }
    if (!showCardsPane) {
      return { gridTemplateColumns: `${wTree}px ${COL_HANDLE}px minmax(${MIN_MEDIA_COL}px, 1fr)` };
    }
    return centerGridStyle;
  }, [centerGridStyle, showCardsPane, showOrganizationPane, wTree, wUnparent, wideCenterLayout]);

  const collectionsCenterGrid = (
          <div
            ref={layoutRef}
            className={wideCenterLayout ? styles.layout : styles.layoutStacked}
            style={collectionsCenterGridStyle}
          >
            {showOrganizationPane ? (
            studioAttachBank ? (
              <section className={`${styles.panel} ${styles.panelStudioLeftTabs}`}>
                <h2 className={styles.panelStudioColumnTitle}>Organize</h2>
                <div className={styles.studioLeftTabToggleRow}>
                  <div className={styles.studioLeftTabButtonGroup} role="tablist" aria-label="Tags and curated tree">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioLeftTab === 'tags'}
                      className={`${styles.studioLeftTabButton} ${studioLeftTab === 'tags' ? styles.studioLeftTabButtonActive : ''}`}
                      onClick={() => setStudioLeftTab('tags')}
                    >
                      Tags
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioLeftTab === 'tree'}
                      className={`${styles.studioLeftTabButton} ${studioLeftTab === 'tree' ? styles.studioLeftTabButtonActive : ''}`}
                      onClick={() => setStudioLeftTab('tree')}
                    >
                      Collections
                    </button>
                  </div>
                </div>
                {studioLeftTab === 'tags' ? (
                  <div className={styles.studioLeftTabPanel} role="tabpanel">
                    <TagAdminStudioPane embeddedColumn />
                  </div>
                ) : (
                  <div className={styles.studioLeftTabPanel} role="tabpanel">
                    <div className={styles.panelScroll}>
                      {rootedCollections.length === 0 ? (
                        <TreeRootDropZone readOnly={treeDropZonesReadOnly} className={styles.treeRootDropZone}>
                          <p className={styles.emptyTreeHint}>
                            {curatedTreeDnd
                              ? 'Drop a card here to start your curated tree.'
                              : 'No collection roots yet.'}
                          </p>
                        </TreeRootDropZone>
                      ) : (
                        <>
                          <ul className={styles.treeList}>
                            {rootedCollections.map((root) => (
                              <CuratedTreeNode
                                key={root.docId}
                                node={root}
                                seen={new Set()}
                                cardById={cardById}
                                parentByChild={parentIdsByChild}
                                expandedIds={treeExpandedIds}
                                toggleExpanded={toggleTreeExpanded}
                                saving={saving}
                                onDetachChild={handleDetachChildAction}
                                onClearRoot={handleClearRootAction}
                                onSelectCard={handleSelectCard}
                                selectedCardId={selectedCardId}
                                disableCuratedDrag={treeDropZonesReadOnly}
                              />
                            ))}
                          </ul>
                          {curatedTreeDnd ? (
                            <TreeRootDropZone
                              readOnly={treeDropZonesReadOnly}
                              className={`${styles.treeRootDropZone} ${styles.treeRootAppendStrip}`}
                            >
                              <p className={styles.treeRootAppendHint}>
                                Drop here to add at the end of top-level curated items.
                              </p>
                            </TreeRootDropZone>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className={styles.panel}>
                <h2>Collections</h2>
                <div className={styles.panelScroll}>
                  {rootedCollections.length === 0 ? (
                    <TreeRootDropZone readOnly={treeDropZonesReadOnly} className={styles.treeRootDropZone}>
                      <p className={styles.emptyTreeHint}>
                        {curatedTreeDnd
                          ? 'Drop a card here to start your curated tree.'
                          : 'No collection roots yet.'}
                      </p>
                    </TreeRootDropZone>
                  ) : (
                    <>
                      <ul className={styles.treeList}>
                        {rootedCollections.map((root) => (
                          <CuratedTreeNode
                            key={root.docId}
                            node={root}
                            seen={new Set()}
                            cardById={cardById}
                            parentByChild={parentIdsByChild}
                             expandedIds={treeExpandedIds}
                             toggleExpanded={toggleTreeExpanded}
                             saving={saving}
                             onDetachChild={handleDetachChildAction}
                             onClearRoot={handleClearRootAction}
                             onSelectCard={handleSelectCard}
                             selectedCardId={selectedCardId}
                             disableCuratedDrag={treeDropZonesReadOnly}
                          />
                        ))}
                      </ul>
                      {curatedTreeDnd ? (
                        <TreeRootDropZone
                          readOnly={treeDropZonesReadOnly}
                          className={`${styles.treeRootDropZone} ${styles.treeRootAppendStrip}`}
                        >
                          <p className={styles.treeRootAppendHint}>
                            Drop here to add at the end of top-level curated items.
                          </p>
                        </TreeRootDropZone>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            )) : null}

            {wideCenterLayout && showOrganizationPane && showCardsPane ? (
              <div
                className={styles.colResizeHandle}
                role="separator"
                aria-orientation="vertical"
                aria-label={
                  studioAttachBank
                    ? 'Resize Tags or Tree column and Cards column'
                    : 'Resize collections tree and orphaned columns'
                }
                {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
                onPointerDown={onColResizePointerDown(1)}
              />
            ) : null}

            {showCardsPane ? (
            <section className={styles.panel}>
              <h2 className={studioAttachBank ? styles.panelStudioColumnTitle : undefined}>
                {studioAttachBank ? 'Cards' : 'Orphaned Cards'}
              </h2>
              {!studioAttachBank ? (
                <p className={styles.hint}>
                  {curatedTreeDnd
                    ? 'Drop a card here to remove one parent relationship.'
                    : 'Cards with no parents and no root marker appear here.'}
                </p>
              ) : null}
              {!studioAttachBank ? (
                <div className={styles.controlsRow}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.input}
                    placeholder="Search by title..."
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                    className={styles.statusSelect}
                    aria-label="Filter orphaned cards by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              ) : null}
              <UnparentDropZone
                readOnly={treeDropZonesReadOnly}
                className={`${styles.unparentDropZone} ${styles.panelScroll}`}
                suppressActiveHighlight={studioAttachBank}
              >
                {studioAttachBank ? (
                  embeddedUnparentedReplacement!({
                    refreshCards: () => void load({ soft: true }),
                    collectionCards: cards,
                    search,
                    setSearch,
                    statusFilter,
                    setStatusFilter,
                    selectedCardId,
                    onSelectCard: handleSelectCard,
                    saving,
                    curatedTreeDnd,
                    treeDropZonesReadOnly,
                  })
                ) : (
                  <ul className={styles.list}>
                    {orphanedCards.map((card) => (
                      <li key={card.docId} className={styles.listRowWrap}>
                        {curatedTreeDnd ? (
                          <UnparentRowDropZone rowId={card.docId} className={styles.unparentRowDropZone}>
                            <DraggableCard
                              card={card}
                              className={`${styles.listRow} ${selectedCardId === card.docId ? styles.listRowSelected : ''}`}
                              disabled={saving}
                              onClick={() => handleSelectCard(card.docId)}
                            >
                              <div>
                                <div className={styles.nodeTitle}>{cardLabel(card)}</div>
                              </div>
                            </DraggableCard>
                          </UnparentRowDropZone>
                        ) : (
                          <StaticUnparentCard
                            className={`${styles.listRow} ${selectedCardId === card.docId ? styles.listRowSelected : ''}`}
                            disabled={saving}
                            onClick={() => handleSelectCard(card.docId)}
                          >
                            <div>
                              <div className={styles.nodeTitle}>{cardLabel(card)}</div>
                            </div>
                          </StaticUnparentCard>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </UnparentDropZone>
            </section>
            ) : null}

            {wideCenterLayout && (showOrganizationPane || showCardsPane) ? (
              <div
                className={styles.colResizeHandle}
                role="separator"
                aria-orientation="vertical"
                aria-label={
                  studioAttachBank && showCardsPane
                    ? 'Resize Cards and media columns'
                    : showCardsPane
                      ? 'Resize orphaned and media columns'
                      : 'Resize Organize and workspace columns'
                }
                {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
                onPointerDown={onColResizePointerDown(2)}
              />
            ) : null}

            {embeddedRightSlot ? (
              typeof embeddedRightSlot === 'function' ? (
                embeddedRightSlot({ refreshCards: () => void load({ soft: true }) })
              ) : (
                embeddedRightSlot
              )
            ) : (
              <CollectionsMediaPanel />
            )}
          </div>
  );

  return (
    <div className={embedded ? styles.studioEmbeddedRoot : styles.container}>
      {!embedded ? (
        <div className={styles.stickyTop} ref={stickyTopRef}>
          <h1>Collections Management</h1>
          <p className={styles.collectionsResizeHint}>
            Drag the narrow bars between columns to resize the tree, orphaned list, and media pane. Widths are saved
            in this browser.
          </p>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading cards...</p> : null}

      {!loading ? (
        <div className={styles.mainShell}>
        {!curatedTreeDnd ? (
          <p className={styles.hint} role="note" style={{ marginBottom: 'var(--spacing-sm)' }}>
            Curated tree drag-and-drop is off (kill switch). Remove or set{' '}
            <code style={{ fontSize: '0.9em' }}>NEXT_PUBLIC_CURATED_TREE_DND=false</code> in{' '}
            <code style={{ fontSize: '0.9em' }}>.env.local</code> and restart the dev server.
          </p>
        ) : null}
        {needsDndContext ? (
        <DndContext
          sensors={sensors}
          collisionDetection={curatedTreeCollisionDetection}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <CuratedTreeDropHighlightSync>
          <CuratedTreeDragProvider value={curatedDragKind}>
          {collectionsCenterGrid}
          {curatedTreeDnd && curatedDragKind === 'reparent' && draggingCardId ? (
            <p className={`${styles.draggingStatus} ${styles.draggingStatusReparent}`} role="status" aria-live="polite">
              <strong>Moving</strong> — «{reparentTitle}». Drop on a <strong>title</strong> to nest, a{' '}
              <strong>line</strong> to reorder, the dashed strip for a <strong>top-level root</strong>, or{' '}
              <strong>{studioAttachBank ? 'Cards' : 'Orphaned'}</strong> to remove it from this branch.
            </p>
          ) : null}
          </CuratedTreeDragProvider>
          <DragOverlay
            dropAnimation={null}
            zIndex={1100}
            style={{
              display: 'inline-block',
              width: 'max-content',
              height: 'max-content',
              background: 'transparent',
              pointerEvents: 'none',
            }}
          >
            {dragOverlayCard ? (
              <div className={styles.dragOverlayCard}>
                <span className={styles.dragOverlayTitle}>{cardLabel(dragOverlayCard)}</span>
              </div>
            ) : dragOverlaySourceMedia ? (
              <div className={styles.dragOverlaySource}>
                <div className={styles.dragOverlaySourceThumb}>
                  <JournalImage
                    src={getDisplayUrl(dragOverlaySourceMedia)}
                    alt=""
                    fill
                    className={styles.dragOverlaySourceImg}
                    sizes="120px"
                  />
                </div>
                <span className={styles.dragOverlaySourceCaption}>
                  {dragOverlaySourceMedia.filename || dragOverlaySourceMedia.docId || 'Media'}
                </span>
              </div>
            ) : null}
          </DragOverlay>
          </CuratedTreeDropHighlightSync>
        </DndContext>
        ) : (
          <>
            {collectionsCenterGrid}
          </>
        )}
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
                  Orphaned only
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
        </div>
      ) : null}
    </div>
  );
}
