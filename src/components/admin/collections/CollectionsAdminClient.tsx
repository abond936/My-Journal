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
  buildChildrenIdsWithInsertBefore,
  buildRootDocIdListWithInsertBefore,
  compareCuratedRootCards,
  collectCuratedSubtreeIdsFromMaster,
  listCuratedTopLevelFromMaster,
  nextCuratedRootOrderForAppend,
  normalizeCuratedChildIds,
  resolveCuratedDropIntent,
  wouldAttachChildCreateCuratedCycle,
} from '@/lib/utils/curatedCollectionTree';
import { listCuratedTreeAttachCandidates } from '@/lib/utils/curatedTreeAttachCandidates';
import {
  optimisticAttachChildAsLast,
  optimisticDetachChild,
  optimisticInsertChildBeforeSibling,
  optimisticInsertRootBefore,
  optimisticPromoteToRootAppend,
} from '@/lib/utils/optimisticCuratedCollections';
import { EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX } from '@/lib/admin/embeddedWideMinWidthPx';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from '@/app/admin/collections/page.module.css';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import CollectionsMediaPanel from '@/components/admin/collections/CollectionsMediaPanel';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import { getCuratedTreeMasterId, isCuratedTreeDndEnabled } from '@/lib/config/curatedTreeDnd';
import { DND_POINTER_IGNORE_ATTR, useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import TagAdminStudioPane from '@/components/admin/studio/TagAdminStudioPane';
import JournalImage from '@/components/common/JournalImage';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import type { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';

const COLLECTIONS_CENTER_COLUMNS_KEY = 'collectionsCenterPaneWidths';
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
    data: { cardId: card.docId },
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
}

function UnparentDropZoneReadOnly({ className, children }: Omit<UnparentDropZoneProps, 'readOnly'>) {
  return <div className={className}>{children}</div>;
}

function UnparentDropZoneInteractive({ className, children }: Omit<UnparentDropZoneProps, 'readOnly'>) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({ id: 'unparented', disabled: !reparentFromCard });
  const activeDrop = highlightId === 'unparented' || (highlightId?.startsWith('unparented-row:') ?? false);
  return (
    <div ref={setNodeRef} className={`${className} ${activeDrop ? styles.dropTargetActive : ''}`}>
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
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const { setNodeRef } = useDroppable({ id: `unparented-row:${rowId}`, disabled: !reparentFromCard });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

function UnparentDropZone({ className, children, readOnly }: UnparentDropZoneProps) {
  if (readOnly) {
    return <UnparentDropZoneReadOnly className={className}>{children}</UnparentDropZoneReadOnly>;
  }
  return <UnparentDropZoneInteractive className={className}>{children}</UnparentDropZoneInteractive>;
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
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
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
  onStudioRelationshipDragEnd,
}: {
  embedded?: boolean;
  onSelectCard?: (cardId: string) => void;
  embeddedRightSlot?: React.ReactNode | ((ctx: EmbeddedStudioSlotContext) => React.ReactNode);
  /** When set with `embedded`, replaces the title-only unparented list with this UI (e.g. card admin table/grid). */
  embeddedUnparentedReplacement?: (ctx: EmbeddedUnparentedBankContext) => React.ReactNode;
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
  const sensors = useDefaultDndSensors({ pointerActivationDistance: 10 });
  const { media: mediaBankList } = useMedia();
  const curatedTreeDnd = isCuratedTreeDndEnabled();
  const curatedTreeMasterId = getCuratedTreeMasterId();
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
    | { which: 2; startX: number; startUnparent: number }
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
        const maxUn = usable - wTreeRef.current - MIN_MEDIA_COL;
        const raw = colDrag.startUnparent + dx;
        const newUnparent =
          maxUn < MIN_UNPARENT_COL
            ? MIN_UNPARENT_COL
            : clamp(raw, MIN_UNPARENT_COL, maxUn);
        setWUnparent(newUnparent);
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
        setColDrag({ which: 2, startX: e.clientX, startUnparent: wUnparent });
      }
    },
    [wideCenterLayout, wTree, wUnparent]
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
      const res = await fetch('/api/cards?limit=1000&status=all&hydration=cover-only&sort=newest');
      const data = (await res.json()) as CardsResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load cards');
      const items = data.items || [];
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
            if (!Object.hasOwn(c, 'curatedRoot')) next.curatedRoot = old.curatedRoot;
            if (!Object.hasOwn(c, 'curatedRootOrder')) next.curatedRootOrder = old.curatedRootOrder;
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
  const masterCard = useMemo(
    () => (curatedTreeMasterId ? cardById.get(curatedTreeMasterId) ?? null : null),
    [cardById, curatedTreeMasterId]
  );
  const useMasterTree = Boolean(curatedTreeMasterId && masterCard?.docId);

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

  const rootedCollections = useMemo(() => {
    if (useMasterTree && curatedTreeMasterId) {
      return listCuratedTopLevelFromMaster(cards, curatedTreeMasterId);
    }
    const list = cards.filter((card) => {
      if (parentByChild.has(card.docId)) return false;
      const children = normalizeCuratedChildIds(card.childrenIds);
      return children.length > 0 || card.curatedRoot === true;
    });
    list.sort(compareCuratedRootCards);
    return list;
  }, [cards, parentByChild, useMasterTree, curatedTreeMasterId]);

  const masterSubtreeIds = useMemo(() => {
    if (!useMasterTree || !curatedTreeMasterId) return new Set<string>();
    return collectCuratedSubtreeIdsFromMaster(cards, curatedTreeMasterId);
  }, [useMasterTree, curatedTreeMasterId, cards]);

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

  const matchesEmbeddedUnparented = useCallback(
    (card: Card) => {
      const q = search.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      return true;
    },
    [search]
  );

  const unparentedCards = useMemo(
    () =>
      listCuratedTreeAttachCandidates(cards, {
        curatedTreeMasterId,
        matchesFilters: matchesEmbeddedUnparented,
        statusFilter: statusFilter,
      }),
    [cards, curatedTreeMasterId, matchesEmbeddedUnparented, statusFilter]
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

  const fetchAuthoritativeParentIds = useCallback(
    async (childId: string): Promise<string[]> => {
      const params = new URLSearchParams({
        childrenIds_contains: childId,
        limit: '100',
        status: 'all',
        hydration: 'cover-only',
      });
      const res = await fetch(`/api/cards?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as { items?: Card[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to resolve parent for detach');
      const parentIds = (data.items || [])
        .map((item) => item.docId)
        .filter((id): id is string => Boolean(id));
      return Array.from(new Set(parentIds));
    },
    []
  );

  const handleInsertChildBeforeSibling = async (childId: string, beforeSiblingId: string) => {
    if (!childId || !beforeSiblingId || childId === beforeSiblingId) return;
    if (parentByChild.get(beforeSiblingId) === childId) return;

    const parentId = parentByChild.get(beforeSiblingId);
    if (!parentId) {
      await handleInsertRootBefore(childId, beforeSiblingId);
      return;
    }
    if (!cardById.get(parentId)?.docId) return;
    const snapshot = cards;
    const optimistic = optimisticInsertChildBeforeSibling(cards, childId, beforeSiblingId);
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
    if (useMasterTree && curatedTreeMasterId) {
      const snapshot = cards;
      setSaving(true);
      setError(null);
      try {
        const masterFresh = await fetchAdminCardSnapshot(curatedTreeMasterId);
        const currentParentId = parentByChild.get(childId);
        if (currentParentId && currentParentId !== curatedTreeMasterId) {
          const currentFresh = await fetchAdminCardSnapshot(currentParentId);
          const detached = normalizeCuratedChildIds(currentFresh.childrenIds).filter((id) => id !== childId);
          await patchCard(currentParentId, { childrenIds: detached });
        }
        const nextMasterChildren = buildChildrenIdsWithInsertBefore(masterFresh.childrenIds, childId, beforeRootId);
        await patchCard(curatedTreeMasterId, { childrenIds: nextMasterChildren });
        await load({ soft: true });
      } catch (e) {
        setCards(snapshot);
        setError(e instanceof Error ? e.message : 'Failed to insert top-level card');
      } finally {
        setSaving(false);
      }
      return;
    }
    const rootIds = rootedCollections.map((r) => r.docId!);
    const newRootIds = buildRootDocIdListWithInsertBefore(rootIds, childId, beforeRootId);
    const currentParentId = parentByChild.get(childId);
    const snapshot = cards;
    const optimistic = optimisticInsertRootBefore(cards, childId, beforeRootId);
    if (optimistic) setCards(optimistic);
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
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to insert root');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachChild = async (childId: string, parentId: string) => {
    if (!parentId) return;
    if (childId === parentId) return;
    if (parentByChild.get(childId) === parentId) return;
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

  const handleDetachChild = async (childId: string) => {
    const initialParentIds = new Set<string>();
    const mappedParentId = parentByChild.get(childId);
    if (mappedParentId) initialParentIds.add(mappedParentId);
    if (useMasterTree && curatedTreeMasterId && masterSubtreeIds.has(childId)) {
      initialParentIds.add(curatedTreeMasterId);
    }

    let parentIds = Array.from(initialParentIds);
    if (parentIds.length === 0) {
      try {
        parentIds = await fetchAuthoritativeParentIds(childId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to resolve parent for detach');
        return;
      }
    }
    if (parentIds.length === 0) return;
    const snapshot = cards;
    let optimistic = cards;
    for (const pid of parentIds) {
      optimistic =
        pid === curatedTreeMasterId
          ? optimistic.map((card) => {
              if (card.docId !== curatedTreeMasterId) return card;
              const nextChildren = normalizeCuratedChildIds(card.childrenIds).filter((id) => id !== childId);
              return { ...card, childrenIds: nextChildren };
            })
          : optimisticDetachChild(optimistic, childId) ?? optimistic;
    }
    if (optimistic) setCards(optimistic);
    setSaving(true);
    setError(null);
    try {
      for (const parentId of parentIds) {
        const parentFresh = await fetchAdminCardSnapshot(parentId);
        const nextChildren = normalizeCuratedChildIds(parentFresh.childrenIds).filter((id) => id !== childId);
        await patchCard(parentId, { childrenIds: nextChildren });
      }
      await load({ soft: true });
    } catch (e) {
      setCards(snapshot);
      setError(e instanceof Error ? e.message : 'Failed to detach child');
    } finally {
      setSaving(false);
    }
  };

  const parseCardId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.startsWith('card:') ? value.slice(5) : null;
  };

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
    if (id.startsWith('card:')) {
      setCuratedDragKind('reparent');
      const cid = id.slice(5);
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

      const childId = parseCardId(activeStr);
      const overId = overStr;
      if (!childId || !overId || saving) return;

      const intent = resolveCuratedDropIntent(overId);
      if (intent.kind === 'unparented') {
        await handleDetachChild(childId);
        return;
      }

      if (intent.kind === 'tree-root') {
        if (useMasterTree && curatedTreeMasterId) {
        const snapshot = cards;
        setSaving(true);
        setError(null);
        try {
          const masterFresh = await fetchAdminCardSnapshot(curatedTreeMasterId);
          const currentParentId = parentByChild.get(childId);
          if (currentParentId && currentParentId !== curatedTreeMasterId) {
            const currentFresh = await fetchAdminCardSnapshot(currentParentId);
            const nextChildren = normalizeCuratedChildIds(currentFresh.childrenIds).filter((id) => id !== childId);
            await patchCard(currentParentId, { childrenIds: nextChildren });
          }
          const nextMasterChildren = [
            ...normalizeCuratedChildIds(masterFresh.childrenIds).filter((id) => id !== childId),
            childId,
          ];
          await patchCard(curatedTreeMasterId, { childrenIds: nextMasterChildren });
          await load({ soft: true });
        } catch (e) {
          setCards(snapshot);
          setError(e instanceof Error ? e.message : 'Failed to append top-level card');
        } finally {
          setSaving(false);
        }
          return;
        }
        const snapshot = cards;
        const optimistic = optimisticPromoteToRootAppend(cards, childId);
        if (optimistic) setCards(optimistic);
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
          await load({ soft: true });
        } catch (e) {
          setCards(snapshot);
          setError(e instanceof Error ? e.message : 'Failed to set curated root');
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

  /** Admin Studio: middle column uses `embeddedUnparentedReplacement` (card bank) instead of the title-only list. */
  const studioAttachBank = embedded && Boolean(embeddedUnparentedReplacement);

  const collectionsCenterGrid = (
          <div
            ref={layoutRef}
            className={wideCenterLayout ? styles.layout : styles.layoutStacked}
            style={centerGridStyle}
          >
            {studioAttachBank ? (
              <section className={`${styles.panel} ${styles.panelStudioLeftTabs}`}>
                <h2 className={styles.panelStudioColumnTitle}>Organization</h2>
                <div className={styles.studioLeftTabToggleRow}>
                  <div className={cardAdminStyles.viewToggleButtonGroup} role="tablist" aria-label="Tags and curated tree">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioLeftTab === 'tags'}
                      className={`${cardAdminStyles.viewToggleButton} ${studioLeftTab === 'tags' ? cardAdminStyles.viewToggleActive : ''}`}
                      onClick={() => setStudioLeftTab('tags')}
                    >
                      Tags
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioLeftTab === 'tree'}
                      className={`${cardAdminStyles.viewToggleButton} ${studioLeftTab === 'tree' ? cardAdminStyles.viewToggleActive : ''}`}
                      onClick={() => setStudioLeftTab('tree')}
                    >
                      Tree
                    </button>
                  </div>
                </div>
                {studioLeftTab === 'tags' ? (
                  <div className={styles.studioLeftTabPanel} role="tabpanel">
                    <TagAdminStudioPane embeddedColumn />
                  </div>
                ) : (
                  <div className={styles.studioLeftTabPanel} role="tabpanel">
                    <h2 className={styles.studioLeftTreeHeading}>Curated tree</h2>
                    <div className={styles.panelScroll}>
                      {rootedCollections.length === 0 ? (
                        <TreeRootDropZone readOnly={treeDropZonesReadOnly} className={styles.treeRootDropZone}>
                          <p className={styles.emptyTreeHint}>
                            {curatedTreeDnd
                              ? 'Drop a card here to start your curated tree.'
                              : 'No curated roots yet, or add children from card admin.'}
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
                                parentByChild={parentByChild}
                                expandedIds={treeExpandedIds}
                                toggleExpanded={toggleTreeExpanded}
                                saving={saving}
                                onDetachChild={(id) => void handleDetachChild(id)}
                                onOpenBulkAdd={openBulkAddForParent}
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
                <h2>Curated Tree</h2>
                <div className={styles.panelScroll}>
                  {rootedCollections.length === 0 ? (
                    <TreeRootDropZone readOnly={treeDropZonesReadOnly} className={styles.treeRootDropZone}>
                      <p className={styles.emptyTreeHint}>
                        {curatedTreeDnd
                          ? 'Drop a card here to start your curated tree.'
                          : 'No curated roots yet, or add children from card admin.'}
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
                            parentByChild={parentByChild}
                            expandedIds={treeExpandedIds}
                            toggleExpanded={toggleTreeExpanded}
                            saving={saving}
                            onDetachChild={(id) => void handleDetachChild(id)}
                            onOpenBulkAdd={openBulkAddForParent}
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
            )}

            {wideCenterLayout ? (
              <div
                className={styles.colResizeHandle}
                role="separator"
                aria-orientation="vertical"
                aria-label={
                  studioAttachBank
                    ? 'Resize Tags or Tree column and Cards column'
                    : 'Resize curated tree and unparented columns'
                }
                {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
                onPointerDown={onColResizePointerDown(1)}
              />
            ) : null}

            <section className={styles.panel}>
              <h2 className={studioAttachBank ? styles.panelStudioColumnTitle : undefined}>
                {studioAttachBank ? 'Cards' : 'Unparented Cards'}
              </h2>
              {!studioAttachBank ? (
                <p className={styles.hint}>
                  {curatedTreeDnd
                    ? 'Drop a card here to remove its parent.'
                    : 'Cards without a curated parent appear here.'}
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
                    aria-label="Filter unparented cards by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              ) : null}
              <UnparentDropZone readOnly={treeDropZonesReadOnly} className={`${styles.unparentDropZone} ${styles.panelScroll}`}>
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
                    {unparentedCards.map((card) => (
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

            {wideCenterLayout ? (
              <div
                className={styles.colResizeHandle}
                role="separator"
                aria-orientation="vertical"
                aria-label={
                  studioAttachBank
                    ? 'Resize Cards and media columns'
                    : 'Resize unparented and media columns'
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
          {useMasterTree ? (
            <p className={styles.masterModeHint}>
              Master mode active: top-level curated items come from children of <code>{curatedTreeMasterId}</code>.
            </p>
          ) : null}
          <p className={styles.collectionsResizeHint}>
            Drag the narrow bars between columns to resize the tree, unparented list, and media pane. Widths are saved
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
              <strong>Reparenting</strong> — «{reparentTitle}». Drop on a <strong>title</strong> to nest, the{' '}
              <strong>band above a row</strong> to insert before that row, the dashed box for a root at the end, or{' '}
              <strong>{studioAttachBank ? 'Cards' : 'Unparented'}</strong>.
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
        </div>
      ) : null}
    </div>
  );
}
