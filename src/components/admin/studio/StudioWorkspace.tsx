'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { handleStudioPileMembershipDragEnd } from '@/components/admin/studio/studioPileMembershipDnd';
import type {
  StudioCardContext,
  StudioSelectedPreview,
} from '@/components/admin/studio/studioCardTypes';
import {
  StudioShellProvider,
  type StudioShellContextValue,
} from '@/components/admin/studio/StudioShellContext';
import { createStudioShellImperativeRegistry } from '@/components/admin/studio/studioShellImperativeRegistry';
import type { CollectionsCardDragData } from '@/lib/dnd/collectionsDragContract';
import type { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Card } from '@/lib/types/card';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';
import { deriveCuratedMutationPlan, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import cardAdminPageStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import styles from './StudioWorkspace.module.css';
import {
  DEFAULT_CARD_EDIT_WIDTH,
  DEFAULT_QUESTIONS_WIDTH,
  MIN_CARD_EDIT_PX,
  MIN_QUESTIONS_PX,
} from './studioPaneLayout';
import { useStudioPaneLayout } from './useStudioPaneLayout';
import { useStudioSelectedCard } from './useStudioSelectedCard';
import { collectAssignedMediaIds, mediaRolesOnCard, removeCardFromCardsCache } from './studioCardSelectionModel';
import {
  MOBILE_AUTHOR_DESTINATIONS,
  parseMobileAuthorDestination,
  readStoredMobileAuthorDestination,
  resolveMobileStudioPresentation,
  writeStoredMobileAuthorDestination,
  type MobileAuthorDestination,
} from '@/lib/preferences/mobileAuthorDestination';

const STUDIO_ACTION_INFO_TIMEOUT_MS = 3000;
const MOBILE_DESTINATION_LABELS: Record<MobileAuthorDestination, string> = {
  cards: 'Cards',
  media: 'Media',
  prompts: 'Prompts',
  collections: 'Collections',
  tags: 'Tags',
};

export default function StudioWorkspace() {
  const feedback = useAppFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCardId = useMemo(() => {
    const raw = searchParams.get('card');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [searchParams]);
  const requestedCollectionId = useMemo(() => {
    const raw = searchParams.get('collection');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [searchParams]);
  const requestedMediaId = useMemo(() => {
    const raw = searchParams.get('media');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [searchParams]);
  const requestedMediaReviewId = useMemo(() => {
    const raw = searchParams.get('mediaReview');
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [searchParams]);
  const requestedMediaHandoffId = requestedMediaReviewId ?? requestedMediaId;
  const newCardRequested = useMemo(() => {
    const raw = searchParams.get('new');
    if (!raw) return false;
    return raw === '1' || raw.toLowerCase() === 'true';
  }, [searchParams]);
  const selectionRequestKey = useMemo(
    () => (newCardRequested ? '__new__' : requestedCardId ?? '__none__'),
    [newCardRequested, requestedCardId]
  );
  const [mobileDestination, setMobileDestination] = useState<MobileAuthorDestination>(() => {
    const explicitDestination = parseMobileAuthorDestination(searchParams.get('destination'));
    if ((requestedCardId || newCardRequested) && explicitDestination !== 'prompts') return 'cards';
    if (requestedCollectionId) return 'collections';
    if (requestedMediaHandoffId) return 'media';
    return explicitDestination ?? 'cards';
  });
  const mobileDestinationHydratedRef = useRef(false);
  const {
    wideLayout,
    paneVisibility,
    setPaneVisibility,
    studioRightColumnRef,
    cardEditColumnRef,
    questionsColumnRef,
    bindStudioMediaCardRowRef,
    togglePane,
    embeddedRightSlotMinWidth,
  } = useStudioPaneLayout();
  useEffect(() => {
    if (!requestedCollectionId) return;
    setPaneVisibility((current) => (
      current.collectionsCollapsed
        ? { ...current, collectionsCollapsed: false }
        : current
    ));
  }, [requestedCollectionId, setPaneVisibility]);
  useEffect(() => {
    if (!requestedMediaHandoffId) return;
    setPaneVisibility((current) => (
      current.mediaCollapsed
        ? { ...current, mediaCollapsed: false }
        : current
    ));
  }, [requestedMediaHandoffId, setPaneVisibility]);
  const collectionsRefreshRef = useRef<(() => void) | null>(null);
  const cardsBankRemoveRef = useRef<((cardId: string) => void) | null>(null);
  const cardsBankDeleteFallbackResolverRef = useRef<((deletedCardId: string) => StudioSelectedPreview | null) | null>(null);
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
  const pendingPromptTextRef = useRef<string[]>([]);
  const registerBodyMediaInsert = useCallback((handler: ((media: Media) => void) | null) => {
    studioImperatives.register('bodyMediaInsert', handler);
  }, [studioImperatives]);
  const registerPromptTextInsert = useCallback((handler: ((prompt: string) => void) | null) => {
    studioImperatives.register('promptTextInsert', handler);
    if (!handler || pendingPromptTextRef.current.length === 0) return;
    const pendingPrompts = pendingPromptTextRef.current.splice(0);
    pendingPrompts.forEach(prompt => handler(prompt));
  }, [studioImperatives]);
  const bodyMediaInsertRef = studioImperatives.bodyMediaInsertRef;
  const collectionsUpsertCardRef = useRef<((card: Card) => void) | null>(null);
  const collectionsRemoveCardRef = useRef<((cardId: string) => void) | null>(null);
  const questionCardDeleteSyncRef = useRef<((cardId: string, questionId?: string | null) => void) | null>(null);
  const {
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
    confirmComposeLeave,
    requestClearSelectedCard,
    registerComposeLeaveGuard,
    getKnownCardPreview,
    loadSelectedCard,
    patchSelectedCard,
    evictCard,
    activeCardViewModel,
  } = useStudioSelectedCard({
    initialCardId: requestedCardId,
    selectionRequestKey,
    reconcileCardMediaAssignments,
    onCardUpsert: (card) => collectionsUpsertCardRef.current?.(card),
    setActionBusy,
    setActionError,
    setActionInfo,
  });
  const mobileCardEditorOpen = Boolean(selectedCardId || newCardRequested);
  const mobilePresentation = useMemo(
    () => resolveMobileStudioPresentation({
      destination: mobileDestination,
      cardEditorOpen: mobileCardEditorOpen,
    }),
    [mobileCardEditorOpen, mobileDestination]
  );
  const effectivePaneVisibility = wideLayout
    ? paneVisibility
    : mobilePresentation.paneVisibility;

  useEffect(() => {
    if (wideLayout || mobileDestinationHydratedRef.current) return;
    mobileDestinationHydratedRef.current = true;
    const explicitDestination = parseMobileAuthorDestination(searchParams.get('destination'));
    const initialDestination = (requestedCardId || newCardRequested) && explicitDestination !== 'prompts'
      ? 'cards'
      : requestedCollectionId
        ? 'collections'
        : requestedMediaHandoffId
          ? 'media'
          : explicitDestination ?? readStoredMobileAuthorDestination();
    setMobileDestination(initialDestination);
  }, [newCardRequested, requestedCardId, requestedCollectionId, requestedMediaHandoffId, searchParams, wideLayout]);

  useEffect(() => {
    if (wideLayout) return;
    const explicitDestination = parseMobileAuthorDestination(searchParams.get('destination'));
    if ((requestedCardId || newCardRequested) && explicitDestination !== 'prompts') setMobileDestination('cards');
    else if (requestedCollectionId) setMobileDestination('collections');
    else if (requestedMediaHandoffId) setMobileDestination('media');
  }, [newCardRequested, requestedCardId, requestedCollectionId, requestedMediaHandoffId, searchParams, wideLayout]);

  const replaceStudioQuery = useCallback((update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const query = params.toString();
    router.replace(query ? `/admin/studio?${query}` : '/admin/studio');
  }, [router, searchParams]);

  const insertPromptText = useCallback((prompt: string) => {
    const handler = studioImperatives.get('promptTextInsert');
    if (handler) {
      handler(prompt);
      return true;
    }
    if (wideLayout || !selectedCardId) return false;
    pendingPromptTextRef.current.push(prompt);
    setMobileDestination('cards');
    writeStoredMobileAuthorDestination('cards');
    replaceStudioQuery((params) => {
      params.set('destination', 'cards');
      params.set('card', selectedCardId);
      params.delete('new');
      params.delete('collection');
      params.delete('media');
      params.delete('mediaReview');
    });
    return true;
  }, [replaceStudioQuery, selectedCardId, studioImperatives, wideLayout]);

  const selectMobileDestination = useCallback(async (destination: MobileAuthorDestination) => {
    if (destination === mobileDestination) return;
    if (mobileDestination === 'cards' && mobileCardEditorOpen) {
      const canLeave = await confirmComposeLeave();
      if (!canLeave) return;
    }
    setMobileDestination(destination);
    writeStoredMobileAuthorDestination(destination);
    replaceStudioQuery((params) => {
      params.set('destination', destination);
      params.delete('collection');
      if (destination !== 'media') params.delete('media');
      if (destination !== 'media') params.delete('mediaReview');
      if (destination !== 'cards' && destination !== 'prompts') {
        params.delete('card');
        params.delete('new');
      } else if (destination === 'prompts') {
        if (selectedCardId) params.set('card', selectedCardId);
        params.delete('new');
      }
    });
  }, [confirmComposeLeave, mobileCardEditorOpen, mobileDestination, replaceStudioQuery, selectedCardId]);

  const openCardInWorkspace = useCallback(async (
    cardId: string,
    preview?: Card | null
  ) => {
    const selected = await requestSelectCard(cardId, preview);
    if (!selected || wideLayout) return selected;
    setMobileDestination('cards');
    writeStoredMobileAuthorDestination('cards');
    replaceStudioQuery((params) => {
      params.set('destination', 'cards');
      params.set('card', cardId);
      params.delete('new');
      params.delete('collection');
      params.delete('media');
      params.delete('mediaReview');
    });
    return true;
  }, [replaceStudioQuery, requestSelectCard, wideLayout]);

  const showMobileCardsList = useCallback(async () => {
    const cleared = await requestClearSelectedCard();
    if (!cleared) return;
    setMobileDestination('cards');
    writeStoredMobileAuthorDestination('cards');
    replaceStudioQuery((params) => {
      params.set('destination', 'cards');
      params.delete('card');
      params.delete('new');
      params.delete('collection');
      params.delete('media');
      params.delete('mediaReview');
    });
  }, [replaceStudioQuery, requestClearSelectedCard]);

  const startMobileCard = useCallback(async () => {
    const cleared = await requestClearSelectedCard();
    if (!cleared) return;
    setMobileDestination('cards');
    writeStoredMobileAuthorDestination('cards');
    replaceStudioQuery((params) => {
      params.set('destination', 'cards');
      params.set('new', '1');
      params.delete('card');
      params.delete('collection');
      params.delete('media');
      params.delete('mediaReview');
    });
  }, [replaceStudioQuery, requestClearSelectedCard]);
  useEffect(() => {
    const handleMediaTagReconciliation = (event: Event) => {
      const detail = (event as CustomEvent<{ affectedCardIds?: string[] }>).detail;
      if (!selectedCardId || !detail?.affectedCardIds?.includes(selectedCardId)) return;
      void loadSelectedCard(selectedCardId, { quiet: true });
    };
    window.addEventListener('media-tag-reconciliation-complete', handleMediaTagReconciliation);
    return () =>
      window.removeEventListener('media-tag-reconciliation-complete', handleMediaTagReconciliation);
  }, [loadSelectedCard, selectedCardId]);
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
  const directMediaRequestRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedMediaId || directMediaRequestRef.current === requestedMediaId) return;
    directMediaRequestRef.current = requestedMediaId;
    void (async () => {
      const item = await loadMediaById(requestedMediaId);
      if (!item) {
        setActionError('The requested Media record is unavailable.');
        return;
      }
      setMobileDestination('media');
      setCardMediaItems([item]);
      setSelectedCardMediaId(item.docId);
      setCardMediaEditorOpen(true);
    })();
  }, [loadMediaById, requestedMediaId]);
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
  }, [loadMediaById, selectedDetailRef, selectedPreviewRef]);

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
              throwIfJsonApiFailed(res, data, 'This collection could not be updated. Try again.');
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
              throwIfJsonApiFailed(res, data, 'This collection could not be updated. Try again.');
              break;
            }
            case 'clear-root': {
              const res = await fetch(`/api/cards/${step.cardId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCollectionRoot: false }),
              });
              const data = await res.json().catch(() => ({}));
              throwIfJsonApiFailed(res, data, 'This collection could not be updated. Try again.');
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
      const pileHandled = await handleStudioPileMembershipDragEnd(event, resolvedOverId, {
        onMembershipChanged: () => studioImperatives.get('storyPileMembershipChanged')?.(),
        showToast: feedback.showToast,
        showSuccess: feedback.showSuccess,
        showError: feedback.showError,
      });
      if (pileHandled) return true;

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
    [actionBusy, bodyMediaInsertRef, bridgeCollectionsCardToSelectedParent, feedback, selectedCardId, selectedDetail, patchSelectedCard, resolveBankMediaById, studioImperatives]
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
        throwIfJsonApiFailed(res, data, 'This card could not be deleted. Try again.');

        cardsBankRemoveRef.current?.(id);
        removeCollectionsCardStructure(id);
        evictCard(id, fallbackCard);
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
    [
      evictCard,
      notifyQuestionCardDeleted,
      removeCollectionsCardStructure,
      router,
      selectNoneMedia,
      selectedCardId,
      selectedDetailRef,
      selectedPreviewRef,
      setCardError,
      setCardLoading,
    ]
  );
  const hasSelectedCardMedia = useMemo(
    () => collectAssignedMediaIds(selectedDetail ?? selectedPreview).length > 0,
    [selectedDetail, selectedPreview]
  );

  const registerStoryPileMembershipChanged = useCallback(
    (fn: (() => void | Promise<void>) | null) => {
      studioImperatives.register('storyPileMembershipChanged', fn);
    },
    [studioImperatives]
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
      insertPromptText,
      registerPromptTextInsert,
      bodyMediaInsertRef,
      registerStoryPileMembershipChanged,
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
      insertPromptText,
      registerPromptTextInsert,
      bodyMediaInsertRef,
      registerStoryPileMembershipChanged,
    ]
  );

  return (
    <StudioShellProvider value={studioShellValue}>
      <div className={`${styles.page} ${!wideLayout ? styles.pageMobile : ''}`}>
        <div className={`${cardAdminPageStyles.stickyTop} ${styles.studioChrome}`}>
          <div className={styles.studioHeaderRow}>
            <div className={styles.studioTitleRow}>
              <h1 className={`${cardAdminPageStyles.title} ${styles.studioPageTitle}`}>
                {wideLayout ? 'Studio' : MOBILE_DESTINATION_LABELS[mobileDestination]}
              </h1>
              {!wideLayout && mobilePresentation.cardsStage === 'compose' ? (
                <button
                  type="button"
                  className={styles.mobileHeaderButton}
                  onClick={() => void showMobileCardsList()}
                >
                  Back to Cards
                </button>
              ) : null}
              {!wideLayout && mobilePresentation.cardsStage === 'list' ? (
                <button
                  type="button"
                  className={styles.mobileHeaderButton}
                  onClick={() => void startMobileCard()}
                >
                  New Card
                </button>
              ) : null}
            </div>
            {wideLayout ? <div className={styles.studioPaneToolbar} aria-label="Studio panes">
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.tagsCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.tagsCollapsed}
                onClick={() => togglePane('tagsCollapsed')}
              >
                Tags
              </button>
              <button
                type="button"
                className={`${styles.studioPaneToggle} ${!paneVisibility.collectionsCollapsed ? styles.studioPaneToggleActive : ''}`}
                aria-pressed={!paneVisibility.collectionsCollapsed}
                onClick={() => togglePane('collectionsCollapsed')}
              >
                Collections
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
            </div> : null}
          </div>
        </div>
        <div className={wideLayout ? styles.grid : styles.gridStacked}>
          <div className={styles.collectionsHost}>
              <CollectionsAdminClient
              initialCollectionId={requestedCollectionId}
              onSelectCard={openCardInWorkspace}
              onDeleteCard={async (card) => {
                const confirmed = await feedback.confirm({
                  title: 'Delete card?',
                  message: `Delete “${card.title || card.subtitle || 'Untitled'}”? This permanently removes the card, not its Media.`,
                  confirmLabel: 'Delete',
                  cancelLabel: 'Cancel',
                  tone: 'danger',
                });
                if (!confirmed) return;
                await deleteSelectedCard(card.docId);
              }}
              selectedCardIdExternal={selectedCardId}
              embeddedExternalDragEnd={onStudioRelationshipDragEnd}
              embeddedOnStudioParentAttachComplete={(parentId) => {
                if (selectedCardId === parentId) {
                  void loadSelectedCard(parentId, { quiet: true });
                  return;
                }
                void openCardInWorkspace(parentId);
              }}
              embeddedTagsCollapsed={effectivePaneVisibility.tagsCollapsed}
              embeddedCollectionsCollapsed={effectivePaneVisibility.collectionsCollapsed}
              embeddedCardsCollapsed={effectivePaneVisibility.cardsCollapsed}
              embeddedRightSlotCollapsed={!wideLayout && mobilePresentation.rightSlotCollapsed}
              embeddedStacked={!wideLayout}
              embeddedRightSlotMinWidth={wideLayout ? embeddedRightSlotMinWidth : undefined}
              embeddedUnparentedReplacement={(ctx) => (
                  <StudioTreeCandidateCardBank
                    {...ctx}
                    autoSelectFirstCard={wideLayout && !newCardRequested}
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
                const showComposePane = !effectivePaneVisibility.composeCollapsed;
                const showQuestionsPane = !effectivePaneVisibility.questionsCollapsed;
                const showMediaPane = !effectivePaneVisibility.mediaCollapsed;
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
                      className={`${styles.studioMediaCardRow} ${!wideLayout ? styles.studioMediaCardRowMobile : ''}`}
                    >
                        {showComposePane ? (
                          <div
                            ref={cardEditColumnRef}
                            className={styles.studioCardEditInBankColumn}
                            style={wideLayout ? {
                              flex: `0 0 ${DEFAULT_CARD_EDIT_WIDTH}px`,
                              width: DEFAULT_CARD_EDIT_WIDTH,
                              minWidth: MIN_CARD_EDIT_PX,
                            } : {
                              flex: '1 1 auto',
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            <StudioCardEditPane
                              newCardRequested={newCardRequested && !selectedCardId}
                              onCardCreated={setSelectedCardId}
                              mobileStoryFlow={!wideLayout}
                            />
                          </div>
                        ) : null}
                        {showQuestionsPane ? (
                          <div
                            ref={questionsColumnRef}
                            className={styles.studioQuestionsColumn}
                            style={wideLayout ? {
                              flex: `0 0 ${DEFAULT_QUESTIONS_WIDTH}px`,
                              width: DEFAULT_QUESTIONS_WIDTH,
                              minWidth: MIN_QUESTIONS_PX,
                            } : {
                              flex: '1 1 auto',
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            <StudioQuestionsPane />
                          </div>
                        ) : null}
                        {showMediaPane ? (
                          <div className={styles.studioMediaBankColumn}>
                            <div className={styles.studioMediaBankFill}>
                              <MediaAdminContent
                                embedded
                                studioSourceDraggable
                                initialReviewMediaId={requestedMediaReviewId}
                              />
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
        {!wideLayout ? (
          <nav className={styles.mobileDestinationNav} aria-label="Author destinations">
            {MOBILE_AUTHOR_DESTINATIONS.map((destination) => (
              <button
                key={destination}
                type="button"
                className={`${styles.mobileDestinationButton} ${
                  destination === mobileDestination ? styles.mobileDestinationButtonActive : ''
                }`}
                aria-current={destination === mobileDestination ? 'page' : undefined}
                onClick={() => void selectMobileDestination(destination)}
              >
                {MOBILE_DESTINATION_LABELS[destination]}
              </button>
            ))}
          </nav>
        ) : null}
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
