'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX } from '@/lib/admin/embeddedWideMinWidthPx';
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
import {
  CARD_EDIT_RESIZE_HANDLE,
  DEFAULT_CARD_EDIT_WIDTH,
  DEFAULT_QUESTIONS_WIDTH,
  MAX_CARD_EDIT_WIDTH,
  MAX_QUESTIONS_WIDTH,
  MIN_CARD_EDIT_PX,
  MIN_MEDIA_BANK_PX,
  MIN_QUESTIONS_PX,
  applyColumnWidth,
  cardEditWidthBounds,
  clampPaneWidth,
  questionsWidthBounds,
  renderedColumnWidth,
  rowWidthForPaneResize,
} from './studioPaneLayout';

export function useStudioPaneLayout() {
  const [wideLayout, setWideLayout] = useState(true);
  const [cardEditWidth, setCardEditWidth] = useState(DEFAULT_CARD_EDIT_WIDTH);
  const [questionsWidth, setQuestionsWidth] = useState(DEFAULT_QUESTIONS_WIDTH);
  const [paneVisibility, setPaneVisibility] = useState<StudioPaneVisibility>(DEFAULT_STUDIO_PANE_VISIBILITY);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const cardEditWidthRef = useRef(cardEditWidth);
  const questionsWidthRef = useRef(questionsWidth);
  const preferencesRef = useRef<StudioWorkspaceLayoutPreferences>(DEFAULT_STUDIO_WORKSPACE_LAYOUT_PREFERENCES);
  const studioMediaCardRowRef = useRef<HTMLDivElement | null>(null);
  const studioRightColumnRef = useRef<HTMLDivElement | null>(null);
  const cardEditColumnRef = useRef<HTMLDivElement | null>(null);
  const questionsColumnRef = useRef<HTMLDivElement | null>(null);
  const cardEditResizeActiveRef = useRef(false);
  const cardEditResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const questionsResizeActiveRef = useRef(false);
  const questionsResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const pendingCardEditWidthRef = useRef<number | null>(null);
  const pendingQuestionsWidthRef = useRef<number | null>(null);
  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);

  cardEditWidthRef.current = cardEditWidth;
  questionsWidthRef.current = questionsWidth;

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${EMBEDDED_ADMIN_WIDE_MIN_WIDTH_PX}px)`);
    const apply = () => setWideLayout(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const tabs = document.getElementById('admin-tabs-bar');
      if (!tabs) return;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabs.getBoundingClientRect().height}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const persistPreferences = useCallback(
    (apply: (current: StudioWorkspaceLayoutPreferences) => StudioWorkspaceLayoutPreferences) => {
      const next = apply(preferencesRef.current);
      preferencesRef.current = next;
      writeStoredStudioWorkspaceLayoutPreferences(next);
    },
    []
  );

  const persistPaneWidth = useCallback(
    (pane: 'composeWidth' | 'questionsWidth', width: number) => {
      const rowWidth = studioMediaCardRowRef.current
        ? rowWidthForPaneResize(studioMediaCardRowRef.current)
        : 0;
      const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
      persistPreferences((current) => ({
        ...current,
        [pane]: createStudioPaneWidthPreference(width, { rowWidth, viewportWidth }),
      }));
    },
    [persistPreferences]
  );

  useEffect(() => {
    const stored = readStoredStudioWorkspaceLayoutPreferences();
    preferencesRef.current = stored;
    setPaneVisibility(stored.paneVisibility);
    if (stored.composeWidth?.px != null) {
      setCardEditWidth(clampPaneWidth(stored.composeWidth.px, MIN_CARD_EDIT_PX, MAX_CARD_EDIT_WIDTH));
    }
    if (stored.questionsWidth?.px != null) {
      setQuestionsWidth(clampPaneWidth(stored.questionsWidth.px, MIN_QUESTIONS_PX, MAX_QUESTIONS_WIDTH));
    }
    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) return;
    persistPreferences((current) => ({ ...current, paneVisibility }));
  }, [paneVisibility, persistPreferences, preferencesHydrated]);

  const togglePane = useCallback((pane: keyof StudioPaneVisibility) => {
    setPaneVisibility((current) => ({ ...current, [pane]: !current[pane] }));
  }, []);

  const resizable =
    Number(!paneVisibility.composeCollapsed) +
      Number(!paneVisibility.questionsCollapsed) +
      Number(!paneVisibility.mediaCollapsed) >
    1;

  const embeddedRightSlotMinWidth = useMemo(() => {
    const minimums = [
      !paneVisibility.composeCollapsed ? MIN_CARD_EDIT_PX : 0,
      !paneVisibility.questionsCollapsed ? MIN_QUESTIONS_PX : 0,
      !paneVisibility.mediaCollapsed ? MIN_MEDIA_BANK_PX : 0,
    ].filter((width) => width > 0);
    const handles = Math.max(0, minimums.length - 1);
    return Math.max(
      MIN_MEDIA_BANK_PX,
      minimums.reduce((sum, width) => sum + width, 0) + handles * CARD_EDIT_RESIZE_HANDLE
    );
  }, [paneVisibility]);

  const clampToRow = useCallback(() => {
    if (
      cardEditResizeActiveRef.current ||
      questionsResizeActiveRef.current ||
      paneVisibility.composeCollapsed ||
      (paneVisibility.questionsCollapsed && paneVisibility.mediaCollapsed) ||
      !resizable
    ) return;
    const row = studioMediaCardRowRef.current;
    if (!row) return;
    const rowWidth = rowWidthForPaneResize(row);
    const viewportWidth = typeof window === 'undefined' ? rowWidth : window.innerWidth;
    const showQuestions = !paneVisibility.questionsCollapsed;
    const showMedia = !paneVisibility.mediaCollapsed;
    const cardBounds = cardEditWidthBounds(rowWidth, { questions: showQuestions, media: showMedia });
    const nextCardWidth = cardBounds
      ? resolveStudioPaneWidthPreference(preferencesRef.current.composeWidth, {
          rowWidth,
          viewportWidth,
          minPx: cardBounds.minEdit,
          maxPx: cardBounds.maxEdit,
          fallbackPx: cardEditWidthRef.current,
        })
      : cardEditWidthRef.current;
    if (cardBounds) setCardEditWidth(nextCardWidth);
    if (!showQuestions) return;
    const questionBounds = questionsWidthBounds(rowWidth, {
      compose: !paneVisibility.composeCollapsed,
      media: showMedia,
      composeWidth: nextCardWidth,
    });
    if (questionBounds) {
      setQuestionsWidth(
        resolveStudioPaneWidthPreference(preferencesRef.current.questionsWidth, {
          rowWidth,
          viewportWidth,
          minPx: questionBounds.minQuestions,
          maxPx: questionBounds.maxQuestions,
          fallbackPx: questionsWidthRef.current,
        })
      );
    }
  }, [paneVisibility, resizable]);

  const bindStudioMediaCardRowRef = useCallback(
    (element: HTMLDivElement | null) => {
      studioMediaCardRowRef.current = element;
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
      if (!element || !resizable) return;
      const observer = new ResizeObserver(clampToRow);
      observer.observe(element);
      rowResizeObserverRef.current = observer;
      queueMicrotask(clampToRow);
    },
    [clampToRow, resizable]
  );

  useEffect(() => {
    window.addEventListener('resize', clampToRow);
    return () => window.removeEventListener('resize', clampToRow);
  }, [clampToRow]);

  useEffect(() => {
    if (preferencesHydrated) clampToRow();
  }, [clampToRow, preferencesHydrated]);

  useEffect(() => () => rowResizeObserverRef.current?.disconnect(), []);

  const applyLiveWidth = useCallback(
    (pane: 'composeWidth' | 'questionsWidth', width: number) => {
      if (pane === 'composeWidth') {
        pendingCardEditWidthRef.current = width;
        applyColumnWidth(cardEditColumnRef.current, width, MIN_CARD_EDIT_PX);
      } else {
        pendingQuestionsWidthRef.current = width;
        applyColumnWidth(questionsColumnRef.current, width, MIN_QUESTIONS_PX);
      }
    },
    []
  );

  const onCardEditResizePointerDown = useCallback((event: React.PointerEvent) => {
    if (!resizable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    cardEditResizeActiveRef.current = true;
    cardEditResizeSessionRef.current = {
      startX: event.clientX,
      startW: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
      pointerId: event.pointerId,
    };
    const onMove = (moveEvent: PointerEvent) => {
      const session = cardEditResizeSessionRef.current;
      const row = studioMediaCardRowRef.current;
      if (!session || moveEvent.pointerId !== session.pointerId || !row) return;
      const bounds = cardEditWidthBounds(rowWidthForPaneResize(row), {
        questions: !paneVisibility.questionsCollapsed,
        media: !paneVisibility.mediaCollapsed,
      });
      if (!bounds) return;
      applyLiveWidth(
        'composeWidth',
        clampPaneWidth(session.startW + moveEvent.clientX - session.startX, bounds.minEdit, bounds.maxEdit)
      );
    };
    const end = (endEvent: PointerEvent) => {
      const session = cardEditResizeSessionRef.current;
      if (!session || endEvent.pointerId !== session.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      try { target.releasePointerCapture(session.pointerId); } catch { /* already released */ }
      cardEditResizeActiveRef.current = false;
      cardEditResizeSessionRef.current = null;
      const committed = pendingCardEditWidthRef.current ?? renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current);
      pendingCardEditWidthRef.current = null;
      setCardEditWidth(committed);
      persistPaneWidth('composeWidth', committed);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, [applyLiveWidth, paneVisibility, persistPaneWidth, resizable]);

  const onCardEditResizeDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!resizable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const row = studioMediaCardRowRef.current;
    if (!row) return;
    const bounds = cardEditWidthBounds(rowWidthForPaneResize(row), {
      questions: !paneVisibility.questionsCollapsed,
      media: !paneVisibility.mediaCollapsed,
    });
    if (!bounds) return;
    const next = clampPaneWidth(DEFAULT_CARD_EDIT_WIDTH, bounds.minEdit, bounds.maxEdit);
    pendingCardEditWidthRef.current = null;
    setCardEditWidth(next);
    applyColumnWidth(cardEditColumnRef.current, next, MIN_CARD_EDIT_PX);
    persistPaneWidth('composeWidth', next);
  }, [paneVisibility, persistPaneWidth, resizable]);

  const onQuestionsResizePointerDown = useCallback((event: React.PointerEvent) => {
    if (!resizable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    questionsResizeActiveRef.current = true;
    questionsResizeSessionRef.current = {
      startX: event.clientX,
      startW: renderedColumnWidth(questionsColumnRef.current, questionsWidthRef.current),
      pointerId: event.pointerId,
    };
    const onMove = (moveEvent: PointerEvent) => {
      const session = questionsResizeSessionRef.current;
      const row = studioMediaCardRowRef.current;
      if (!session || moveEvent.pointerId !== session.pointerId || !row) return;
      const bounds = questionsWidthBounds(rowWidthForPaneResize(row), {
        compose: !paneVisibility.composeCollapsed,
        media: !paneVisibility.mediaCollapsed,
        composeWidth: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
      });
      if (!bounds) return;
      applyLiveWidth(
        'questionsWidth',
        clampPaneWidth(session.startW + moveEvent.clientX - session.startX, bounds.minQuestions, bounds.maxQuestions)
      );
    };
    const end = (endEvent: PointerEvent) => {
      const session = questionsResizeSessionRef.current;
      if (!session || endEvent.pointerId !== session.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      try { target.releasePointerCapture(session.pointerId); } catch { /* already released */ }
      questionsResizeActiveRef.current = false;
      questionsResizeSessionRef.current = null;
      const committed = pendingQuestionsWidthRef.current ?? renderedColumnWidth(questionsColumnRef.current, questionsWidthRef.current);
      pendingQuestionsWidthRef.current = null;
      setQuestionsWidth(committed);
      persistPaneWidth('questionsWidth', committed);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, [applyLiveWidth, paneVisibility, persistPaneWidth, resizable]);

  const onQuestionsResizeDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!resizable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const row = studioMediaCardRowRef.current;
    if (!row) return;
    const bounds = questionsWidthBounds(rowWidthForPaneResize(row), {
      compose: !paneVisibility.composeCollapsed,
      media: !paneVisibility.mediaCollapsed,
      composeWidth: renderedColumnWidth(cardEditColumnRef.current, cardEditWidthRef.current),
    });
    if (!bounds) return;
    const next = clampPaneWidth(DEFAULT_QUESTIONS_WIDTH, bounds.minQuestions, bounds.maxQuestions);
    pendingQuestionsWidthRef.current = null;
    setQuestionsWidth(next);
    applyColumnWidth(questionsColumnRef.current, next, MIN_QUESTIONS_PX);
    persistPaneWidth('questionsWidth', next);
  }, [paneVisibility, persistPaneWidth, resizable]);

  return {
    wideLayout,
    cardEditWidth,
    questionsWidth,
    paneVisibility,
    setPaneVisibility,
    resizableWorkspaceLayout: resizable,
    studioRightColumnRef,
    cardEditColumnRef,
    questionsColumnRef,
    bindStudioMediaCardRowRef,
    togglePane,
    embeddedRightSlotMinWidth,
    onCardEditResizePointerDown,
    onCardEditResizeDoubleClick,
    onQuestionsResizePointerDown,
    onQuestionsResizeDoubleClick,
  };
}
