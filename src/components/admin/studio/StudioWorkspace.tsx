'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type DragEndEvent } from '@dnd-kit/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import MediaAdminContent from '@/components/admin/studio/media/MediaAdminContent';
import StudioCardEditPane from '@/components/admin/studio/StudioCardEditPane';
import StudioQuestionsPane from '@/components/admin/studio/StudioQuestionsPane';
import MediaEditModal from '@/components/admin/studio/media/MediaEditModal';
import { handleStudioRelationshipDragEnd } from '@/components/admin/studio/studioRelationshipDndPrimitives';
import type {
  StudioActiveCardViewModel,
  StudioCardContext,
  StudioSelectedDetail,
  StudioSelectedLoadState,
  StudioSelectedPreview,
} from '@/components/admin/studio/studioCardTypes';
import {
  StudioShellProvider,
  type StudioShellContextValue,
} from '@/components/admin/studio/StudioShellContext';
import { createStudioShellImperativeRegistry } from '@/components/admin/studio/studioShellImperativeRegistry';
import {
  mergeStudioCatalogCard,
  toStudioSelectedDetail,
  toStudioSelectedPreview,
} from '@/components/admin/studio/studioCardProjection';
import type { CollectionsCardDragData } from '@/lib/dnd/collectionsDragContract';
import type { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Card } from '@/lib/types/card';
import { EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX } from '@/lib/admin/embeddedWideMinWidthPx';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import { deriveCuratedMutationPlan, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { DND_POINTER_IGNORE_ATTR } from '@/lib/hooks/useDefaultDndSensors';
import {
  createStudioPaneWidthPreference,
  DEFAULT_STUDIO_PANE_VISIBILITY,
  DEFAULT_STUDIO_WORKSPACE_LAYOUT_PREFERENCES,
  readStoredStudioWorkspaceLayoutPreferences,
  resolveStudioPaneWidthPreference,
  writeStoredStudioWorkspaceLayoutPreferences,
  type StudioPaneVisibility,
  type StudioWorkspaceLayoutPreferences,
} from '@/lib/preferences/studioWorkspaceLayout';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import cardAdminPageStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import styles from './StudioWorkspace.module.css';

const CARD_EDIT_RESIZE_HANDLE = 8;
const MIN_CARD_EDIT_PX = 220;
const MIN_QUESTIONS_PX = 200;
const MIN_MEDIA_BANK_PX = 180;
/** Default Compose column width (px) when no saved preference; double-click handle resets here. */
const DEFAULT_CARD_EDIT_WIDTH = 357;
const DEFAULT_QUESTIONS_WIDTH = 272;
/** Upper cap so Compose does not grow past a comfortable editing line length even on ultra-wide rows. */
const MAX_CARD_EDIT_WIDTH = 1200;
const MAX_QUESTIONS_WIDTH = 840;
const STUDIO_SELECTED_CARD_CACHE_LIMIT = 12;
const STUDIO_ACTION_INFO_TIMEOUT_MS = 3000;

function removeCardFromCardsCache<T>(cached: T, cardId: string): T {
  if (!cached || typeof cached !== 'object') return cached;

  if (Array.isArray(cached)) {
    return cached.map((entry) => removeCardFromCardsCache(entry, cardId)) as T;
  }

  const candidate = cached as { items?: Array<{ docId?: string }> };
  if (Array.isArray(candidate.items)) {
    return {
      ...(candidate as Record<string, unknown>),
      items: candidate.items.filter((item) => item?.docId !== cardId),
    } as T;
  }

  return cached;
}

function paneHandleCount(opts: { compose: boolean; questions: boolean; media: boolean }): number {
  return Math.max(0, [opts.compose, opts.questions, opts.media].filter(Boolean).length - 1);
}

/** When the row is narrow, still allow dragging within the real range. */
function cardEditWidthBounds(rowW: number, opts: { questions: boolean; media: boolean }): { minEdit: number; maxEdit: number } | null {
  const handleCount = paneHandleCount({ compose: true, questions: opts.questions, media: opts.media });
  const rawMax =
    rowW -
    (opts.questions ? MIN_QUESTIONS_PX : 0) -
    (opts.media ? MIN_MEDIA_BANK_PX : 0) -
    handleCount * CARD_EDIT_RESIZE_HANDLE;
  if (rawMax < 1) return null;
  const maxEdit = Math.min(MAX_CARD_EDIT_WIDTH, rawMax);
  const minEdit = Math.min(MIN_CARD_EDIT_PX, maxEdit);
  return { minEdit, maxEdit };
}

function questionsWidthBounds(
  rowW: number,
  opts: { compose: boolean; media: boolean; composeWidth: number }
): { minQuestions: number; maxQuestions: number } | null {
  const handleCount = paneHandleCount({ compose: opts.compose, questions: true, media: opts.media });
  const rawMax =
    rowW -
    (opts.compose ? opts.composeWidth : 0) -
    (opts.media ? MIN_MEDIA_BANK_PX : 0) -
    handleCount * CARD_EDIT_RESIZE_HANDLE;
  if (rawMax < 1) return null;
  const maxQuestions = Math.min(MAX_QUESTIONS_WIDTH, rawMax);
  const minQuestions = Math.min(MIN_QUESTIONS_PX, maxQuestions);
  return { minQuestions, maxQuestions };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function rowWidthForCardEditResize(row: HTMLElement): number {
  const w = row.getBoundingClientRect().width;
  return w > 0 ? w : row.offsetWidth;
}

function renderedColumnWidth(el: HTMLDivElement | null, fallback: number): number {
  if (!el) return fallback;
  const width = el.getBoundingClientRect().width;
  return width > 0 ? width : fallback;
}

function applyColumnWidth(el: HTMLDivElement | null, width: number, minWidthPx: number) {
  if (!el) return;
  el.style.flex = `0 0 ${width}px`;
  el.style.width = `${width}px`;
  el.style.minWidth = `${minWidthPx}px`;
}

function applyOptimisticSelectedCardPatch(
  card: StudioCardContext,
  payload: Partial<Card>
): StudioCardContext {
  const next: StudioCardContext = {
    ...card,
    ...payload,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'childrenIds')) {
    next.childrenIds = Array.isArray(payload.childrenIds) ? [...payload.childrenIds] : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'galleryMedia')) {
    next.galleryMedia = Array.isArray(payload.galleryMedia)
      ? payload.galleryMedia.map((item) => ({ ...item }))
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'contentMedia')) {
    next.contentMedia = Array.isArray(payload.contentMedia) ? [...payload.contentMedia] : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'coverImageId')) {
    next.coverImageId = payload.coverImageId ?? null;
  }

  next.updatedAt = Date.now();
  return next;
}

function collectAssignedMediaIds(card: Pick<Card, 'coverImageId' | 'galleryMedia' | 'contentMedia'> | null): string[] {
  if (!card) return [];
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  (card.galleryMedia ?? []).forEach((item) => {
    if (item.mediaId) ids.add(item.mediaId);
  });
  (card.contentMedia ?? []).forEach((mediaId) => {
    if (mediaId) ids.add(mediaId);
  });
  return Array.from(ids);
}

function mediaRolesOnCard(card: Pick<Card, 'coverImageId' | 'galleryMedia' | 'contentMedia'> | null, mediaId: string): string[] {
  if (!card || !mediaId) return [];
  const roles: string[] = [];
  if (card.coverImageId === mediaId) roles.push('Cover');
  if ((card.galleryMedia ?? []).some((item) => item.mediaId === mediaId)) roles.push('Gallery');
  if ((card.contentMedia ?? []).includes(mediaId)) roles.push('Content');
  return roles;
}

export default function StudioWorkspace() {
  const feedback = useAppFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCardId = useMemo(() => {
    const raw = searchParams.get('card');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [searchParams]);
  const newCardRequested = useMemo(() => {
    const raw = searchParams.get('new');
    if (!raw) return false;
    return raw === '1' || raw.toLowerCase() === 'true';
  }, [searchParams]);
  const selectionRequestKey = useMemo(
    () => (newCardRequested ? '__new__' : requestedCardId ?? '__none__'),
    [newCardRequested, requestedCardId]
  );
  const [wideLayout, setWideLayout] = useState(true);
  const [cardEditWidth, setCardEditWidth] = useState(DEFAULT_CARD_EDIT_WIDTH);
  const [questionsWidth, setQuestionsWidth] = useState(DEFAULT_QUESTIONS_WIDTH);
  const [paneVisibility, setPaneVisibility] = useState<StudioPaneVisibility>(DEFAULT_STUDIO_PANE_VISIBILITY);
  const [layoutPrefsHydrated, setLayoutPrefsHydrated] = useState(false);
  const cardEditWidthRef = useRef(cardEditWidth);
  const questionsWidthRef = useRef(questionsWidth);
  const studioLayoutPrefsRef = useRef<StudioWorkspaceLayoutPreferences>(
    DEFAULT_STUDIO_WORKSPACE_LAYOUT_PREFERENCES
  );
  const studioMediaCardRowRef = useRef<HTMLDivElement | null>(null);
  const studioRightColumnRef = useRef<HTMLDivElement | null>(null);
  const cardEditColumnRef = useRef<HTMLDivElement | null>(null);
  const questionsColumnRef = useRef<HTMLDivElement | null>(null);
  /** True while dragging card-edit width (skip ResizeObserver clamp). */
  const cardEditResizeActiveRef = useRef(false);
  const cardEditResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const questionsResizeActiveRef = useRef(false);
  const questionsResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const cardEditDragRafRef = useRef<number | null>(null);
  const questionsDragRafRef = useRef<number | null>(null);
  const pendingCardEditWidthRef = useRef<number | null>(null);
  const pendingQuestionsWidthRef = useRef<number | null>(null);
  const collectionsRefreshRef = useRef<(() => void) | null>(null);
  const cardsBankRemoveRef = useRef<((cardId: string) => void) | null>(null);
  const cardsBankDeleteFallbackResolverRef = useRef<((deletedCardId: string) => StudioSelectedPreview | null) | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => requestedCardId);
  const selectedCardIdRef = useRef<string | null>(requestedCardId);
  const [selectedPreview, setSelectedPreview] = useState<StudioSelectedPreview | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<StudioSelectedDetail | null>(null);
  const selectedPreviewRef = useRef<StudioSelectedPreview | null>(null);
  const selectedDetailRef = useRef<StudioSelectedDetail | null>(null);
  const selectedCardCacheRef = useRef(new Map<string, StudioSelectedPreview>());
  const selectedCardCacheOrderRef = useRef<string[]>([]);
  const [selectedLoadState, setSelectedLoadState] = useState<StudioSelectedLoadState>('idle');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const {
    media: bankMediaPage,
    resolveMediaById,
    updateMedia,
    deleteMedia,
    reconcileCardMediaAssignments,
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll: selectAllMediaOnPage,
    selectNone: selectNoneMedia,
  } = useMedia();
  const [cardMediaEditorOpen, setCardMediaEditorOpen] = useState(false);
  const [cardMediaItems, setCardMediaItems] = useState<Media[]>([]);
  const [selectedCardMediaId, setSelectedCardMediaId] = useState<string | null>(null);

  const studioImperatives = useMemo(() => createStudioShellImperativeRegistry(), []);
  const registerBodyMediaInsert = useCallback((handler: ((media: Media) => void) | null) => {
    studioImperatives.register('bodyMediaInsert', handler);
  }, [studioImperatives]);
  const bodyMediaInsertRef = studioImperatives.bodyMediaInsertRef;
  const collectionsUpsertCardRef = useRef<((card: Card) => void) | null>(null);
  const collectionsRemoveCardRef = useRef<((cardId: string) => void) | null>(null);
  const questionCardDeleteSyncRef = useRef<((cardId: string, questionId?: string | null) => void) | null>(null);
  const resolveBankMediaById = useCallback(
    (id: string) => bankMediaPage.find((m) => m.docId === id) ?? resolveMediaById(id),
    [bankMediaPage, resolveMediaById]
  );
  const loadMediaById = useCallback(
    async (mediaId: string): Promise<Media | null> => {
      const cached = resolveBankMediaById(mediaId);
      if (cached) return cached;
      try {
        const response = await fetch(`/api/images/${encodeURIComponent(mediaId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!response.ok) return null;
        const payload = (await response.json().catch(() => ({}))) as { media?: Media };
        return payload.media ?? null;
      } catch {
        return null;
      }
    },
    [resolveBankMediaById]
  );
  const openSelectedCardMediaEditor = useCallback(async (mediaId?: string | null) => {
    const card = selectedDetailRef.current ?? selectedPreviewRef.current;
    const assignedIds = collectAssignedMediaIds(card);
    if (!card?.docId || assignedIds.length === 0) return;
    const loaded = await Promise.all(assignedIds.map((mediaId) => loadMediaById(mediaId)));
    const items = loaded.filter((item): item is Media => Boolean(item?.docId));
    if (items.length === 0) return;
    setCardMediaItems(items);
    setSelectedCardMediaId(() => {
      const preferredId = mediaId?.trim() || null;
      if (preferredId && items.some((item) => item.docId === preferredId)) return preferredId;
      return items[0]!.docId;
    });
    setCardMediaEditorOpen(true);
  }, [loadMediaById]);
  const cacheSelectedCard = useCallback((card: StudioSelectedPreview | StudioSelectedDetail | null) => {
    if (!card?.docId) return;
    selectedCardCacheRef.current.set(card.docId, toStudioSelectedPreview(card));
    selectedCardCacheOrderRef.current = selectedCardCacheOrderRef.current.filter((id) => id !== card.docId);
    selectedCardCacheOrderRef.current.push(card.docId);
    while (selectedCardCacheOrderRef.current.length > STUDIO_SELECTED_CARD_CACHE_LIMIT) {
      const oldestId = selectedCardCacheOrderRef.current.shift();
      if (oldestId) {
        selectedCardCacheRef.current.delete(oldestId);
      }
    }
  }, []);
  const getCachedSelectedCard = useCallback((cardId: string | null) => {
    if (!cardId) return null;
    const cached = selectedCardCacheRef.current.get(cardId) ?? null;
    if (!cached) return null;
    selectedCardCacheOrderRef.current = selectedCardCacheOrderRef.current.filter((id) => id !== cardId);
    selectedCardCacheOrderRef.current.push(cardId);
    return cached;
  }, []);
  const getKnownCardPreview = useCallback(
    (cardId: string | null) => {
      if (!cardId) return null;
      const trimmedId = cardId.trim();
      if (!trimmedId) return null;
      if (selectedDetailRef.current?.docId === trimmedId) {
        return toStudioSelectedPreview(selectedDetailRef.current);
      }
      if (selectedPreviewRef.current?.docId === trimmedId) {
        return selectedPreviewRef.current;
      }
      return getCachedSelectedCard(trimmedId);
    },
    [getCachedSelectedCard]
  );
  const composeLeaveGuardRef = useRef<(() => Promise<boolean>) | null>(null);
  const selectCard = useCallback(
    (cardId: string, previewCard?: Card | StudioSelectedPreview | StudioSelectedDetail | null) => {
      const trimmedId = cardId.trim();
      if (!trimmedId) return;
      const knownPreview = getKnownCardPreview(trimmedId);
      const nextPreview =
        previewCard?.docId === trimmedId
          ? toStudioSelectedPreview(previewCard)
          : knownPreview;
      const sameSelectedCard =
        selectedCardIdRef.current === trimmedId &&
        (selectedDetailRef.current?.docId === trimmedId || selectedPreviewRef.current?.docId === trimmedId);
      if (nextPreview) {
        cacheSelectedCard(nextPreview);
        setSelectedPreview(nextPreview);
      }
      if (sameSelectedCard) {
        return;
      }
      setSelectedCardId(trimmedId);
      setSelectedDetail((current) => (current?.docId === trimmedId ? current : null));
      setSelectedLoadState('loading');
    },
    [cacheSelectedCard, getKnownCardPreview]
  );
  const registerComposeLeaveGuard = useCallback((fn: (() => Promise<boolean>) | null) => {
    composeLeaveGuardRef.current = fn;
  }, []);
  const requestSelectCard = useCallback(
    async (
      cardId: string,
      previewCard?: Card | StudioSelectedPreview | StudioSelectedDetail | null
    ) => {
      const trimmedId = cardId.trim();
      if (!trimmedId) return false;
      if (trimmedId !== selectedCardId && composeLeaveGuardRef.current) {
        const canLeave = await composeLeaveGuardRef.current();
        if (!canLeave) return false;
      }
      selectCard(trimmedId, previewCard);
      return true;
    },
    [selectCard, selectedCardId]
  );

  useEffect(() => {
    selectedCardIdRef.current = selectedCardId;
  }, [selectedCardId]);

  useEffect(() => {
    selectNoneMedia();
  }, [selectedCardId, selectNoneMedia]);

  useEffect(() => {
    setCardMediaEditorOpen(false);
    setCardMediaItems([]);
    setSelectedCardMediaId(null);
  }, [selectedCardId]);

  useEffect(() => {
    if (!actionInfo || actionBusy) return;
    const timeoutId = window.setTimeout(() => {
      setActionInfo((current) => (current === actionInfo ? null : current));
    }, STUDIO_ACTION_INFO_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [actionBusy, actionInfo]);

  useEffect(() => {
    if (selectionRequestKey === '__new__') {
      setSelectedCardId(null);
      return;
    }
    if (selectionRequestKey === '__none__') return;
    setSelectedCardId((current) => (current === selectionRequestKey ? current : selectionRequestKey));
  }, [selectionRequestKey]);

  useEffect(() => {
    cacheSelectedCard(selectedPreview);
  }, [cacheSelectedCard, selectedPreview]);

  useEffect(() => {
    cacheSelectedCard(selectedDetail);
  }, [cacheSelectedCard, selectedDetail]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX}px)`);
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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

  cardEditWidthRef.current = cardEditWidth;
  questionsWidthRef.current = questionsWidth;
  selectedPreviewRef.current = selectedPreview;
  selectedDetailRef.current = selectedDetail;

  const scheduleLiveCardEditWidth = useCallback((next: number) => {
    pendingCardEditWidthRef.current = next;
    applyColumnWidth(cardEditColumnRef.current, next, MIN_CARD_EDIT_PX);
  }, []);
  const scheduleLiveQuestionsWidth = useCallback((next: number) => {
    pendingQuestionsWidthRef.current = next;
    applyColumnWidth(questionsColumnRef.current, next, MIN_QUESTIONS_PX);
  }, []);

  const persistStudioLayoutPrefs = useCallback(
    (apply: (current: StudioWorkspaceLayoutPreferences) => StudioWorkspaceLayoutPreferences) => {
      const next = apply(studioLayoutPrefsRef.current);
      studioLayoutPrefsRef.current = next;
      writeStoredStudioWorkspaceLayoutPreferences(next);
    },
    []
  );

  const persistStudioPaneWidth = useCallback(
    (pane: 'composeWidth' | 'questionsWidth', width: number) => {
      const rowWidth = studioMediaCardRowRef.current ? rowWidthForCardEditResize(studioMediaCardRowRef.current) : 0;
      const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
      persistStudioLayoutPrefs((current) => ({
        ...current,
        [pane]: createStudioPaneWidthPreference(width, { rowWidth, viewportWidth }),
      }));
    },
    [persistStudioLayoutPrefs]
  );

  useEffect(() => {
    const stored = readStoredStudioWorkspaceLayoutPreferences();
    studioLayoutPrefsRef.current = stored;
    setPaneVisibility(stored.paneVisibility);
    if (stored.composeWidth?.px != null) {
      setCardEditWidth(clamp(stored.composeWidth.px, MIN_CARD_EDIT_PX, MAX_CARD_EDIT_WIDTH));
    }
    if (stored.questionsWidth?.px != null) {
      setQuestionsWidth(clamp(stored.questionsWidth.px, MIN_QUESTIONS_PX, MAX_QUESTIONS_WIDTH));
    }
    setLayoutPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!layoutPrefsHydrated) return;
    persistStudioLayoutPrefs((current) => ({
      ...current,
      paneVisibility,
    }));
  }, [layoutPrefsHydrated, paneVisibility, persistStudioLayoutPrefs]);

  const togglePane = useCallback((pane: keyof StudioPaneVisibility) => {
    setPaneVisibility((current) => ({
      ...current,
      [pane]: !current[pane],
    }));
  }, []);

  const resizableWorkspaceLayout =
    Number(!paneVisibility.composeCollapsed) +
      Number(!paneVisibility.questionsCollapsed) +
      Number(!paneVisibility.mediaCollapsed) >
    1;
  const embeddedRightSlotMinWidth = useMemo(() => {
    const visiblePaneMins = [
      !paneVisibility.composeCollapsed ? MIN_CARD_EDIT_PX : 0,
      !paneVisibility.questionsCollapsed ? MIN_QUESTIONS_PX : 0,
      !paneVisibility.mediaCollapsed ? MIN_MEDIA_BANK_PX : 0,
    ].filter((width) => width > 0);
    const handleCount = Math.max(0, visiblePaneMins.length - 1);
    const requiredWidth = visiblePaneMins.reduce((sum, width) => sum + width, 0) + handleCount * CARD_EDIT_RESIZE_HANDLE;
    return Math.max(MIN_MEDIA_BANK_PX, requiredWidth);
  }, [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed]);

  const clampCardEditToRow = useCallback(() => {
    if (
      cardEditResizeActiveRef.current ||
      questionsResizeActiveRef.current ||
      paneVisibility.composeCollapsed ||
      (paneVisibility.questionsCollapsed && paneVisibility.mediaCollapsed) ||
      !resizableWorkspaceLayout
    ) {
      return;
    }
    const row = studioMediaCardRowRef.current;
    if (!row) return;
    const rowW = rowWidthForCardEditResize(row);
    const viewportWidth = typeof window === 'undefined' ? rowW : window.innerWidth;
    const savedPrefs = studioLayoutPrefsRef.current;
    const showQuestions = !paneVisibility.questionsCollapsed;
    const showMedia = !paneVisibility.mediaCollapsed;
    const cardBounds = cardEditWidthBounds(rowW, { questions: showQuestions, media: showMedia });
    const nextCardWidth = cardBounds
      ? resolveStudioPaneWidthPreference(savedPrefs.composeWidth, {
          rowWidth: rowW,
          viewportWidth,
          minPx: cardBounds.minEdit,
          maxPx: cardBounds.maxEdit,
          fallbackPx: cardEditWidthRef.current,
        })
      : cardEditWidthRef.current;
    if (cardBounds) {
      setCardEditWidth(nextCardWidth);
    }
    if (showQuestions) {
      const questionBounds = questionsWidthBounds(rowW, {
        compose: !paneVisibility.composeCollapsed,
        media: showMedia,
        composeWidth: nextCardWidth,
      });
      if (questionBounds) {
        setQuestionsWidth(
          resolveStudioPaneWidthPreference(savedPrefs.questionsWidth, {
            rowWidth: rowW,
            viewportWidth,
            minPx: questionBounds.minQuestions,
            maxPx: questionBounds.maxQuestions,
            fallbackPx: questionsWidthRef.current,
          })
        );
      }
    }
  }, [
    paneVisibility.composeCollapsed,
    paneVisibility.mediaCollapsed,
    paneVisibility.questionsCollapsed,
    resizableWorkspaceLayout,
  ]);

  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);

  const bindStudioMediaCardRowRef = useCallback(
    (el: HTMLDivElement | null) => {
      studioMediaCardRowRef.current = el;
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
      if (!el || !resizableWorkspaceLayout) return;
      const ro = new ResizeObserver(() => {
        clampCardEditToRow();
      });
      ro.observe(el);
      rowResizeObserverRef.current = ro;
      queueMicrotask(() => {
        clampCardEditToRow();
      });
    },
    [clampCardEditToRow, resizableWorkspaceLayout]
  );

  useEffect(() => {
    return () => {
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
      if (cardEditDragRafRef.current != null) {
        window.cancelAnimationFrame(cardEditDragRafRef.current);
        cardEditDragRafRef.current = null;
      }
      if (questionsDragRafRef.current != null) {
        window.cancelAnimationFrame(questionsDragRafRef.current);
        questionsDragRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener('resize', clampCardEditToRow);
    return () => window.removeEventListener('resize', clampCardEditToRow);
  }, [clampCardEditToRow]);

  useEffect(() => {
    if (!layoutPrefsHydrated) return;
    clampCardEditToRow();
  }, [clampCardEditToRow, layoutPrefsHydrated]);

  const onCardEditResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!resizableWorkspaceLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      cardEditResizeActiveRef.current = true;
      cardEditResizeSessionRef.current = {
        startX: e.clientX,
        startW: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
        pointerId: e.pointerId,
      };

      const onMove = (ev: PointerEvent) => {
        const session = cardEditResizeSessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        const row = studioMediaCardRowRef.current;
        if (!row) return;
        const bounds = cardEditWidthBounds(rowWidthForCardEditResize(row), {
          questions: !paneVisibility.questionsCollapsed,
          media: !paneVisibility.mediaCollapsed,
        });
        if (!bounds) return;
        const dx = ev.clientX - session.startX;
        // Handle is left of Compose: drag left → wider Compose; drag right → narrower (invert raw dx).
        const next = clamp(session.startW + dx, bounds.minEdit, bounds.maxEdit);
        scheduleLiveCardEditWidth(next);
      };

      const end = (ev: PointerEvent) => {
        const session = cardEditResizeSessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        try {
          target.releasePointerCapture(session.pointerId);
        } catch {
          /* ignore if already released */
        }
        cardEditResizeActiveRef.current = false;
        cardEditResizeSessionRef.current = null;
        const committedWidth =
          pendingCardEditWidthRef.current ??
          renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current);
        setCardEditWidth(committedWidth);
        pendingCardEditWidthRef.current = null;
        if (cardEditDragRafRef.current != null) {
          window.cancelAnimationFrame(cardEditDragRafRef.current);
          cardEditDragRafRef.current = null;
        }
        try {
          persistStudioPaneWidth('composeWidth', committedWidth);
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [
      paneVisibility.mediaCollapsed,
      paneVisibility.questionsCollapsed,
      persistStudioPaneWidth,
      resizableWorkspaceLayout,
      scheduleLiveCardEditWidth,
    ]
  );

  const onCardEditResizeDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!resizableWorkspaceLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const row = studioMediaCardRowRef.current;
      if (!row) return;
      const bounds = cardEditWidthBounds(rowWidthForCardEditResize(row), {
        questions: !paneVisibility.questionsCollapsed,
        media: !paneVisibility.mediaCollapsed,
      });
      if (!bounds) return;
      const next = clamp(DEFAULT_CARD_EDIT_WIDTH, bounds.minEdit, bounds.maxEdit);
      setCardEditWidth(next);
      pendingCardEditWidthRef.current = null;
      applyColumnWidth(cardEditColumnRef.current, next, MIN_CARD_EDIT_PX);
      persistStudioPaneWidth('composeWidth', next);
    },
    [paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed, persistStudioPaneWidth, resizableWorkspaceLayout]
  );

  const onQuestionsResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!resizableWorkspaceLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      questionsResizeActiveRef.current = true;
      questionsResizeSessionRef.current = {
        startX: e.clientX,
        startW: renderedColumnWidth(questionsColumnRef.current, questionsWidthRef.current),
        pointerId: e.pointerId,
      };

      const onMove = (ev: PointerEvent) => {
        const session = questionsResizeSessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        const row = studioMediaCardRowRef.current;
        if (!row) return;
        const bounds = questionsWidthBounds(rowWidthForCardEditResize(row), {
          compose: !paneVisibility.composeCollapsed,
          media: !paneVisibility.mediaCollapsed,
          composeWidth: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
        });
        if (!bounds) return;
        const dx = ev.clientX - session.startX;
        const next = clamp(session.startW + dx, bounds.minQuestions, bounds.maxQuestions);
        scheduleLiveQuestionsWidth(next);
      };

      const end = (ev: PointerEvent) => {
        const session = questionsResizeSessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        try {
          target.releasePointerCapture(session.pointerId);
        } catch {
          /* ignore if already released */
        }
        questionsResizeActiveRef.current = false;
        questionsResizeSessionRef.current = null;
        const committedWidth =
          pendingQuestionsWidthRef.current ??
          renderedColumnWidth(questionsColumnRef.current, questionsWidthRef.current);
        setQuestionsWidth(committedWidth);
        pendingQuestionsWidthRef.current = null;
        if (questionsDragRafRef.current != null) {
          window.cancelAnimationFrame(questionsDragRafRef.current);
          questionsDragRafRef.current = null;
        }
        try {
          persistStudioPaneWidth('questionsWidth', committedWidth);
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [
      paneVisibility.composeCollapsed,
      paneVisibility.mediaCollapsed,
      persistStudioPaneWidth,
      resizableWorkspaceLayout,
      scheduleLiveQuestionsWidth,
    ]
  );

  const onQuestionsResizeDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!resizableWorkspaceLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const row = studioMediaCardRowRef.current;
      if (!row) return;
      const bounds = questionsWidthBounds(rowWidthForCardEditResize(row), {
        compose: !paneVisibility.composeCollapsed,
        media: !paneVisibility.mediaCollapsed,
        composeWidth: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
      });
      if (!bounds) return;
      const next = clamp(DEFAULT_QUESTIONS_WIDTH, bounds.minQuestions, bounds.maxQuestions);
      setQuestionsWidth(next);
      pendingQuestionsWidthRef.current = null;
      applyColumnWidth(questionsColumnRef.current, next, MIN_QUESTIONS_PX);
      persistStudioPaneWidth('questionsWidth', next);
    },
    [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, persistStudioPaneWidth, resizableWorkspaceLayout]
  );

  const loadSelectedCard = useCallback(async (cardId: string, opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setCardLoading(true);
    setCardError(null);
    setSelectedLoadState('loading');
    const id = cardId.trim();
    // Studio reads `selectedCard.childrenIds` (IDs only, free with parent fetch)
    // but never the hydrated `children` array. Skip child hydration entirely —
    // saves up to 100 child Firestore reads + media hydrations per card click.
    const res = await fetch(`/api/cards/${encodeURIComponent(id)}?children=skip`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {
        message: `Could not parse API response (HTTP ${res.status}). ${raw.slice(0, 160)}${raw.length > 160 ? '…' : ''}`,
      };
    }
    throwIfJsonApiFailed(res, data, 'Failed to load card');
    const card = toStudioSelectedDetail(data as StudioCardContext);
    setSelectedDetail(card);
    setSelectedPreview((current) =>
      current?.docId === card.docId
        ? mergeStudioCatalogCard(current, card)
        : toStudioSelectedPreview(card)
    );
    setSelectedLoadState('ready');
    if (!opts?.quiet) setCardLoading(false);
    return card;
  }, []);

  useEffect(() => {
    if (!selectedCardId) {
      setSelectedPreview(null);
      setSelectedDetail(null);
      setCardError(null);
      setCardLoading(false);
      setSelectedLoadState('idle');
      return;
    }
    let cancelled = false;
    const cachedSelectedCard = getCachedSelectedCard(selectedCardId);
    if (cachedSelectedCard && selectedPreviewRef.current?.docId !== selectedCardId) {
      setSelectedPreview(cachedSelectedCard);
    }
    const hasUsablePreview =
      selectedPreviewRef.current?.docId === selectedCardId ||
      selectedDetailRef.current?.docId === selectedCardId ||
      Boolean(cachedSelectedCard);
    setCardError(null);
    setCardLoading(true);
    const run = async () => {
      try {
        await loadSelectedCard(selectedCardId, { quiet: hasUsablePreview });
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load selected card context.';
          const notFound = /not found/i.test(message);
          if (notFound) {
            setSelectedCardId(null);
            setSelectedPreview(null);
            setSelectedDetail(null);
            setCardError(null);
            setSelectedLoadState('idle');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/admin/studio');
            }
            return;
          }
          setCardError(message);
          setSelectedLoadState(hasUsablePreview ? 'degraded' : 'error');
        }
      } finally {
        if (!cancelled) setCardLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [getCachedSelectedCard, selectedCardId, loadSelectedCard]);

  const patchSelectedCard = useCallback(
    async (payload: Partial<Card>, successMessage?: string) => {
      if (!selectedCardId) return;
      setActionBusy(true);
      setActionError(null);
      const previousDetail = selectedDetail;
      const previousPreview = selectedPreview;
      if (selectedDetail?.docId === selectedCardId) {
        const optimisticCard = applyOptimisticSelectedCardPatch(selectedDetail, payload);
        cacheSelectedCard(optimisticCard);
        setSelectedDetail(optimisticCard);
        setSelectedPreview((current) =>
          current?.docId === optimisticCard.docId
            ? mergeStudioCatalogCard(current, optimisticCard)
            : toStudioSelectedPreview(optimisticCard)
        );
      }
      try {
        const res = await fetch(`/api/cards/${selectedCardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        throwIfJsonApiFailed(res, data, 'Update failed.');
        const nextCard = toStudioSelectedDetail(data as StudioCardContext);
        const previousAssigned = previousDetail ? collectAssignedMediaIds(previousDetail) : [];
        const nextAssigned = collectAssignedMediaIds(nextCard);
        const addedAssigned = nextAssigned.filter((id) => !previousAssigned.includes(id));
        const removedAssigned = previousAssigned.filter((id) => !nextAssigned.includes(id));
        if (addedAssigned.length > 0 || removedAssigned.length > 0) {
          reconcileCardMediaAssignments(selectedCardId, addedAssigned, removedAssigned);
        }
        cacheSelectedCard(nextCard);
        setSelectedDetail(nextCard);
        setSelectedPreview((current) =>
          current?.docId === nextCard.docId
            ? mergeStudioCatalogCard(current, nextCard)
            : toStudioSelectedPreview(nextCard)
        );
        setSelectedLoadState('ready');
        collectionsUpsertCardRef.current?.(nextCard);
        // Always refresh strip: omitting a message must clear stale text (e.g. old cover-drag copy).
        setActionInfo(successMessage ?? null);
      } catch (e) {
        if (previousDetail?.docId === selectedCardId) {
          cacheSelectedCard(previousDetail);
          setSelectedDetail(previousDetail);
        }
        if (previousPreview?.docId === selectedCardId) setSelectedPreview(previousPreview);
        setActionError(e instanceof Error ? e.message : 'Update failed.');
        setActionInfo(null);
      } finally {
        setActionBusy(false);
      }
    },
    [cacheSelectedCard, reconcileCardMediaAssignments, selectedDetail, selectedPreview, selectedCardId]
  );

  const activeCardViewModel = useMemo<StudioActiveCardViewModel>(() => {
    if (selectedLoadState === 'idle' && !selectedCardId && !selectedPreview && !selectedDetail) {
      return {
        status: 'empty',
        card: null,
        preview: null,
        detail: null,
        error: null,
      };
    }
    if (selectedDetail) {
      return {
        status: selectedLoadState === 'degraded' ? 'degraded' : 'hydrated',
        card: selectedDetail,
        preview: selectedPreview,
        detail: selectedDetail,
        error: cardError,
      };
    }
    if (selectedPreview) {
      return {
        status: selectedLoadState === 'degraded' ? 'degraded' : 'preview',
        card: selectedPreview,
        preview: selectedPreview,
        detail: null,
        error: cardError,
      };
    }
    return {
      status: selectedLoadState === 'error' ? 'error' : 'empty',
      card: null,
      preview: null,
      detail: null,
      error: cardError,
    };
  }, [cardError, selectedCardId, selectedDetail, selectedLoadState, selectedPreview]);

  const bridgeCollectionsCardToSelectedParent = useCallback(
    async ({
      childId,
      parentId,
      dragData,
    }: {
      childId: string;
      parentId: string;
      dragData: CollectionsCardDragData | null;
    }): Promise<boolean> => {
      if (!childId || !parentId || parentId !== selectedCardId || actionBusy) return false;

      const steps = deriveCuratedMutationPlan({
        childId,
        intent: { kind: 'parent', parentId },
        source: dragData ?? undefined,
        rootedCollectionIds: [],
      });
      if (steps.length === 0) {
        setActionError(null);
        setActionInfo('No change.');
        return true;
      }

      setActionBusy(true);
      setActionError(null);
      setActionInfo(null);
      try {
        for (const step of steps) {
          switch (step.kind) {
            case 'detach-parent': {
              const parentFresh = await fetchAdminCardSnapshot(step.parentId);
              const nextChildren = normalizeCuratedChildIds(parentFresh.childrenIds).filter((id) => id !== step.childId);
              const res = await fetch(`/api/cards/${step.parentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childrenIds: nextChildren }),
              });
              const data = await res.json().catch(() => ({}));
              throwIfJsonApiFailed(res, data, 'Failed to update collection membership');
              break;
            }
            case 'append-parent': {
              const parentFresh = await fetchAdminCardSnapshot(step.parentId);
              const nextChildren = Array.from(new Set([...normalizeCuratedChildIds(parentFresh.childrenIds), step.childId]));
              const res = await fetch(`/api/cards/${step.parentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childrenIds: nextChildren }),
              });
              const data = await res.json().catch(() => ({}));
              throwIfJsonApiFailed(res, data, 'Failed to update collection membership');
              break;
            }
            case 'clear-root': {
              const res = await fetch(`/api/cards/${step.cardId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCollectionRoot: false }),
              });
              const data = await res.json().catch(() => ({}));
              throwIfJsonApiFailed(res, data, 'Failed to update collection membership');
              break;
            }
            case 'insert-before':
            case 'set-root':
              break;
          }
        }

        await loadSelectedCard(parentId, { quiet: true });
        collectionsRefreshRef.current?.();
        setActionInfo('Child attached.');
        return true;
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to update collection membership');
        setActionInfo(null);
        return true;
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, loadSelectedCard, selectedCardId]
  );

  const onStudioRelationshipDragEnd = useCallback(
    async (event: DragEndEvent, resolvedOverId?: string | null) => {
      return handleStudioRelationshipDragEnd(event, resolvedOverId, {
        actionBusy,
        selectedCardDetail: selectedDetail,
        selectedCardId,
        patchSelectedCard,
        bridgeCollectionsCardToSelectedParent,
        resolveBankMediaById,
        bodyMediaInsertRef,
        showToast: feedback.showToast,
        showSuccess: feedback.showSuccess,
        showError: feedback.showError,
      });
    },
    [actionBusy, bridgeCollectionsCardToSelectedParent, feedback, selectedCardId, selectedDetail, patchSelectedCard, resolveBankMediaById]
  );

  const refreshCollectionsStructure = useCallback(() => {
    collectionsRefreshRef.current?.();
  }, []);
  const upsertCollectionsCardList = useCallback((card: Card | StudioCardContext | null) => {
    if (!card?.docId) return;
    collectionsUpsertCardRef.current?.(card as Card);
  }, []);
  const removeCollectionsCardStructure = useCallback((cardId: string) => {
    collectionsRemoveCardRef.current?.(cardId);
  }, []);
  const notifyQuestionCardDeleted = useCallback((cardId: string, questionId?: string | null) => {
    questionCardDeleteSyncRef.current?.(cardId, questionId);
  }, []);
  const registerQuestionCardDeleteSync = useCallback(
    (fn: ((cardId: string, questionId?: string | null) => void) | null) => {
      questionCardDeleteSyncRef.current = fn;
    },
    []
  );
  const deleteSelectedCard = useCallback(
    async (cardId: string) => {
      const id = cardId.trim();
      if (!id) return false;
      setActionBusy(true);
      setActionError(null);
      setActionInfo(null);
      try {
        const deletedQuestionId =
          (selectedDetailRef.current?.docId === id ? selectedDetailRef.current.questionId : null) ??
          (selectedPreviewRef.current?.docId === id ? selectedPreviewRef.current.questionId : null) ??
          null;
        const fallbackCard =
          selectedCardId === id ? cardsBankDeleteFallbackResolverRef.current?.(id) ?? null : null;
        const res = await fetch(`/api/cards/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
        throwIfJsonApiFailed(res, data, 'Failed to delete card');

        selectedCardCacheRef.current.delete(id);
        selectedCardCacheOrderRef.current = selectedCardCacheOrderRef.current.filter((entryId) => entryId !== id);
        cardsBankRemoveRef.current?.(id);
        removeCollectionsCardStructure(id);
        if (selectedCardId === id) {
          if (fallbackCard?.docId && fallbackCard.docId !== id) {
            selectCard(fallbackCard.docId, fallbackCard);
          } else {
            setSelectedCardId(null);
            setSelectedPreview(null);
            setSelectedDetail(null);
            setSelectedLoadState('idle');
          }
        } else {
          setSelectedCardId((current) => (current === id ? null : current));
          setSelectedPreview((current) => (current?.docId === id ? null : current));
          setSelectedDetail((current) => (current?.docId === id ? null : current));
        }
        setCardError(null);
        setCardLoading(false);
        selectNoneMedia();
        notifyQuestionCardDeleted(id, deletedQuestionId);
        void globalMutate(
          (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
          (current) => removeCardFromCardsCache(current, id),
          { revalidate: true }
        );
        router.replace('/admin/studio');
        setActionInfo('Card deleted.');
        return true;
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to delete card.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [notifyQuestionCardDeleted, removeCollectionsCardStructure, router, selectCard, selectNoneMedia, selectedCardId]
  );
  const hasSelectedCardMedia = useMemo(
    () => collectAssignedMediaIds(selectedDetail ?? selectedPreview).length > 0,
    [selectedDetail, selectedPreview]
  );

  const studioShellValue = useMemo<StudioShellContextValue>(
    () => ({
      selectedCardId,
      setSelectedCardId,
      selectCard,
      requestSelectCard,
      registerComposeLeaveGuard,
      getKnownCardPreview,
      selectedPreview,
      setSelectedPreview,
      selectedDetail,
      setSelectedDetail,
      selectedLoadState,
      activeCardViewModel,
      cardLoading,
      cardError,
      loadSelectedCard,
      patchSelectedCard,
      deleteSelectedCard,
      refreshCollectionsStructure,
      upsertCollectionsCardList,
      removeCollectionsCardStructure,
      notifyQuestionCardDeleted,
      registerQuestionCardDeleteSync,
      selectedMediaIds,
      setSelectedMediaIds,
      toggleMediaSelection,
      selectAllMediaOnPage,
      selectNoneMedia,
      hasSelectedCardMedia,
      openSelectedCardMediaEditor,
      registerBodyMediaInsert,
      bodyMediaInsertRef,
    }),
    [
      selectedCardId,
      setSelectedCardId,
      selectCard,
      requestSelectCard,
      registerComposeLeaveGuard,
      getKnownCardPreview,
      selectedPreview,
      setSelectedPreview,
      selectedDetail,
      setSelectedDetail,
      selectedLoadState,
      activeCardViewModel,
      cardLoading,
      cardError,
      loadSelectedCard,
      patchSelectedCard,
      deleteSelectedCard,
      refreshCollectionsStructure,
      upsertCollectionsCardList,
      removeCollectionsCardStructure,
      notifyQuestionCardDeleted,
      registerQuestionCardDeleteSync,
      selectedMediaIds,
      setSelectedMediaIds,
      toggleMediaSelection,
      selectAllMediaOnPage,
      selectNoneMedia,
      hasSelectedCardMedia,
      openSelectedCardMediaEditor,
      registerBodyMediaInsert,
      bodyMediaInsertRef,
    ]
  );

  return (
    <StudioShellProvider value={studioShellValue}>
      <div className={styles.page}>
        <div className={cardAdminPageStyles.stickyTop}>
          <div className={styles.studioHeaderRow}>
            <h1 className={`${cardAdminPageStyles.title} ${styles.studioPageTitle}`}>Content Studio</h1>
            <div className={styles.studioPaneToolbar} aria-label="Studio panes">
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.organizationCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.organizationCollapsed}
                onClick={() => togglePane('organizationCollapsed')}
              >
                Organize
              </button>
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.cardsCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.cardsCollapsed}
                onClick={() => togglePane('cardsCollapsed')}
              >
                Cards
              </button>
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.composeCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.composeCollapsed}
                onClick={() => togglePane('composeCollapsed')}
              >
                Compose
              </button>
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.questionsCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.questionsCollapsed}
                onClick={() => togglePane('questionsCollapsed')}
              >
                Questions
              </button>
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.mediaCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.mediaCollapsed}
                onClick={() => togglePane('mediaCollapsed')}
              >
                Media
              </button>
            </div>
          </div>
        </div>
        <div className={wideLayout ? styles.grid : styles.gridStacked}>
          <div className={styles.collectionsHost}>
              <CollectionsAdminClient
              onSelectCard={requestSelectCard}
              selectedCardIdExternal={selectedCardId}
              embeddedExternalDragEnd={onStudioRelationshipDragEnd}
              embeddedOnStudioParentAttachComplete={(parentId) => {
                if (selectedCardId === parentId) {
                  void loadSelectedCard(parentId, { quiet: true });
                  return;
                }
                void requestSelectCard(parentId);
              }}
              embeddedOrganizationCollapsed={paneVisibility.organizationCollapsed}
              embeddedCardsCollapsed={paneVisibility.cardsCollapsed}
              embeddedRightSlotMinWidth={embeddedRightSlotMinWidth}
              embeddedUnparentedReplacement={(ctx) => (
                  <StudioTreeCandidateCardBank
                    {...ctx}
                    autoSelectFirstCard={!newCardRequested}
                    registerCatalogRemove={(fn) => {
                      cardsBankRemoveRef.current = fn;
                    }}
                    registerDeleteFallbackResolver={(fn) => {
                      cardsBankDeleteFallbackResolverRef.current = fn;
                    }}
                  />
                )}
              embeddedRightSlot={({ refreshStructure, upsertCard, removeCard }) => {
                collectionsRefreshRef.current = refreshStructure;
                collectionsUpsertCardRef.current = upsertCard;
                collectionsRemoveCardRef.current = removeCard;
                const showComposePane = !paneVisibility.composeCollapsed;
                const showQuestionsPane = !paneVisibility.questionsCollapsed;
                const showMediaPane = !paneVisibility.mediaCollapsed;
                return (
                  <div ref={studioRightColumnRef} className={styles.studioRightColumn}>
                    {actionInfo || actionError ? (
                      <div className={styles.studioActionStrip}>
                        {actionInfo ? (
                          <p className={styles.metaInfo} role="status" aria-live="polite">
                            {actionInfo}
                          </p>
                        ) : null}
                        {actionError ? (
                          <p className={styles.metaError} role="alert">
                            {actionError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div
                      ref={bindStudioMediaCardRowRef}
                      className={
                        resizableWorkspaceLayout
                          ? `${styles.studioMediaCardRow} ${styles.studioMediaCardRowResizable}`
                          : styles.studioMediaCardRow
                      }
                    >
                        {showComposePane ? (
                          <div
                            ref={cardEditColumnRef}
                            className={styles.studioCardEditInBankColumn}
                            style={
                              resizableWorkspaceLayout && (showQuestionsPane || showMediaPane)
                                ? {
                                    flex: `0 0 ${cardEditWidth}px`,
                                    width: cardEditWidth,
                                    minWidth: MIN_CARD_EDIT_PX,
                                  }
                                : {
                                    flex: '1 1 auto',
                                    width: 'auto',
                                    minWidth: 0,
                                  }
                            }
                          >
                            <StudioCardEditPane
                              newCardRequested={newCardRequested && !selectedCardId}
                              onCardCreated={setSelectedCardId}
                            />
                          </div>
                        ) : null}
                        {resizableWorkspaceLayout && showComposePane && (showQuestionsPane || showMediaPane) ? (
                          <div
                            className={`${styles.resizeHandle} ${styles.cardEditColumnResizeHandle}`}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize Compose and workspace columns"
                            title="Drag to resize Compose and workspace. Double-click to reset width."
                            {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
                            onPointerDown={onCardEditResizePointerDown}
                            onDoubleClick={onCardEditResizeDoubleClick}
                          />
                        ) : null}
                        {showQuestionsPane ? (
                          <div
                            ref={questionsColumnRef}
                            className={styles.studioQuestionsColumn}
                            style={
                              resizableWorkspaceLayout && showMediaPane
                                ? {
                                    flex: `0 0 ${questionsWidth}px`,
                                    width: questionsWidth,
                                    minWidth: MIN_QUESTIONS_PX,
                                  }
                                : {
                                    flex: '1 1 auto',
                                    width: 'auto',
                                    minWidth: 0,
                                  }
                            }
                          >
                            <StudioQuestionsPane />
                          </div>
                        ) : null}
                        {resizableWorkspaceLayout && showQuestionsPane && showMediaPane ? (
                          <div
                            className={`${styles.resizeHandle} ${styles.questionsColumnResizeHandle}`}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize Questions and Media columns"
                            title="Drag to resize Questions and Media. Double-click to reset width."
                            {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
                            onPointerDown={onQuestionsResizePointerDown}
                            onDoubleClick={onQuestionsResizeDoubleClick}
                          />
                        ) : null}
                        {showMediaPane ? (
                          <div className={styles.studioMediaBankColumn}>
                            <div className={styles.studioMediaBankFill}>
                              <MediaAdminContent embedded studioSourceDraggable />
                            </div>
                          </div>
                        ) : null}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>
      <MediaEditModal
        isOpen={cardMediaEditorOpen}
        mediaItems={cardMediaItems}
        selectedMediaId={selectedCardMediaId}
        onSelectMedia={setSelectedCardMediaId}
        onClose={() => setCardMediaEditorOpen(false)}
        currentCardContext={
          selectedCardMediaId && (selectedDetail ?? selectedPreview)?.docId
            ? {
                cardId: (selectedDetail ?? selectedPreview)!.docId!,
                cardTitle:
                  (selectedDetail ?? selectedPreview)!.title?.trim() ||
                  (selectedDetail ?? selectedPreview)!.subtitle?.trim() ||
                  'Current card',
                roles: mediaRolesOnCard(selectedDetail ?? selectedPreview, selectedCardMediaId),
              }
            : null
        }
        onSaveMediaFields={async (mediaId, updates) => {
          const updated = await updateMedia(mediaId, updates);
          if (!updated) {
            throw new Error('Media update failed. Please retry.');
          }
          if (updated) {
            setCardMediaItems((current) => current.map((item) => (item.docId === updated.docId ? updated : item)));
          }
          if (selectedCardId) {
            void loadSelectedCard(selectedCardId, { quiet: true });
          }
        }}
        onMediaUpdated={(media) => {
          setCardMediaItems((current) =>
            current.map((item) => (item.docId === media.docId ? media : item))
          );
          if (selectedCardId) {
            void loadSelectedCard(selectedCardId, { quiet: true });
          }
        }}
        onDeleteMedia={async (mediaId) => {
          await deleteMedia(mediaId);
          const remaining = cardMediaItems.filter((item) => item.docId !== mediaId);
          setCardMediaItems(remaining);
          setSelectedCardMediaId(remaining[0]?.docId ?? null);
          if (remaining.length === 0) {
            setCardMediaEditorOpen(false);
          }
          if (selectedCardId) {
            void loadSelectedCard(selectedCardId, { quiet: true });
          }
        }}
      />
    </StudioShellProvider>
  );
}
