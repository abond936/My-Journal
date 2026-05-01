'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useSearchParams } from 'next/navigation';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import MediaAdminContent from '@/app/admin/media-admin/MediaAdminContent';
import StudioCardEditPane from '@/components/admin/studio/StudioCardEditPane';
import StudioQuestionsPane from '@/components/admin/studio/StudioQuestionsPane';
import { handleStudioRelationshipDragEnd } from '@/components/admin/studio/studioRelationshipDndPrimitives';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';
import {
  StudioShellProvider,
  type StudioShellContextValue,
} from '@/components/admin/studio/StudioShellContext';
import type { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Card } from '@/lib/types/card';
import { EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX } from '@/lib/admin/embeddedWideMinWidthPx';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { DND_POINTER_IGNORE_ATTR } from '@/lib/hooks/useDefaultDndSensors';
import cardAdminPageStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './StudioWorkspace.module.css';

const STUDIO_CARD_EDIT_WIDTH_KEY = 'studioCardEditPaneWidth';
const STUDIO_QUESTIONS_WIDTH_KEY = 'studioQuestionsPaneWidth';
const STUDIO_PANE_VISIBILITY_KEY = 'studioPaneVisibility';
const CARD_EDIT_RESIZE_HANDLE = 8;
const MIN_CARD_EDIT_PX = 260;
const MIN_QUESTIONS_PX = 240;
const MIN_MEDIA_BANK_PX = 200;
/** Default Compose column width (px) when no saved preference; double-click handle resets here. */
const DEFAULT_CARD_EDIT_WIDTH = 480;
const DEFAULT_QUESTIONS_WIDTH = 320;
/** Upper cap so Compose does not grow past a comfortable editing line length even on ultra-wide rows. */
const MAX_CARD_EDIT_WIDTH = 1200;
const MAX_QUESTIONS_WIDTH = 620;
const STUDIO_SELECTED_CARD_CACHE_LIMIT = 12;

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
function readStoredCardEditWidth(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STUDIO_CARD_EDIT_WIDTH_KEY);
    if (!raw) return null;
    const w = Number.parseInt(raw, 10);
    return Number.isFinite(w) ? w : null;
  } catch {
    return null;
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function rowWidthForCardEditResize(row: HTMLElement): number {
  const w = row.getBoundingClientRect().width;
  return w > 0 ? w : row.offsetWidth;
}

type StudioPaneVisibility = {
  organizationCollapsed: boolean;
  cardsCollapsed: boolean;
  composeCollapsed: boolean;
  questionsCollapsed: boolean;
  mediaCollapsed: boolean;
};

const DEFAULT_STUDIO_PANE_VISIBILITY: StudioPaneVisibility = {
  organizationCollapsed: true,
  cardsCollapsed: false,
  composeCollapsed: false,
  questionsCollapsed: false,
  mediaCollapsed: false,
};

function readStoredPaneVisibility(): StudioPaneVisibility | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STUDIO_PANE_VISIBILITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioPaneVisibility>;
    return {
      ...DEFAULT_STUDIO_PANE_VISIBILITY,
      ...parsed,
    };
  } catch {
    return null;
  }
}

function readStoredQuestionsWidth(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STUDIO_QUESTIONS_WIDTH_KEY);
    if (!raw) return null;
    const w = Number.parseInt(raw, 10);
    return Number.isFinite(w) ? w : null;
  } catch {
    return null;
  }
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

export default function StudioWorkspace() {
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
  const [wideLayout, setWideLayout] = useState(true);
  const [cardEditWidth, setCardEditWidth] = useState(DEFAULT_CARD_EDIT_WIDTH);
  const [questionsWidth, setQuestionsWidth] = useState(DEFAULT_QUESTIONS_WIDTH);
  const [paneVisibility, setPaneVisibility] = useState<StudioPaneVisibility>(DEFAULT_STUDIO_PANE_VISIBILITY);
  const cardEditWidthRef = useRef(cardEditWidth);
  const questionsWidthRef = useRef(questionsWidth);
  const studioMediaCardRowRef = useRef<HTMLDivElement | null>(null);
  /** True while dragging card-edit width (skip ResizeObserver clamp). */
  const cardEditResizeActiveRef = useRef(false);
  const cardEditResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const questionsResizeActiveRef = useRef(false);
  const questionsResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const collectionsRefreshRef = useRef<(() => void) | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => requestedCardId);
  const [selectedCard, setSelectedCard] = useState<StudioCardContext | null>(null);
  const selectedCardRef = useRef<StudioCardContext | null>(null);
  const selectedCardCacheRef = useRef(new Map<string, StudioCardContext>());
  const selectedCardCacheOrderRef = useRef<string[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const {
    media: bankMediaPage,
    resolveMediaById,
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll: selectAllMediaOnPage,
    selectNone: selectNoneMedia,
  } = useMedia();

  const bodyMediaInsertRef = useRef<((m: Media) => void) | null>(null);
  const resolveBankMediaById = useCallback(
    (id: string) => bankMediaPage.find((m) => m.docId === id) ?? resolveMediaById(id),
    [bankMediaPage, resolveMediaById]
  );
  const cacheSelectedCard = useCallback((card: StudioCardContext | null) => {
    if (!card?.docId) return;
    selectedCardCacheRef.current.set(card.docId, card);
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
  const selectCard = useCallback(
    (cardId: string, previewCard?: Card | StudioCardContext | null) => {
      const trimmedId = cardId.trim();
      if (!trimmedId) return;
      setSelectedCardId(trimmedId);
      const cachedPreview = getCachedSelectedCard(trimmedId);
      const nextPreview =
        previewCard?.docId === trimmedId
          ? (previewCard as StudioCardContext)
          : cachedPreview;
      if (nextPreview) {
        cacheSelectedCard(nextPreview);
        setSelectedCard(nextPreview);
      }
    },
    [cacheSelectedCard, getCachedSelectedCard]
  );

  useEffect(() => {
    selectNoneMedia();
  }, [selectedCardId, selectNoneMedia]);

  useEffect(() => {
    if (!requestedCardId) return;
    setSelectedCardId((current) => (current === requestedCardId ? current : requestedCardId));
  }, [requestedCardId]);

  useEffect(() => {
    cacheSelectedCard(selectedCard);
  }, [cacheSelectedCard, selectedCard]);

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
  selectedCardRef.current = selectedCard;

  useEffect(() => {
    const stored = readStoredCardEditWidth();
    if (stored != null) {
      setCardEditWidth(clamp(stored, MIN_CARD_EDIT_PX, MAX_CARD_EDIT_WIDTH));
    }
  }, []);

  useEffect(() => {
    const stored = readStoredQuestionsWidth();
    if (stored != null) {
      setQuestionsWidth(clamp(stored, MIN_QUESTIONS_PX, MAX_QUESTIONS_WIDTH));
    }
  }, []);

  useEffect(() => {
    const stored = readStoredPaneVisibility();
    if (stored) setPaneVisibility(stored);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STUDIO_PANE_VISIBILITY_KEY, JSON.stringify(paneVisibility));
    } catch {
      /* ignore */
    }
  }, [paneVisibility]);

  const togglePane = useCallback((pane: keyof StudioPaneVisibility) => {
    setPaneVisibility((current) => ({
      ...current,
      [pane]: !current[pane],
    }));
  }, []);

  const clampCardEditToRow = useCallback(() => {
    if (
      cardEditResizeActiveRef.current ||
      questionsResizeActiveRef.current ||
      paneVisibility.composeCollapsed ||
      (paneVisibility.questionsCollapsed && paneVisibility.mediaCollapsed)
    ) {
      return;
    }
    const row = studioMediaCardRowRef.current;
    if (!row || !wideLayout) return;
    const rowW = rowWidthForCardEditResize(row);
    const showQuestions = !paneVisibility.questionsCollapsed;
    const showMedia = !paneVisibility.mediaCollapsed;
    const cardBounds = cardEditWidthBounds(rowW, { questions: showQuestions, media: showMedia });
    if (cardBounds) {
      setCardEditWidth((w) => clamp(w, cardBounds.minEdit, cardBounds.maxEdit));
    }
    if (showQuestions) {
      const composeWidth = cardBounds
        ? clamp(cardEditWidthRef.current, cardBounds.minEdit, cardBounds.maxEdit)
        : cardEditWidthRef.current;
      const questionBounds = questionsWidthBounds(rowW, {
        compose: !paneVisibility.composeCollapsed,
        media: showMedia,
        composeWidth,
      });
      if (questionBounds) {
        setQuestionsWidth((w) => clamp(w, questionBounds.minQuestions, questionBounds.maxQuestions));
      }
    }
  }, [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed, wideLayout]);

  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);

  const bindStudioMediaCardRowRef = useCallback(
    (el: HTMLDivElement | null) => {
      studioMediaCardRowRef.current = el;
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
      if (!el || !wideLayout) return;
      const ro = new ResizeObserver(() => {
        clampCardEditToRow();
      });
      ro.observe(el);
      rowResizeObserverRef.current = ro;
      queueMicrotask(() => {
        clampCardEditToRow();
      });
    },
    [wideLayout, clampCardEditToRow]
  );

  useEffect(() => {
    return () => {
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
    };
  }, []);

  useEffect(() => {
    window.addEventListener('resize', clampCardEditToRow);
    return () => window.removeEventListener('resize', clampCardEditToRow);
  }, [clampCardEditToRow]);

  const onCardEditResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!wideLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      cardEditResizeActiveRef.current = true;
      cardEditResizeSessionRef.current = {
        startX: e.clientX,
        startW: cardEditWidthRef.current,
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
        setCardEditWidth(next);
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
        try {
          localStorage.setItem(STUDIO_CARD_EDIT_WIDTH_KEY, String(cardEditWidthRef.current));
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed, wideLayout]
  );

  const onCardEditResizeDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!wideLayout || e.button !== 0) return;
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
      try {
        localStorage.setItem(STUDIO_CARD_EDIT_WIDTH_KEY, String(next));
      } catch {
        /* ignore */
      }
    },
    [paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed, wideLayout]
  );

  const onQuestionsResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!wideLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      questionsResizeActiveRef.current = true;
      questionsResizeSessionRef.current = {
        startX: e.clientX,
        startW: questionsWidthRef.current,
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
          composeWidth: cardEditWidthRef.current,
        });
        if (!bounds) return;
        const dx = ev.clientX - session.startX;
        const next = clamp(session.startW + dx, bounds.minQuestions, bounds.maxQuestions);
        setQuestionsWidth(next);
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
        try {
          localStorage.setItem(STUDIO_QUESTIONS_WIDTH_KEY, String(questionsWidthRef.current));
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, wideLayout]
  );

  const onQuestionsResizeDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!wideLayout || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const row = studioMediaCardRowRef.current;
      if (!row) return;
      const bounds = questionsWidthBounds(rowWidthForCardEditResize(row), {
        compose: !paneVisibility.composeCollapsed,
        media: !paneVisibility.mediaCollapsed,
        composeWidth: cardEditWidthRef.current,
      });
      if (!bounds) return;
      const next = clamp(DEFAULT_QUESTIONS_WIDTH, bounds.minQuestions, bounds.maxQuestions);
      setQuestionsWidth(next);
      try {
        localStorage.setItem(STUDIO_QUESTIONS_WIDTH_KEY, String(next));
      } catch {
        /* ignore */
      }
    },
    [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, wideLayout]
  );

  const loadSelectedCard = useCallback(async (cardId: string, opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setCardLoading(true);
    setCardError(null);
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
    const card = data as StudioCardContext;
    setSelectedCard(card);
    if (!opts?.quiet) setCardLoading(false);
    return card;
  }, []);

  useEffect(() => {
    if (!selectedCardId) {
      setSelectedCard(null);
      setCardError(null);
      setCardLoading(false);
      return;
    }
    let cancelled = false;
    const cachedSelectedCard = getCachedSelectedCard(selectedCardId);
    if (cachedSelectedCard && selectedCardRef.current?.docId !== selectedCardId) {
      setSelectedCard(cachedSelectedCard);
    }
    const hasUsablePreview =
      selectedCardRef.current?.docId === selectedCardId || Boolean(cachedSelectedCard);
    setCardError(null);
    setCardLoading(true);
    const run = async () => {
      try {
        await loadSelectedCard(selectedCardId, { quiet: hasUsablePreview });
      } catch (e) {
        if (!cancelled) {
          setCardError(e instanceof Error ? e.message : 'Failed to load selected card context.');
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
      const previousCard = selectedCard;
      if (selectedCard?.docId === selectedCardId) {
        const optimisticCard = applyOptimisticSelectedCardPatch(selectedCard, payload);
        cacheSelectedCard(optimisticCard);
        setSelectedCard(optimisticCard);
      }
      try {
        const res = await fetch(`/api/cards/${selectedCardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        throwIfJsonApiFailed(res, data, 'Update failed.');
        const nextCard = data as StudioCardContext;
        cacheSelectedCard(nextCard);
        setSelectedCard(nextCard);
        collectionsRefreshRef.current?.();
        // Always refresh strip: omitting a message must clear stale text (e.g. old cover-drag copy).
        setActionInfo(successMessage ?? null);
      } catch (e) {
        if (previousCard?.docId === selectedCardId) {
          cacheSelectedCard(previousCard);
          setSelectedCard(previousCard);
        }
        setActionError(e instanceof Error ? e.message : 'Update failed.');
        setActionInfo(null);
      } finally {
        setActionBusy(false);
      }
    },
    [cacheSelectedCard, selectedCard, selectedCardId]
  );

  const onStudioRelationshipDragEnd = useCallback(
    async (event: DragEndEvent) => {
      return handleStudioRelationshipDragEnd(event, {
        actionBusy,
        selectedCard,
        selectedCardId,
        patchSelectedCard,
        setActionInfo,
        resolveBankMediaById,
        bodyMediaInsertRef,
      });
    },
    [actionBusy, selectedCard, selectedCardId, patchSelectedCard, resolveBankMediaById]
  );

  const refreshCollectionsCardList = useCallback(() => {
    collectionsRefreshRef.current?.();
  }, []);

  const studioShellValue = useMemo<StudioShellContextValue>(
    () => ({
      selectedCardId,
      setSelectedCardId,
      selectCard,
      selectedCard,
      setSelectedCard,
      cardLoading,
      cardError,
      loadSelectedCard,
      patchSelectedCard,
      refreshCollectionsCardList,
      selectedMediaIds,
      setSelectedMediaIds,
      toggleMediaSelection,
      selectAllMediaOnPage,
      selectNoneMedia,
      bodyMediaInsertRef,
    }),
    [
      selectedCardId,
      setSelectedCardId,
      selectCard,
      selectedCard,
      setSelectedCard,
      cardLoading,
      cardError,
      loadSelectedCard,
      patchSelectedCard,
      refreshCollectionsCardList,
      selectedMediaIds,
      setSelectedMediaIds,
      toggleMediaSelection,
      selectAllMediaOnPage,
      selectNoneMedia,
    ]
  );

  return (
    <StudioShellProvider value={studioShellValue}>
      <div className={styles.page}>
        <div className={cardAdminPageStyles.stickyTop}>
          <div className={styles.studioHeaderRow}>
            <h1 className={`${cardAdminPageStyles.title} ${styles.studioPageTitle}`}>Content Management</h1>
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
              embedded
              onSelectCard={selectCard}
              embeddedOrganizationCollapsed={paneVisibility.organizationCollapsed}
              embeddedCardsCollapsed={paneVisibility.cardsCollapsed}
              onStudioRelationshipDragEnd={onStudioRelationshipDragEnd}
              embeddedUnparentedReplacement={(ctx) => <StudioTreeCandidateCardBank {...ctx} />}
              embeddedRightSlot={({ refreshCards }) => {
                collectionsRefreshRef.current = refreshCards;
                const showComposePane = !paneVisibility.composeCollapsed;
                const showQuestionsPane = !paneVisibility.questionsCollapsed;
                const showMediaPane = !paneVisibility.mediaCollapsed;
                return (
                  <div className={styles.studioRightColumn}>
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
                        wideLayout
                          ? `${styles.studioMediaCardRow} ${styles.studioMediaCardRowResizable}`
                          : styles.studioMediaCardRow
                      }
                    >
                      {showComposePane ? (
                        <div
                          className={styles.studioCardEditInBankColumn}
                          style={
                            wideLayout && (showQuestionsPane || showMediaPane)
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
                      {wideLayout && showComposePane && (showQuestionsPane || showMediaPane) ? (
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
                          className={styles.studioQuestionsColumn}
                          style={
                            wideLayout && (showComposePane || showMediaPane)
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
                      {wideLayout && showQuestionsPane && showMediaPane ? (
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
    </StudioShellProvider>
  );
}
