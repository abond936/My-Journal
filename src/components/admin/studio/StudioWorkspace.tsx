'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { DragEndEvent } from '@dnd-kit/core';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import CollectionsMediaPanel from '@/components/admin/collections/CollectionsMediaPanel';
import TagAdminStudioPane from '@/components/admin/studio/TagAdminStudioPane';
import StudioCardRelationshipPanel, {
  handleStudioRelationshipDragEnd,
  type StudioCardContext,
} from '@/components/admin/studio/StudioCardRelationshipPanel';
import { useTag } from '@/components/providers/TagProvider';
import type { Card } from '@/lib/types/card';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './StudioWorkspace.module.css';

const STORAGE_KEY = 'studioPaneWidths';
const HANDLE = 8;
const MIN_LEFT = 200;
const MIN_CENTER = 240;

function readStoredLeftWidth(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { left?: number; right?: number };
    if (typeof o.left === 'number') return o.left;
  } catch {
    /* ignore */
  }
  return null;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export default function StudioWorkspace() {
  const [wideLayout, setWideLayout] = useState(true);
  const [leftWidth, setLeftWidth] = useState(300);
  const leftRef = useRef(leftWidth);
  const collectionsRefreshRef = useRef<(() => void) | null>(null);
  const [drag, setDrag] = useState<{
    startX: number;
    startLeft: number;
  } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<StudioCardContext | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Record<'cover' | 'gallery' | 'children' | 'content', boolean>>({
    cover: true,
    gallery: true,
    children: true,
    content: true,
  });
  const { tags } = useTag();

  leftRef.current = leftWidth;

  useEffect(() => {
    const stored = readStoredLeftWidth();
    if (stored != null) setLeftWidth(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1201px)');
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const persistLeftWidth = useCallback((left: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!drag) return;

    const chrome = 32;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX;
      const maxLeft = window.innerWidth - HANDLE - MIN_CENTER - chrome;
      const next = clamp(drag.startLeft + dx, MIN_LEFT, maxLeft);
      setLeftWidth(next);
    };

    const onUp = () => {
      persistLeftWidth(leftRef.current);
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, persistLeftWidth]);

  const onHandleDown = useCallback(
    (e: React.PointerEvent) => {
      if (!wideLayout) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ startX: e.clientX, startLeft: leftWidth });
    },
    [wideLayout, leftWidth]
  );

  const gridStyle = useMemo(() => {
    if (!wideLayout) return undefined;
    return {
      gridTemplateColumns: `${leftWidth}px ${HANDLE}px minmax(${MIN_CENTER}px, 1fr)`,
    } as React.CSSProperties;
  }, [wideLayout, leftWidth]);

  const togglePanel = useCallback((panel: 'cover' | 'gallery' | 'children' | 'content') => {
    setExpandedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

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

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Experimental <strong>Admin Studio</strong>: tag tree and a three-column card workspace (curated tree ·
        unparented · selected-card context + same Media bank as Collections) in one screen. Card and media drags share
        one surface so you can drop a card onto the <strong>Children</strong> block to attach it to the selected card.
        Drag from the media bank to Cover/Gallery, or use keyboard (Space, arrows, Space) and row actions in Selected
        card context. This route is separate from
        Collections and Tag admin so we can evolve layout and interactions without replacing them.{' '}
        <Link href="/admin/collections">Collections</Link> · <Link href="/admin/tag-admin">Tag admin</Link>.
        {wideLayout ? (
          <>
            {' '}
            Drag the narrow bar to resize the tag column; widths are saved in this browser.
          </>
        ) : null}
      </p>

      <div className={wideLayout ? styles.grid : styles.gridStacked} style={gridStyle}>
        <TagAdminStudioPane />

        {wideLayout ? (
          <div
            className={styles.resizeHandle}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tag and card columns"
            onPointerDown={onHandleDown}
          />
        ) : null}

        <div className={styles.collectionsHost}>
          <CollectionsAdminClient
            embedded
            onSelectCard={setSelectedCardId}
            onStudioRelationshipDragEnd={onStudioRelationshipDragEnd}
            embeddedRightSlot={({ refreshCards }) => {
              collectionsRefreshRef.current = refreshCards;
              return (
                <div className={styles.studioRightColumn}>
                  <div className={styles.studioRelationshipColumn}>
                    <StudioCardRelationshipPanel
                      cardLoading={cardLoading}
                      cardError={cardError}
                      selectedCard={selectedCard}
                      tags={tags}
                      actionBusy={actionBusy}
                      actionInfo={actionInfo}
                      actionError={actionError}
                      expandedPanels={expandedPanels}
                      togglePanel={togglePanel}
                      patchSelectedCard={patchSelectedCard}
                    />
                  </div>
                  <div className={styles.studioMediaBankColumn}>
                    <CollectionsMediaPanel studioSourceDraggable />
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
