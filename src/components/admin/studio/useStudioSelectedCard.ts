'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '@/lib/types/card';
import { dehydrateCardPatchPayload } from '@/lib/utils/cardUtils';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import {
  mergeStudioCatalogCard,
  toStudioSelectedDetail,
  toStudioSelectedPreview,
} from './studioCardProjection';
import type {
  StudioActiveCardViewModel,
  StudioCardContext,
  StudioSelectedDetail,
  StudioSelectedLoadState,
  StudioSelectedPreview,
} from './studioCardTypes';
import {
  applyOptimisticSelectedCardPatch,
  collectAssignedMediaIds,
} from './studioCardSelectionModel';

const CACHE_LIMIT = 12;

type Args = {
  initialCardId: string | null;
  selectionRequestKey: string;
  reconcileCardMediaAssignments: (cardId: string, addedIds: string[], removedIds: string[]) => void;
  onCardUpsert: (card: Card) => void;
  setActionBusy: (busy: boolean) => void;
  setActionError: (message: string | null) => void;
  setActionInfo: (message: string | null) => void;
};

export function useStudioSelectedCard({
  initialCardId,
  selectionRequestKey,
  reconcileCardMediaAssignments,
  onCardUpsert,
  setActionBusy,
  setActionError,
  setActionInfo,
}: Args) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => initialCardId);
  const [selectedPreview, setSelectedPreview] = useState<StudioSelectedPreview | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<StudioSelectedDetail | null>(null);
  const [selectedLoadState, setSelectedLoadState] = useState<StudioSelectedLoadState>('idle');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const selectedCardIdRef = useRef<string | null>(initialCardId);
  const selectedPreviewRef = useRef<StudioSelectedPreview | null>(null);
  const selectedDetailRef = useRef<StudioSelectedDetail | null>(null);
  const cacheRef = useRef(new Map<string, StudioSelectedPreview>());
  const cacheOrderRef = useRef<string[]>([]);
  const composeLeaveGuardRef = useRef<(() => Promise<boolean>) | null>(null);

  selectedCardIdRef.current = selectedCardId;
  selectedPreviewRef.current = selectedPreview;
  selectedDetailRef.current = selectedDetail;

  const cacheCard = useCallback((card: StudioSelectedPreview | StudioSelectedDetail | null) => {
    if (!card?.docId) return;
    cacheRef.current.set(card.docId, toStudioSelectedPreview(card));
    cacheOrderRef.current = cacheOrderRef.current.filter((id) => id !== card.docId);
    cacheOrderRef.current.push(card.docId);
    while (cacheOrderRef.current.length > CACHE_LIMIT) {
      const oldest = cacheOrderRef.current.shift();
      if (oldest) cacheRef.current.delete(oldest);
    }
  }, []);

  const getCachedCard = useCallback((cardId: string | null) => {
    if (!cardId) return null;
    const cached = cacheRef.current.get(cardId) ?? null;
    if (cached) {
      cacheOrderRef.current = cacheOrderRef.current.filter((id) => id !== cardId);
      cacheOrderRef.current.push(cardId);
    }
    return cached;
  }, []);

  const getKnownCardPreview = useCallback((cardId: string | null) => {
    const id = cardId?.trim();
    if (!id) return null;
    if (selectedDetailRef.current?.docId === id) return toStudioSelectedPreview(selectedDetailRef.current);
    if (selectedPreviewRef.current?.docId === id) return selectedPreviewRef.current;
    return getCachedCard(id);
  }, [getCachedCard]);

  const selectCard = useCallback((cardId: string, preview?: Card | StudioSelectedPreview | StudioSelectedDetail | null) => {
    const id = cardId.trim();
    if (!id) return;
    const nextPreview = preview?.docId === id ? toStudioSelectedPreview(preview) : getKnownCardPreview(id);
    const alreadySelected = selectedCardIdRef.current === id &&
      (selectedDetailRef.current?.docId === id || selectedPreviewRef.current?.docId === id);
    if (nextPreview) {
      cacheCard(nextPreview);
      setSelectedPreview(nextPreview);
    }
    if (alreadySelected) return;
    setSelectedCardId(id);
    setSelectedDetail((current) => current?.docId === id ? current : null);
    setSelectedLoadState('loading');
  }, [cacheCard, getKnownCardPreview]);

  const registerComposeLeaveGuard = useCallback((guard: (() => Promise<boolean>) | null) => {
    composeLeaveGuardRef.current = guard;
  }, []);

  const requestSelectCard = useCallback(async (
    cardId: string,
    preview?: Card | StudioSelectedPreview | StudioSelectedDetail | null
  ) => {
    const id = cardId.trim();
    if (!id) return false;
    if (id !== selectedCardId && composeLeaveGuardRef.current && !(await composeLeaveGuardRef.current())) {
      return false;
    }
    selectCard(id, preview);
    return true;
  }, [selectCard, selectedCardId]);

  const loadSelectedCard = useCallback(async (cardId: string, options?: { quiet?: boolean }) => {
    if (!options?.quiet) setCardLoading(true);
    setCardError(null);
    setSelectedLoadState('loading');
    const id = cardId.trim();
    const response = await fetch(`/api/cards/${encodeURIComponent(id)}?children=skip`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: `Could not parse API response (HTTP ${response.status}). ${raw.slice(0, 160)}${raw.length > 160 ? '…' : ''}` };
    }
    throwIfJsonApiFailed(response, data, 'This card could not be opened. Try again.');
    const card = toStudioSelectedDetail(data as StudioCardContext);
    setSelectedDetail(card);
    setSelectedPreview((current) => current?.docId === card.docId
      ? mergeStudioCatalogCard(current, card)
      : toStudioSelectedPreview(card));
    setSelectedLoadState('ready');
    if (!options?.quiet) setCardLoading(false);
    return card;
  }, []);

  const patchSelectedCard = useCallback(async (payload: Partial<Card>, successMessage?: string) => {
    if (!selectedCardId) return;
    setActionBusy(true);
    setActionError(null);
    const previousDetail = selectedDetail;
    const previousPreview = selectedPreview;
    if (selectedDetail?.docId === selectedCardId) {
      const optimistic = applyOptimisticSelectedCardPatch(selectedDetail, payload);
      cacheCard(optimistic);
      setSelectedDetail(optimistic);
      setSelectedPreview((current) => current?.docId === optimistic.docId
        ? mergeStudioCatalogCard(current, optimistic)
        : toStudioSelectedPreview(optimistic));
    }
    try {
      const response = await fetch(`/api/cards/${selectedCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dehydrateCardPatchPayload(payload)),
      });
      const data = await response.json().catch(() => ({}));
      throwIfJsonApiFailed(response, data, 'This card could not be updated. Try again.');
      const next = toStudioSelectedDetail(data as StudioCardContext);
      const previousAssigned = previousDetail ? collectAssignedMediaIds(previousDetail) : [];
      const nextAssigned = collectAssignedMediaIds(next);
      reconcileCardMediaAssignments(
        selectedCardId,
        nextAssigned.filter((id) => !previousAssigned.includes(id)),
        previousAssigned.filter((id) => !nextAssigned.includes(id))
      );
      cacheCard(next);
      setSelectedDetail(next);
      setSelectedPreview((current) => current?.docId === next.docId
        ? mergeStudioCatalogCard(current, next)
        : toStudioSelectedPreview(next));
      setSelectedLoadState('ready');
      onCardUpsert(next);
      setActionInfo(successMessage ?? null);
    } catch (error) {
      if (previousDetail?.docId === selectedCardId) {
        cacheCard(previousDetail);
        setSelectedDetail(previousDetail);
      }
      if (previousPreview?.docId === selectedCardId) setSelectedPreview(previousPreview);
      setActionError(error instanceof Error ? error.message : 'Update failed.');
      setActionInfo(null);
    } finally {
      setActionBusy(false);
    }
  }, [cacheCard, onCardUpsert, reconcileCardMediaAssignments, selectedCardId, selectedDetail, selectedPreview, setActionBusy, setActionError, setActionInfo]);

  const evictCard = useCallback((cardId: string, fallback: StudioSelectedPreview | null = null) => {
    cacheRef.current.delete(cardId);
    cacheOrderRef.current = cacheOrderRef.current.filter((id) => id !== cardId);
    if (selectedCardIdRef.current === cardId && fallback?.docId && fallback.docId !== cardId) {
      selectCard(fallback.docId, fallback);
      return;
    }
    setSelectedCardId((current) => current === cardId ? null : current);
    setSelectedPreview((current) => current?.docId === cardId ? null : current);
    setSelectedDetail((current) => current?.docId === cardId ? null : current);
    if (selectedCardIdRef.current === cardId) setSelectedLoadState('idle');
  }, [selectCard]);

  useEffect(() => {
    if (selectionRequestKey === '__new__') setSelectedCardId(null);
    else if (selectionRequestKey !== '__none__') {
      setSelectedCardId((current) => current === selectionRequestKey ? current : selectionRequestKey);
    }
  }, [selectionRequestKey]);

  useEffect(() => { cacheCard(selectedPreview); }, [cacheCard, selectedPreview]);
  useEffect(() => { cacheCard(selectedDetail); }, [cacheCard, selectedDetail]);

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
    const cached = getCachedCard(selectedCardId);
    if (cached && selectedPreviewRef.current?.docId !== selectedCardId) setSelectedPreview(cached);
    const hasPreview = selectedPreviewRef.current?.docId === selectedCardId ||
      selectedDetailRef.current?.docId === selectedCardId || Boolean(cached);
    setCardError(null);
    setCardLoading(true);
    void loadSelectedCard(selectedCardId, { quiet: hasPreview }).catch((error) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : 'Failed to load selected card context.';
      if (/not found/i.test(message)) {
        setSelectedCardId(null);
        setSelectedPreview(null);
        setSelectedDetail(null);
        setCardError(null);
        setSelectedLoadState('idle');
        window.history.replaceState(null, '', '/admin/studio');
      } else {
        setCardError(message);
        setSelectedLoadState(hasPreview ? 'degraded' : 'error');
      }
    }).finally(() => { if (!cancelled) setCardLoading(false); });
    return () => { cancelled = true; };
  }, [getCachedCard, loadSelectedCard, selectedCardId]);

  const activeCardViewModel = useMemo<StudioActiveCardViewModel>(() => {
    if (selectedLoadState === 'idle' && !selectedCardId && !selectedPreview && !selectedDetail) {
      return { status: 'empty', card: null, preview: null, detail: null, error: null };
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
        status: selectedLoadState === 'error' || selectedLoadState === 'degraded' ? 'degraded' : 'preview',
        card: selectedPreview,
        preview: selectedPreview,
        detail: null,
        error: cardError,
      };
    }
    return { status: selectedLoadState === 'error' ? 'error' : 'empty', card: null, preview: null, detail: null, error: cardError };
  }, [cardError, selectedCardId, selectedDetail, selectedLoadState, selectedPreview]);

  return {
    selectedCardId,
    setSelectedCardId,
    selectedPreview,
    setSelectedPreview,
    selectedDetail,
    setSelectedDetail,
    selectedPreviewRef,
    selectedDetailRef,
    selectedLoadState,
    cardLoading,
    cardError,
    setCardError,
    setCardLoading,
    selectCard,
    requestSelectCard,
    registerComposeLeaveGuard,
    getKnownCardPreview,
    loadSelectedCard,
    patchSelectedCard,
    evictCard,
    activeCardViewModel,
  };
}
