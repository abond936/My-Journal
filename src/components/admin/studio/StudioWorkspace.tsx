'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import MediaAdminContent from '@/app/admin/media-admin/MediaAdminContent';
import StudioCardEditPane from '@/components/admin/studio/StudioCardEditPane';
import StudioQuestionsPane from '@/components/admin/studio/StudioQuestionsPane';
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
import {
  mergeStudioCatalogCard,
  toStudioSelectedDetail,
  toStudioSelectedPreview,
} from '@/components/admin/studio/studioCardProjection';
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
const DEFAULT_QUESTIONS_WIDTH = 380;
/** Upper cap so Compose does not grow past a comfortable editing line length even on ultra-wide rows. */
const MAX_CARD_EDIT_WIDTH = 1200;
const MAX_QUESTIONS_WIDTH = 840;
const STUDIO_SELECTED_CARD_CACHE_LIMIT = 12;

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
  const cardEditWidthRef = useRef(cardEditWidth);
  const questionsWidthRef = useRef(questionsWidth);
  const studioMediaCardRowRef = useRef<HTMLDivElement | null>(null);
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => requestedCardId);
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
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll: selectAllMediaOnPage,
    selectNone: selectNoneMedia,
  } = useMedia();

  const bodyMediaInsertRef = useRef<((m: Media) => void) | null>(null);
  const collectionsUpsertCardRef = useRef<((card: Card) => void) | null>(null);
  const resolveBankMediaById = useCallback(
    (id: string) => bankMediaPage.find((m) => m.docId === id) ?? resolveMediaById(id),
    [bankMediaPage, resolveMediaById]
  );
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
  const selectCard = useCallback(
    (cardId: string, previewCard?: Card | StudioSelectedPreview | StudioSelectedDetail | null) => {
      const trimmedId = cardId.trim();
      if (!trimmedId) return;
      setSelectedCardId(trimmedId);
      setSelectedDetail((current) => (current?.docId === trimmedId ? current : null));
      setSelectedLoadState('loading');
      const knownPreview = getKnownCardPreview(trimmedId);
      const nextPreview =
        previewCard?.docId === trimmedId
          ? toStudioSelectedPreview(previewCard)
          : knownPreview;
      if (nextPreview) {
        cacheSelectedCard(nextPreview);
        setSelectedPreview(nextPreview);
      }
    },
    [cacheSelectedCard, getKnownCardPreview]
  );

  useEffect(() => {
    selectNoneMedia();
  }, [selectedCardId, selectNoneMedia]);

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
    if (cardEditDragRafRef.current != null) return;
    cardEditDragRafRef.current = window.requestAnimationFrame(() => {
      cardEditDragRafRef.current = null;
      const pending = pendingCardEditWidthRef.current;
      if (pending == null) return;
      applyColumnWidth(cardEditColumnRef.current, pending, MIN_CARD_EDIT_PX);
    });
  }, []);
  const scheduleLiveQuestionsWidth = useCallback((next: number) => {
    pendingQuestionsWidthRef.current = next;
    if (questionsDragRafRef.current != null) return;
    questionsDragRafRef.current = window.requestAnimationFrame(() => {
      questionsDragRafRef.current = null;
      const pending = pendingQuestionsWidthRef.current;
      if (pending == null) return;
      applyColumnWidth(questionsColumnRef.current, pending, MIN_QUESTIONS_PX);
    });
  }, []);

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
          localStorage.setItem(STUDIO_CARD_EDIT_WIDTH_KEY, String(committedWidth));
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [paneVisibility.mediaCollapsed, paneVisibility.questionsCollapsed, scheduleLiveCardEditWidth, wideLayout]
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
      pendingCardEditWidthRef.current = null;
      applyColumnWidth(cardEditColumnRef.current, next, MIN_CARD_EDIT_PX);
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
          localStorage.setItem(STUDIO_QUESTIONS_WIDTH_KEY, String(committedWidth));
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [paneVisibility.composeCollapsed, paneVisibility.mediaCollapsed, scheduleLiveQuestionsWidth, wideLayout]
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
        composeWidth: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
      });
      if (!bounds) return;
      const next = clamp(DEFAULT_QUESTIONS_WIDTH, bounds.minQuestions, bounds.maxQuestions);
      setQuestionsWidth(next);
      pendingQuestionsWidthRef.current = null;
      applyColumnWidth(questionsColumnRef.current, next, MIN_QUESTIONS_PX);
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
        cacheSelectedCard(nextCard);
        setSelectedDetail(nextCard);
        setSelectedPreview((current) =>
          current?.docId === nextCard.docId
            ? mergeStudioCatalogCard(current, nextCard)
            : toStudioSelectedPreview(nextCard)
        );
        setSelectedLoadState('ready');
        collectionsRefreshRef.current?.();
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
    [cacheSelectedCard, selectedDetail, selectedPreview, selectedCardId]
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

  const onStudioRelationshipDragEnd = useCallback(
    async (event: DragEndEvent) => {
      return handleStudioRelationshipDragEnd(event, {
        actionBusy,
        selectedCardDetail: selectedDetail,
        selectedCardId,
        patchSelectedCard,
        setActionInfo,
        resolveBankMediaById,
        bodyMediaInsertRef,
      });
    },
    [actionBusy, selectedCardId, selectedDetail, patchSelectedCard, resolveBankMediaById]
  );

  const refreshCollectionsCardList = useCallback(() => {
    collectionsRefreshRef.current?.();
  }, []);
  const upsertCollectionsCardList = useCallback((card: Card | StudioCardContext | null) => {
    if (!card?.docId) return;
    collectionsUpsertCardRef.current?.(card as Card);
  }, []);
  const deleteSelectedCard = useCallback(
    async (cardId: string) => {
      const id = cardId.trim();
      if (!id) return false;
      setActionBusy(true);
      setActionError(null);
      setActionInfo(null);
      try {
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
        setSelectedCardId((current) => (current === id ? null : current));
        setSelectedPreview((current) => (current?.docId === id ? null : current));
        setSelectedDetail((current) => (current?.docId === id ? null : current));
        setSelectedLoadState((current) => (selectedCardId === id ? 'idle' : current));
        setCardError(null);
        setCardLoading(false);
        selectNoneMedia();
        void globalMutate(
          (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
          (current) => removeCardFromCardsCache(current, id),
          { revalidate: true }
        );
        collectionsRefreshRef.current?.();
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
    [router, selectNoneMedia, selectedCardId]
  );

  const studioShellValue = useMemo<StudioShellContextValue>(
    () => ({
      selectedCardId,
      setSelectedCardId,
      selectCard,
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
      refreshCollectionsCardList,
      upsertCollectionsCardList,
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
      refreshCollectionsCardList,
      upsertCollectionsCardList,
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
              embeddedUnparentedReplacement={(ctx) => (
                <StudioTreeCandidateCardBank
                  {...ctx}
                  registerCatalogRemove={(fn) => {
                    cardsBankRemoveRef.current = fn;
                  }}
                />
              )}
              embeddedRightSlot={({ refreshCards, upsertCard }) => {
                collectionsRefreshRef.current = refreshCards;
                collectionsUpsertCardRef.current = upsertCard;
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
                          ref={cardEditColumnRef}
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
                          ref={questionsColumnRef}
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
