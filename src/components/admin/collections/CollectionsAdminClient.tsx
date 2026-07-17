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
  useDroppable,
} from '@dnd-kit/core';
import { Card } from '@/lib/types/card';
import { CuratedTreeNode } from '@/components/admin/studio/cards/CuratedTreeNode';
import {
  CuratedTreeDragProvider,
  type CuratedTreeDragKind,
} from '@/components/admin/studio/cards/curatedTreeDragContext';
import {
  CuratedTreeDropHighlightSync,
  useCuratedTreeDropHighlight,
} from '@/components/admin/studio/cards/curatedTreeDropHighlightContext';
import { collectionsCollisionDetection } from '@/components/admin/studio/cards/collectionsCollisionDetection';
import {
  buildRootDocIdListWithInsertBefore,
  buildParentIdsByChild,
  buildChildrenIdsWithInsertBefore,
  deriveCuratedMutationPlan,
  listCollectionRootCards,
  normalizeCuratedChildIds,
  resolveCuratedDropIntent,
} from '@/lib/utils/curatedCollectionTree';
import { listOrphanedCards } from '@/lib/utils/curatedTreeAttachCandidates';
import {
  optimisticAttachChildAsLast,
  optimisticDetachChildFromParent,
  optimisticInsertChildBeforeSibling,
  optimisticReorderCollectionRoots,
  optimisticSetCollectionRoot,
} from '@/lib/utils/optimisticCuratedCollections';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from '@/app/admin/collections/page.module.css';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import { isCuratedTreeDndEnabled } from '@/lib/config/curatedTreeDnd';
import { DND_POINTER_IGNORE_ATTR, useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import {
  readStoredStudioCardBankSharedFilterPreferences,
  writeStoredStudioCardBankSharedFilterPreferences,
} from '@/lib/preferences/adminFilters';
import TagAdminStudioPane from '@/components/admin/studio/TagAdminStudioPane';
import TagReconciliationPane, {
  countIncomingReconcileTags,
} from '@/components/admin/studio/tags/TagReconciliationPane';
import { useTag } from '@/components/providers/TagProvider';
import {
  buildCollectionsCardDragData,
  isCollectionsCardDragData,
  parseCollectionsCardDragId,
} from '@/lib/dnd/collectionsDragContract';
import { mergeStudioCatalogCard, toStudioCatalogCard } from '@/components/admin/studio/studioCardProjection';
import { resolveStudioShellExternalDropId } from '@/lib/dnd/studioShellDragRouter';

const COLLECTIONS_CENTER_COLUMNS_KEY = 'collectionsCenterPaneWidths';
const COLLECTIONS_TREE_EXPANSION_KEY = 'collectionsTreeExpandedIds';
const COL_HANDLE = 8;
const MIN_TREE_COL = 180;
const MIN_UNPARENT_COL = 180;
/** Minimum width for the Media / Studio right column (grid area); user-resizable. Kept below old 280px to reduce default horizontal sprawl. */
const MIN_MEDIA_COL = 200;

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

function readStoredTreeExpandedIds(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function writeStudioDndDebug(payload: Record<string, unknown>) {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    root.setAttribute('data-studio-dnd-phase', String(payload.phase ?? 'unknown'));
    root.setAttribute(
      'data-studio-dnd-debug',
      JSON.stringify({
        ...payload,
        at: Date.now(),
      }).slice(0, 4000)
    );
  } catch {
    // Debug capture must never interfere with drag behavior.
  }
}

function scrollCollectionsTreeCardIntoView(cardId: string) {
  if (typeof document === 'undefined' || !cardId) return;
  const run = () => {
    const el = document.querySelector(`[data-curated-tree-card-id="${CSS.escape(cardId)}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}

interface CardsResponse {
  items: Card[];
}

type BulkCardTypeFilter = 'all' | Card['type'];

function mergeCardsByIdPreservingStudioProjection(prev: Card[], items: Card[]): Card[] {
  if (items.length === 0) return prev;
  if (prev.length === 0) return items.map((card) => toStudioCatalogCard(card));

  const out = new Map<string, Card>();
  for (const card of prev) {
    if (card.docId) out.set(card.docId, card);
  }
  for (const card of items) {
    if (!card.docId) continue;
    const existing = out.get(card.docId);
    if (!existing) {
      out.set(card.docId, toStudioCatalogCard(card));
      continue;
    }
    out.set(card.docId, mergeStudioCatalogCard(toStudioCatalogCard(existing), card));
  }
  return Array.from(out.values());
}

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
    data: buildCollectionsCardDragData(card.docId),
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
      className={`${className} ${isDragging ? styles.dragSourceActive : ''}`}
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
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({
    id: 'unparented',
    data: { domain: 'collections', dropKind: 'orphaned' },
  });
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
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({
    id: `unparented-row:${rowId}`,
    data: { domain: 'collections', dropKind: 'orphaned', rowId },
  });
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
  const highlightId = useCuratedTreeDropHighlight();
  const { setNodeRef } = useDroppable({
    id: 'tree-root',
    data: { domain: 'collections', dropKind: 'tree-root' },
  });
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
  refreshStructure: () => void;
  upsertCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
};

export default function CollectionsAdminClient({
  onSelectCard,
  selectedCardIdExternal,
  embeddedExternalDragEnd,
  embeddedOnStudioParentAttachComplete,
  embeddedRightSlot,
  embeddedRightSlotMinWidth,
  embeddedUnparentedReplacement,
  embeddedOrganizationCollapsed = false,
  embeddedCardsCollapsed = false,
}: {
  onSelectCard?: (cardId: string, previewCard?: Card | null) => void | Promise<boolean>;
  selectedCardIdExternal?: string | null;
  embeddedExternalDragEnd?: (event: DragEndEvent, resolvedOverId?: string | null) => Promise<boolean> | boolean;
  embeddedOnStudioParentAttachComplete?: (parentId: string) => void;
  embeddedRightSlot: React.ReactNode | ((ctx: EmbeddedStudioSlotContext) => React.ReactNode);
  embeddedRightSlotMinWidth?: number;
  /** Replaces the title-only unparented list with the Studio card bank (or similar). */
  embeddedUnparentedReplacement?: (ctx: EmbeddedUnparentedBankContext) => React.ReactNode;
  embeddedOrganizationCollapsed?: boolean;
  embeddedCardsCollapsed?: boolean;
}) {
  const initialStudioCardBankSharedPrefsRef = useRef(readStoredStudioCardBankSharedFilterPreferences());
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialStudioCardBankSharedPrefsRef.current.search);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>(
    initialStudioCardBankSharedPrefsRef.current.statusFilter
  );
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [curatedDragKind, setCuratedDragKind] = useState<CuratedTreeDragKind>(null);
  const [dragOverlayCard, setDragOverlayCard] = useState<Card | null>(null);
  /** Studio bank → body/cover/gallery: show a ghost under the pointer while dragging `source:*`. */
  const lastValidOverIdRef = useRef<string | null>(null);
  const lastValidOverDataRef = useRef<unknown>(null);
  const hasInitializedTreeExpansionRef = useRef(false);
  /** Stale-stream guard: each `load()` call increments this; chunks for older calls bail. */
  const loadRequestIdRef = useRef(0);
  const [bulkParentId, setBulkParentId] = useState<string | null>(null);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [bulkType, setBulkType] = useState<BulkCardTypeFilter>('all');
  const [bulkUnparentedOnly, setBulkUnparentedOnly] = useState(true);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [treeExpandedIds, setTreeExpandedIds] = useState<Set<string>>(new Set());
  const [treeExpansionHydrated, setTreeExpansionHydrated] = useState(false);
  const [embeddedTreeDescendantsLoaded, setEmbeddedTreeDescendantsLoaded] = useState(false);
  const [embeddedTreeDescendantsLoading, setEmbeddedTreeDescendantsLoading] = useState(false);
  const [studioLeftTab, setStudioLeftTab] = useState<'tags' | 'tree'>(() => {
    if (typeof window === 'undefined') return 'tags';
    const stored = window.localStorage.getItem('studioLeftTab');
    return stored === 'tree' ? 'tree' : 'tags';
  });
  const [reconcilePaneOpen, setReconcilePaneOpen] = useState(false);
  const { tags: allTagsForReconcile } = useTag();
  const incomingReconcileCount = useMemo(
    () => countIncomingReconcileTags(allTagsForReconcile),
    [allTagsForReconcile]
  );
  const sensors = useDefaultDndSensors({ pointerActivationDistance: 4 });
  const curatedTreeDnd = isCuratedTreeDndEnabled();
  /** Studio: middle column uses `embeddedUnparentedReplacement` (card bank) instead of the title-only list. */
  const studioAttachBank = Boolean(embeddedUnparentedReplacement);
  const showOrganizationPane = !(studioAttachBank && embeddedOrganizationCollapsed);
  const showCardsPane = !(studioAttachBank && embeddedCardsCollapsed);
  const rightSlotMinWidth = Math.max(MIN_MEDIA_COL, embeddedRightSlotMinWidth ?? MIN_MEDIA_COL);
  const treeDropZonesReadOnly = !curatedTreeDnd;
  /** Embedded Studio shares one drag runtime so cross-pane card and media drags can cross columns. */
  const needsDndContext = curatedTreeDnd;
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [wideCenterLayout] = useState(true);
  const [wTree, setWTree] = useState(312);
  const [wUnparent, setWUnparent] = useState(296);
  const wTreeRef = useRef(wTree);
  const wUnparentRef = useRef(wUnparent);
  const colDragSessionRef = useRef<
    | { which: 1; startX: number; startTree: number; startUnparent: number }
    | { which: 2; startX: number; startWidth: number; target: 'tree' | 'cards'; fixedLeading: number }
    | null
  >(null);
  const colDragRafRef = useRef<number | null>(null);
  const pendingCenterWidthsRef = useRef<{ tree: number; unparent: number } | null>(null);

  wTreeRef.current = wTree;
  wUnparentRef.current = wUnparent;

  useEffect(() => {
    const stored = readCenterColumnWidths();
    if (stored) {
      setWTree(stored.tree);
      setWUnparent(stored.unparent);
    }
  }, []);

  useEffect(() => {
    if (incomingReconcileCount === 0) {
      setReconcilePaneOpen(false);
    }
  }, [incomingReconcileCount]);

  useEffect(() => {
    try {
      localStorage.setItem('studioLeftTab', studioLeftTab);
    } catch {
      /* ignore */
    }
  }, [studioLeftTab]);

  useEffect(() => {
    writeStoredStudioCardBankSharedFilterPreferences({ search, statusFilter });
  }, [search, statusFilter]);

  useEffect(() => {
    setTreeExpandedIds(new Set(readStoredTreeExpandedIds(COLLECTIONS_TREE_EXPANSION_KEY)));
    setTreeExpansionHydrated(true);
  }, []);

  useEffect(() => {
    if (!treeExpansionHydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(
      COLLECTIONS_TREE_EXPANSION_KEY,
      JSON.stringify(Array.from(treeExpandedIds))
    );
  }, [treeExpandedIds, treeExpansionHydrated]);

  const persistCenterWidths = useCallback((tree: number, unparent: number) => {
    try {
      localStorage.setItem(COLLECTIONS_CENTER_COLUMNS_KEY, JSON.stringify({ tree, unparent }));
    } catch {
      /* ignore */
    }
  }, []);

  const applyCenterGridTemplate = useCallback(
    (tree: number, unparent: number) => {
      const el = layoutRef.current;
      if (!el || !wideCenterLayout) return;
      if (!showOrganizationPane && !showCardsPane) {
        el.style.gridTemplateColumns = `minmax(${rightSlotMinWidth}px, 1fr)`;
        return;
      }
      if (!showOrganizationPane) {
        el.style.gridTemplateColumns = `${unparent}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)`;
        return;
      }
      if (!showCardsPane) {
        el.style.gridTemplateColumns = `${tree}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)`;
        return;
      }
      el.style.gridTemplateColumns = `${tree}px ${COL_HANDLE}px ${unparent}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)`;
    },
    [rightSlotMinWidth, showCardsPane, showOrganizationPane, wideCenterLayout]
  );

  const normalizeWidthsToContainer = useCallback(() => {
    const el = layoutRef.current;
    if (!el || !wideCenterLayout || colDragSessionRef.current) return;
    const gapPx = parseGapPx(el);
    const usable = el.clientWidth - 2 * COL_HANDLE - 4 * gapPx;
    if (usable < MIN_TREE_COL + MIN_UNPARENT_COL + rightSlotMinWidth) return;

    const t = wTreeRef.current;
    const u = wUnparentRef.current;
    let nt = clamp(t, MIN_TREE_COL, usable - MIN_UNPARENT_COL - rightSlotMinWidth);
    let nu = clamp(u, MIN_UNPARENT_COL, usable - MIN_TREE_COL - rightSlotMinWidth);
    if (nt + nu + rightSlotMinWidth > usable) {
      const pairBudget = usable - rightSlotMinWidth;
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
  }, [rightSlotMinWidth, wideCenterLayout]);

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
    return () => {
      if (colDragRafRef.current != null) {
        window.cancelAnimationFrame(colDragRafRef.current);
        colDragRafRef.current = null;
      }
      pendingCenterWidthsRef.current = null;
      colDragSessionRef.current = null;
    };
  }, []);

  const onColResizePointerDown = useCallback(
    (which: 1 | 2) => (e: React.PointerEvent) => {
      if (!wideCenterLayout) return;
      e.preventDefault();
      const targetEl = e.currentTarget as HTMLElement;
      targetEl.setPointerCapture(e.pointerId);
      if (which === 1) {
        colDragSessionRef.current = { which: 1, startX: e.clientX, startTree: wTreeRef.current, startUnparent: wUnparentRef.current };
      } else {
        const target: 'tree' | 'cards' = showCardsPane ? 'cards' : 'tree';
        const startWidth = target === 'cards' ? wUnparentRef.current : wTreeRef.current;
        const fixedLeading = showOrganizationPane && showCardsPane ? wTreeRef.current : 0;
        colDragSessionRef.current = { which: 2, startX: e.clientX, startWidth, target, fixedLeading };
      }

      const onMove = (ev: PointerEvent) => {
        const session = colDragSessionRef.current;
        const el = layoutRef.current;
        if (!session || !el) return;
        const gapPx = parseGapPx(el);
        const usable = el.clientWidth - 2 * COL_HANDLE - 4 * gapPx;
        const dx = ev.clientX - session.startX;

        let nextTree = wTreeRef.current;
        let nextUnparent = wUnparentRef.current;

        if (session.which === 1) {
          const s = session.startTree + session.startUnparent;
          nextTree = clamp(session.startTree + dx, MIN_TREE_COL, s - MIN_UNPARENT_COL);
          nextUnparent = s - nextTree;
        } else {
          const maxWidth = usable - session.fixedLeading - rightSlotMinWidth;
          const minWidth = session.target === 'tree' ? MIN_TREE_COL : MIN_UNPARENT_COL;
          const raw = session.startWidth + dx;
          const nextWidth = maxWidth < minWidth ? minWidth : clamp(raw, minWidth, maxWidth);
          if (session.target === 'tree') {
            nextTree = nextWidth;
          } else {
            nextUnparent = nextWidth;
          }
        }

        pendingCenterWidthsRef.current = { tree: nextTree, unparent: nextUnparent };
        if (colDragRafRef.current != null) return;
        colDragRafRef.current = window.requestAnimationFrame(() => {
          colDragRafRef.current = null;
          const pending = pendingCenterWidthsRef.current;
          if (!pending) return;
          applyCenterGridTemplate(pending.tree, pending.unparent);
        });
      };

      const onUp = (ev: PointerEvent) => {
        const session = colDragSessionRef.current;
        if (!session) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        try {
          targetEl.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        if (colDragRafRef.current != null) {
          window.cancelAnimationFrame(colDragRafRef.current);
          colDragRafRef.current = null;
        }
        const committed = pendingCenterWidthsRef.current ?? { tree: wTreeRef.current, unparent: wUnparentRef.current };
        pendingCenterWidthsRef.current = null;
        colDragSessionRef.current = null;
        setWTree(committed.tree);
        setWUnparent(committed.unparent);
        persistCenterWidths(committed.tree, committed.unparent);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [applyCenterGridTemplate, persistCenterWidths, rightSlotMinWidth, showCardsPane, showOrganizationPane, wideCenterLayout]
  );

  const centerGridStyle = useMemo((): React.CSSProperties | undefined => {
    if (!wideCenterLayout) return undefined;
    return {
      gridTemplateColumns: `${wTree}px ${COL_HANDLE}px ${wUnparent}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)`,
    };
  }, [rightSlotMinWidth, wideCenterLayout, wTree, wUnparent]);

  const upsertEmbeddedCard = useCallback((card: Card) => {
    if (!card?.docId) return;
    setCards((prev) => {
      const index = prev.findIndex((entry) => entry.docId === card.docId);
      if (index === -1) return [toStudioCatalogCard(card), ...prev];
      const existing = toStudioCatalogCard(prev[index]);
      const nextCard = mergeStudioCatalogCard(existing, card);
      const next = [...prev];
      next[index] = nextCard;
      return next;
    });
  }, []);

  // First chunk paints fast (250 cards), remaining pages stream in background under
  // server's stable `created desc` order. Roots fetch (capped at 200) runs in parallel
  // with page 0. The Studio bank's "Loading more cards…" indicator covers the streaming
  // window — no separate indicator here. See docs/01-Vision-Architecture.md → Frontend
  // Principles (chunked list delivery + stable ordering).
  // Studio Collections loads tree roots first, then optional descendants when the card
  // bank is mounted — never a broad all-cards catalog pass.
  const load = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    const requestId = ++loadRequestIdRef.current;
    const isCurrent = () => loadRequestIdRef.current === requestId;

    if (!soft) {
      setLoading(true);
    }
    setError(null);

    let firstChunkPainted = false;

    try {
      const rootsRes = await fetch('/api/cards?collectionsOnly=true&status=all&hydration=cover-only');
      if (!isCurrent()) return;
      const rootsData = (await rootsRes.json().catch(() => ({}))) as CardsResponse & {
        error?: string;
      };
      if (!rootsRes.ok) throw new Error(rootsData.error || 'Failed to load collection roots');
      if (!isCurrent()) return;

      const rootItems = Array.isArray(rootsData.items) ? rootsData.items : [];
      setCards((prev) => mergeCardsByIdPreservingStudioProjection(soft ? prev : [], rootItems));
      setEmbeddedTreeDescendantsLoaded(false);
      firstChunkPainted = true;
      if (!soft) setLoading(false);

      if (!studioAttachBank || studioLeftTab !== 'tree') {
        setEmbeddedTreeDescendantsLoading(false);
        return;
      }

      setEmbeddedTreeDescendantsLoading(true);
      const descendantsRes = await fetch(
        '/api/cards?collectionsOnly=true&includeDescendants=true&status=all&hydration=cover-only'
      );
      if (!isCurrent()) return;
      const descendantsData = (await descendantsRes.json().catch(() => ({}))) as CardsResponse & {
        error?: string;
      };
      if (!descendantsRes.ok) {
        throw new Error(descendantsData.error || 'Failed to load collection descendants');
      }
      if (!isCurrent()) return;

      const descendantItems = Array.isArray(descendantsData.items) ? descendantsData.items : [];
      setCards((prev) => mergeCardsByIdPreservingStudioProjection(prev, descendantItems));
      setEmbeddedTreeDescendantsLoaded(true);
      setEmbeddedTreeDescendantsLoading(false);
    } catch (e) {
      if (isCurrent()) {
        if (studioAttachBank) {
          setEmbeddedTreeDescendantsLoading(false);
        }
        setError(e instanceof Error ? e.message : 'Failed to load cards');
      }
    } finally {
      if (isCurrent() && !soft && !firstChunkPainted) {
        setLoading(false);
      }
    }
  }, [studioAttachBank, studioLeftTab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!studioAttachBank) return;
    if (studioLeftTab !== 'tree') return;
    if (embeddedTreeDescendantsLoaded || embeddedTreeDescendantsLoading || loading) return;
    void load({ soft: true });
  }, [
    embeddedTreeDescendantsLoaded,
    embeddedTreeDescendantsLoading,
    loading,
    load,
    studioAttachBank,
    studioLeftTab,
  ]);

  const cardById = useMemo(() => new Map(cards.map(c => [c.docId, c])), [cards]);
  const parentIdsByChild = useMemo(() => buildParentIdsByChild(cards), [cards]);
  const rootedCollections = useMemo(
    () => listCollectionRootCards(cards),
    [cards]
  );

  useEffect(() => {
    setSelectedCardId(selectedCardIdExternal ?? null);
  }, [selectedCardIdExternal]);

  useEffect(() => {
    if (!cards.length) return;
    if (selectedCardId) return;
    if (selectedCardIdExternal) return;
    if (studioAttachBank) return;
    const fallback = rootedCollections[0]?.docId ?? cards[0]?.docId ?? null;
    setSelectedCardId(fallback);
    if (fallback) onSelectCard?.(fallback, cardById.get(fallback) ?? null);
  }, [cards, selectedCardId, rootedCollections, onSelectCard, cardById, selectedCardIdExternal, studioAttachBank]);

  const handleSelectCard = useCallback(
    (cardId: string) => {
      const previewCard = cardById.get(cardId) ?? null;
      setSelectedCardId(cardId);
      onSelectCard?.(cardId, previewCard);
    },
    [cardById, onSelectCard]
  );

  const toggleTreeExpanded = useCallback((id: string) => {
    setTreeExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeEmbeddedCard = useCallback((cardId: string) => {
    if (!cardId) return;
    setCards((prev) => {
      const remaining = prev
        .filter((card) => card.docId !== cardId)
        .map((card) => {
          const childrenIds = normalizeCuratedChildIds(card.childrenIds);
          if (!childrenIds.includes(cardId)) return card;
          return {
            ...card,
            childrenIds: childrenIds.filter((id) => id !== cardId),
          };
        });
      return remaining;
    });
  }, []);

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
      setTreeExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        return new Set(expandableIds);
      });
      return;
    }

  }, [cards, treeExpansionHydrated]);

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
    throwIfJsonApiFailed(res, data, 'This collection could not be updated. Try again.');
  };

  const runCollectionsMutation = useCallback(
    async (
      work: () => Promise<void>,
      fallbackMessage: string,
      options?: { reloadAfter?: boolean }
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await work();
        if (options?.reloadAfter !== false) {
          await load({ soft: true });
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : fallbackMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const detachFromParentPersist = useCallback(async (parentId: string, childId: string) => {
    const parentFresh = await fetchAdminCardSnapshot(parentId);
    const nextChildren = normalizeCuratedChildIds(parentFresh.childrenIds).filter((id) => id !== childId);
    await patchCard(parentId, { childrenIds: nextChildren });
  }, []);

  const appendToParentPersist = useCallback(async (parentId: string, childId: string) => {
    const parentFresh = await fetchAdminCardSnapshot(parentId);
    const nextChildren = Array.from(new Set([...normalizeCuratedChildIds(parentFresh.childrenIds), childId]));
    await patchCard(parentId, { childrenIds: nextChildren });
  }, []);

  const insertBeforePersist = useCallback(
    async (parentId: string, childId: string, beforeSiblingId: string) => {
      const parentFresh = await fetchAdminCardSnapshot(parentId);
      const nextChildren = buildChildrenIdsWithInsertBefore(parentFresh.childrenIds, childId, beforeSiblingId);
      await patchCard(parentId, { childrenIds: nextChildren });
    },
    []
  );

  const clearRootPersist = useCallback(async (cardId: string) => {
    await patchCard(cardId, { isCollectionRoot: false });
  }, []);

  const setRootPersist = useCallback(async (cardId: string, order: number) => {
    await patchCard(cardId, {
      isCollectionRoot: true,
      collectionRootOrder: order,
    });
  }, []);

  const persistRootOrderList = useCallback(
    async (orderedRootIds: string[]) => {
      await Promise.all(
        orderedRootIds.map((rootId, index) =>
          patchCard(rootId, {
            isCollectionRoot: true,
            collectionRootOrder: index * 10,
          })
        )
      );
    },
    []
  );

  const handleDetachChild = useCallback(
    async (childId: string, parentId: string) => {
      if (!parentId) return;
      const previousCards = cards;
      setCards((prev) => optimisticDetachChildFromParent(prev, childId, parentId) ?? prev);
      const success = await runCollectionsMutation(async () => {
        await detachFromParentPersist(parentId, childId);
      }, 'Failed to detach child', { reloadAfter: false });
      if (!success) {
        setCards(previousCards);
      }
    },
    [cards, detachFromParentPersist, runCollectionsMutation]
  );

  const handleClearRoot = useCallback(
    async (cardId: string) => {
      const remainingRootIds = rootedCollections.map((card) => card.docId!).filter((id) => id && id !== cardId);
      const previousCards = cards;
      setCards((prev) => {
        const cleared = optimisticSetCollectionRoot(prev, cardId, { isCollectionRoot: false });
        const next = cleared ?? prev;
        const reordered = optimisticReorderCollectionRoots(next, remainingRootIds);
        return reordered ?? next;
      });
      const success = await runCollectionsMutation(async () => {
        await clearRootPersist(cardId);
        if (remainingRootIds.length > 0) {
          await persistRootOrderList(remainingRootIds);
        }
      }, 'Failed to remove root', { reloadAfter: false });
      if (!success) {
        setCards(previousCards);
      }
    },
    [cards, clearRootPersist, persistRootOrderList, rootedCollections, runCollectionsMutation]
  );

  const executeCuratedMutationPlan = useCallback(
    async (
      steps: ReturnType<typeof deriveCuratedMutationPlan>,
      fallbackMessage: string,
      options?: { rootOrderIds?: string[] }
    ) => {
      if (steps.length === 0) return;
      const previousCards = cards;
      setCards((prev) => {
        let next = prev;
        for (const step of steps) {
          const patched =
            step.kind === 'detach-parent'
              ? optimisticDetachChildFromParent(next, step.childId, step.parentId)
              : step.kind === 'append-parent'
                ? optimisticAttachChildAsLast(next, step.childId, step.parentId)
                : step.kind === 'insert-before'
                  ? optimisticInsertChildBeforeSibling(next, step.childId, step.beforeSiblingId, step.parentId)
                  : step.kind === 'clear-root'
                    ? optimisticSetCollectionRoot(next, step.cardId, { isCollectionRoot: false })
                    : optimisticSetCollectionRoot(next, step.cardId, {
                        isCollectionRoot: true,
                        collectionRootOrder: step.rootOrder,
                      });
          if (patched) {
            next = patched;
          }
        }
        if (options?.rootOrderIds?.length) {
          const reordered = optimisticReorderCollectionRoots(next, options.rootOrderIds);
          if (reordered) {
            next = reordered;
          }
        }
        return next;
      });

      const success = await runCollectionsMutation(async () => {
        for (const step of steps) {
          switch (step.kind) {
            case 'detach-parent':
              await detachFromParentPersist(step.parentId, step.childId);
              break;
            case 'append-parent':
              await appendToParentPersist(step.parentId, step.childId);
              break;
            case 'insert-before':
              await insertBeforePersist(step.parentId, step.childId, step.beforeSiblingId);
              break;
            case 'clear-root':
              await clearRootPersist(step.cardId);
              break;
            case 'set-root':
              if (!options?.rootOrderIds) {
                await setRootPersist(step.cardId, step.rootOrder);
              }
              break;
          }
        }
        if (options?.rootOrderIds?.length) {
          await persistRootOrderList(options.rootOrderIds);
        }
      }, fallbackMessage, { reloadAfter: false });

      if (!success) {
        setCards(previousCards);
        return;
      }

    },
    [
      appendToParentPersist,
      clearRootPersist,
      detachFromParentPersist,
      insertBeforePersist,
      cards,
      persistRootOrderList,
      runCollectionsMutation,
      setRootPersist,
    ]
  );

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

  const handleDragCancel = useCallback(() => {
    writeStudioDndDebug({
      phase: 'cancel',
      lastValidOverId: lastValidOverIdRef.current,
      lastValidOverData: lastValidOverDataRef.current ?? null,
    });
    setCuratedDragKind(null);
    setDraggingCardId(null);
    setDragOverlayCard(null);
    lastValidOverIdRef.current = null;
    lastValidOverDataRef.current = null;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const id = event.over?.id != null ? String(event.over.id) : null;
    if (id) {
      lastValidOverIdRef.current = id;
      lastValidOverDataRef.current = event.over?.data.current ?? null;
    }
    writeStudioDndDebug({
      phase: 'over',
      activeId: event.active?.id != null ? String(event.active.id) : null,
      overId: id,
      overData: event.over?.data.current ?? null,
      lastValidOverId: lastValidOverIdRef.current,
      lastValidOverData: lastValidOverDataRef.current ?? null,
    });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    lastValidOverIdRef.current = null;
    lastValidOverDataRef.current = null;
    const raw = event.active.id;
    const id = typeof raw === 'string' ? raw : String(raw);
    if (isCollectionsCardDragData(event.active.data.current)) {
      writeStudioDndDebug({
        phase: 'start',
        activeId: id,
        kind: 'collections-card',
        activeData: event.active.data.current,
      });
      setCuratedDragKind('reparent');
      const cid = event.active.data.current.cardId;
      setDraggingCardId(cid);
      setDragOverlayCard(cardById.get(cid) ?? null);
    } else {
      writeStudioDndDebug({
        phase: 'start',
        activeId: id,
        kind: 'unknown',
        activeData: event.active.data.current ?? null,
      });
      setCuratedDragKind(null);
      setDraggingCardId(null);
      setDragOverlayCard(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragOverlayCard(null);
    const rawActive = event.active.id;
    const rawOver = event.over?.id ?? null;
    const activeStr = typeof rawActive === 'string' ? rawActive : String(rawActive);
    const overStr =
      rawOver != null
        ? (typeof rawOver === 'string' ? rawOver : String(rawOver))
        : lastValidOverIdRef.current;
    const overData = event.over?.data.current ?? lastValidOverDataRef.current;
    writeStudioDndDebug({
      phase: 'end-begin',
      activeId: activeStr,
      rawOverId: rawOver != null ? (typeof rawOver === 'string' ? rawOver : String(rawOver)) : null,
      resolvedOverId: overStr,
      overData,
      lastValidOverId: lastValidOverIdRef.current,
      lastValidOverData: lastValidOverDataRef.current ?? null,
    });

    try {
      setCuratedDragKind(null);
      setDraggingCardId(null);

      const childId =
        isCollectionsCardDragData(event.active.data.current)
          ? event.active.data.current.cardId
          : parseCollectionsCardDragId(activeStr);
      if (!childId) {
        const resolvedExternalOverId = resolveStudioShellExternalDropId({
          activeId: activeStr,
          rawOverId: rawOver != null ? (typeof rawOver === 'string' ? rawOver : String(rawOver)) : null,
          lastValidOverId: lastValidOverIdRef.current,
        });
        await embeddedExternalDragEnd?.(event, resolvedExternalOverId);
        return;
      }
      const overId = overStr;
      if (!overId || saving) return;
      const activeData = isCollectionsCardDragData(event.active.data.current)
        ? event.active.data.current
        : null;
      const fallbackParentId = activeData?.sourceParentId ?? (parentIdsByChild.get(childId) ?? [])[0];
      const fallbackSource = {
        sourceParentId: fallbackParentId,
        sourceIsRoot: activeData?.sourceIsRoot ?? (!fallbackParentId && cardById.get(childId)?.isCollectionRoot === true),
      };

      const intent = resolveCuratedDropIntent(overId, overData);
      const mutationPlan = deriveCuratedMutationPlan({
        childId,
        intent,
        source: fallbackSource,
        rootedCollectionIds: rootedCollections.map((card) => card.docId!).filter(Boolean),
      });
      const currentRootIds = rootedCollections.map((card) => card.docId!).filter(Boolean);
      const rootOrderIds =
        intent.kind === 'tree-root'
          ? [...currentRootIds.filter((id) => id !== childId), childId]
          : intent.kind === 'insert-before' && !intent.parentId
            ? buildRootDocIdListWithInsertBefore(currentRootIds, childId, intent.beforeId)
            : intent.kind === 'parent' && fallbackSource.sourceIsRoot
              ? currentRootIds.filter((id) => id !== childId)
              : intent.kind === 'orphaned' && fallbackSource.sourceIsRoot
                ? currentRootIds.filter((id) => id !== childId)
                : undefined;
      writeStudioDndDebug({
        phase: 'end-plan',
        activeId: activeStr,
        childId,
        overId,
        overData,
        fallbackSource,
        intent,
        mutationPlan,
        rootOrderIds,
      });

      if (intent.kind === 'orphaned') {
        await executeCuratedMutationPlan(mutationPlan, 'Failed to detach child', { rootOrderIds });
        setSelectedCardId(childId);
        onSelectCard?.(childId, cardById.get(childId) ?? null);
        writeStudioDndDebug({ phase: 'end-complete', outcome: 'orphaned', childId, overId });
        return;
      }

      if (intent.kind === 'tree-root') {
        await executeCuratedMutationPlan(mutationPlan, 'Failed to append top-level card', { rootOrderIds });
        setSelectedCardId(childId);
        onSelectCard?.(childId, cardById.get(childId) ?? null);
        scrollCollectionsTreeCardIntoView(childId);
        writeStudioDndDebug({ phase: 'end-complete', outcome: 'tree-root', childId, overId });
        return;
      }

      if (intent.kind === 'insert-before') {
        await executeCuratedMutationPlan(
          mutationPlan,
          intent.parentId ? 'Failed to insert card' : 'Failed to insert top-level card',
          { rootOrderIds }
        );
        setSelectedCardId(childId);
        onSelectCard?.(childId, cardById.get(childId) ?? null);
        scrollCollectionsTreeCardIntoView(childId);
        writeStudioDndDebug({ phase: 'end-complete', outcome: 'insert-before', childId, overId });
        return;
      }

      if (intent.kind === 'parent') {
        await executeCuratedMutationPlan(mutationPlan, 'Failed to attach child', { rootOrderIds });
        if (overId.startsWith('studio-parent:')) {
          const parentId = overId.slice('studio-parent:'.length);
          if (parentId) {
            setSelectedCardId(parentId);
            onSelectCard?.(parentId, cardById.get(parentId) ?? null);
            embeddedOnStudioParentAttachComplete?.(parentId);
            scrollCollectionsTreeCardIntoView(parentId);
          }
        } else {
          setSelectedCardId(childId);
          onSelectCard?.(childId, cardById.get(childId) ?? null);
          scrollCollectionsTreeCardIntoView(childId);
        }
        writeStudioDndDebug({ phase: 'end-complete', outcome: 'parent', childId, overId });
      }
    } finally {
      lastValidOverIdRef.current = null;
      lastValidOverDataRef.current = null;
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
    const previousCards = cards;
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
      setCards((prev) => {
        const next = prev.map((card) =>
          card.docId === bulkParentCard.docId
            ? {
                ...card,
                childrenIds: nextChildren,
              }
            : card
        );
        return next;
      });
      await patchCard(bulkParentCard.docId, { childrenIds: nextChildren });
      setBulkSelectedIds(new Set());
      setBulkSummary(`Added ${added.length} card${added.length === 1 ? '' : 's'} to "${cardLabel(bulkParentCard)}".`);
    } catch (e) {
      setCards(previousCards);
      setError(e instanceof Error ? e.message : 'Failed to bulk add cards');
    } finally {
      setSaving(false);
    }
  }, [bulkParentCard, bulkSelectedIds, bulkSelectableIds, cards]);

  const collectionsCenterGridStyle = useMemo((): React.CSSProperties | undefined => {
    if (!wideCenterLayout) return undefined;
    if (!showOrganizationPane && !showCardsPane) {
      return { gridTemplateColumns: `minmax(${rightSlotMinWidth}px, 1fr)` };
    }
    if (!showOrganizationPane) {
      return { gridTemplateColumns: `${wUnparent}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)` };
    }
    if (!showCardsPane) {
      return { gridTemplateColumns: `${wTree}px ${COL_HANDLE}px minmax(${rightSlotMinWidth}px, 1fr)` };
    }
    return centerGridStyle;
  }, [centerGridStyle, rightSlotMinWidth, showCardsPane, showOrganizationPane, wTree, wUnparent, wideCenterLayout]);

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
                  <div className={styles.studioLeftTabButtonGroup} role="tablist" aria-label="Organize tags and collections">
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
                  {studioLeftTab === 'tags' && incomingReconcileCount > 0 ? (
                    <button
                      type="button"
                      className={styles.studioReconcileToggle}
                      aria-pressed={reconcilePaneOpen}
                      onClick={() => setReconcilePaneOpen((open) => !open)}
                    >
                      {reconcilePaneOpen
                        ? 'Hide import map'
                        : `Map import tags (${incomingReconcileCount})`}
                    </button>
                  ) : null}
                </div>
                {studioLeftTab === 'tags' ? (
                  <div
                    className={`${styles.studioLeftTabPanel} ${
                      reconcilePaneOpen && incomingReconcileCount > 0
                        ? styles.organizeSplitPanel
                        : ''
                    }`}
                    role="tabpanel"
                  >
                    <div className={styles.organizeTreePane}>
                      <TagAdminStudioPane embeddedColumn />
                    </div>
                    {reconcilePaneOpen && incomingReconcileCount > 0 ? (
                      <div className={styles.organizeReconcilePane}>
                        <TagReconciliationPane />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.studioLeftTabPanel} role="tabpanel">
                    <div className={styles.panelScroll}>
                      {embeddedTreeDescendantsLoading || !embeddedTreeDescendantsLoaded ? (
                        <p className={styles.hint}>Loading collections...</p>
                      ) : rootedCollections.length === 0 ? (
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
                                Drop here to start a new Collection.
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
                            Drop here to start a new Collection.
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
              {!studioAttachBank ? (
                <h2 className={styles.panelStudioColumnTitle}>Orphaned Cards</h2>
              ) : null}
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
                readOnly={treeDropZonesReadOnly || studioAttachBank}
                className={`${styles.unparentDropZone} ${studioAttachBank ? styles.panelViewport : styles.panelScroll}`}
                suppressActiveHighlight={studioAttachBank}
              >
                {studioAttachBank ? (
                  embeddedUnparentedReplacement!({
                    refreshStructure: () => void load({ soft: true }),
                    upsertCard: upsertEmbeddedCard,
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

            {typeof embeddedRightSlot === 'function' ? (
              embeddedRightSlot({
                refreshStructure: () => void load({ soft: true }),
                upsertCard: upsertEmbeddedCard,
                removeCard: removeEmbeddedCard,
              })
            ) : (
              embeddedRightSlot
            )}
          </div>
  );

  return (
    <div className={styles.studioEmbeddedRoot}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading cards...</p> : null}

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
          collisionDetection={collectionsCollisionDetection}
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
                  <option value="qa">Question</option>
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
                  className={`${styles.smallButton} ${styles.primarySmallButton}`}
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
    </div>
  );
}
