'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import MediaAdminContent from '@/app/admin/media-admin/MediaAdminContent';
import StudioCardEditPane from '@/components/admin/studio/StudioCardEditPane';
import { handleStudioRelationshipDragEnd } from '@/components/admin/studio/studioRelationshipDndPrimitives';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';
import { StudioShellProvider, type StudioShellContextValue } from '@/components/admin/studio/StudioShellContext';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Card } from '@/lib/types/card';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import cardAdminPageStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './StudioWorkspace.module.css';

const STUDIO_CARD_EDIT_WIDTH_KEY = 'studioCardEditPaneWidth';
const CARD_EDIT_RESIZE_HANDLE = 8;
const MIN_CARD_EDIT_PX = 260;
const MIN_MEDIA_BANK_PX = 200;

/** When the row is narrower than MIN_CARD_EDIT + media minimum, still allow dragging within the real range. */
function cardEditWidthBounds(rowW: number): { minEdit: number; maxEdit: number } | null {
  const maxEdit = rowW - MIN_MEDIA_BANK_PX - CARD_EDIT_RESIZE_HANDLE;
  if (maxEdit < 1) return null;
  const minEdit = Math.min(MIN_CARD_EDIT_PX, maxEdit);
  return { minEdit, maxEdit };
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

export default function StudioWorkspace() {
  const [wideLayout, setWideLayout] = useState(true);
  const [cardEditWidth, setCardEditWidth] = useState(380);
  const cardEditWidthRef = useRef(cardEditWidth);
  const studioMediaCardRowRef = useRef<HTMLDivElement | null>(null);
  /** True while dragging card-edit width (skip ResizeObserver clamp). */
  const cardEditResizeActiveRef = useRef(false);
  const cardEditResizeSessionRef = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const collectionsRefreshRef = useRef<(() => void) | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<StudioCardContext | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const {
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll: selectAllMediaOnPage,
    selectNone: selectNoneMedia,
  } = useMedia();

  useEffect(() => {
    selectNoneMedia();
  }, [selectedCardId, selectNoneMedia]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1201px)');
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

  useEffect(() => {
    const stored = readStoredCardEditWidth();
    if (stored != null) {
      setCardEditWidth(clamp(stored, MIN_CARD_EDIT_PX, 900));
    }
  }, []);

  const clampCardEditToRow = useCallback(() => {
    if (cardEditResizeActiveRef.current) return;
    const row = studioMediaCardRowRef.current;
    if (!row || !wideLayout) return;
    const rowW = row.getBoundingClientRect().width;
    const bounds = cardEditWidthBounds(rowW);
    if (!bounds) return;
    setCardEditWidth((w) => clamp(w, bounds.minEdit, bounds.maxEdit));
  }, [wideLayout]);

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
        const bounds = cardEditWidthBounds(row.getBoundingClientRect().width);
        if (!bounds) return;
        const dx = ev.clientX - session.startX;
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
    [wideLayout]
  );

  const loadSelectedCard = useCallback(async (cardId: string, opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setCardLoading(true);
    setCardError(null);
    const res = await fetch(`/api/cards/${cardId}?limit=200`, { cache: 'no-store' });
    const data = (await res.json().catch(() => ({}))) as StudioCardContext & { message?: string; error?: string };
    throwIfJsonApiFailed(res, data, 'Failed to load card');
    setSelectedCard(data);
    if (!opts?.quiet) setCardLoading(false);
    return data;
  }, []);

  useEffect(() => {
    if (!selectedCardId) {
      setSelectedCard(null);
      setCardError(null);
      setCardLoading(false);
      return;
    }
    let cancelled = false;
    setSelectedCard(null);
    setCardError(null);
    setCardLoading(true);
    const run = async () => {
      try {
        await loadSelectedCard(selectedCardId);
      } catch (e) {
        if (!cancelled) {
          setSelectedCard(null);
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
  }, [selectedCardId, loadSelectedCard]);

  const patchSelectedCard = useCallback(
    async (payload: Partial<Card>, successMessage?: string) => {
      if (!selectedCardId) return;
      setActionBusy(true);
      setActionError(null);
      if (successMessage) setActionInfo(null);
      try {
        const res = await fetch(`/api/cards/${selectedCardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        throwIfJsonApiFailed(res, data, 'Update failed.');
        await loadSelectedCard(selectedCardId, { quiet: true });
        collectionsRefreshRef.current?.();
        if (successMessage) setActionInfo(successMessage);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Update failed.');
      } finally {
        setActionBusy(false);
      }
    },
    [selectedCardId, loadSelectedCard]
  );

  const onStudioRelationshipDragEnd = useCallback(
    async (event: DragEndEvent) => {
      return handleStudioRelationshipDragEnd(event, {
        actionBusy,
        selectedCard,
        selectedCardId,
        patchSelectedCard,
        setActionInfo,
      });
    },
    [actionBusy, selectedCard, selectedCardId, patchSelectedCard]
  );

  const refreshCollectionsCardList = useCallback(() => {
    collectionsRefreshRef.current?.();
  }, []);

  const studioShellValue = useMemo<StudioShellContextValue>(
    () => ({
      selectedCardId,
      setSelectedCardId,
      selectedCard,
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
    }),
    [
      selectedCardId,
      selectedCard,
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
          <h1 className={cardAdminPageStyles.title}>Content Management</h1>
        </div>
        <div className={wideLayout ? styles.grid : styles.gridStacked}>
          <div className={styles.collectionsHost}>
            <CollectionsAdminClient
              embedded
              onSelectCard={setSelectedCardId}
              onStudioRelationshipDragEnd={onStudioRelationshipDragEnd}
              embeddedUnparentedReplacement={(ctx) => <StudioTreeCandidateCardBank {...ctx} />}
              embeddedRightSlot={({ refreshCards }) => {
                collectionsRefreshRef.current = refreshCards;
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
                      <div className={styles.studioMediaBankColumn}>
                        <div className={styles.studioMediaBankFill}>
                          <MediaAdminContent embedded studioSourceDraggable />
                        </div>
                      </div>
                      {wideLayout ? (
                        <div
                          className={`${styles.resizeHandle} ${styles.cardEditColumnResizeHandle}`}
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Resize media bank and card edit columns"
                          onPointerDown={onCardEditResizePointerDown}
                        />
                      ) : null}
                      <div
                        className={styles.studioCardEditInBankColumn}
                        style={
                          wideLayout
                            ? {
                                flex: `0 0 ${cardEditWidth}px`,
                                width: cardEditWidth,
                                minWidth: MIN_CARD_EDIT_PX,
                              }
                            : undefined
                        }
                      >
                        <StudioCardEditPane />
                      </div>
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
