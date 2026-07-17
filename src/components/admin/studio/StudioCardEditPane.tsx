'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CardForm from '@/components/admin/studio/cards/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import { useCardForm } from '@/components/providers/CardFormProvider';
import StudioCardFormShellSync from '@/components/admin/studio/StudioCardFormShellSync';
import StudioComposeFormActions from '@/components/admin/studio/StudioComposeFormActions';
import { StudioCardFormStudioProvider } from '@/components/admin/studio/studioCardFormStudioContext';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import PanelActivityOverlay from '@/components/admin/studio/PanelActivityOverlay';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';
import { useTag } from '@/components/providers/TagProvider';
import type { Card, CardUpdate } from '@/lib/types/card';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './StudioWorkspace.module.css';

function studioContextToInitialCard(card: StudioCardContext): Card {
  const { children, ...rest } = card;
  void children;
  return rest as Card;
}

function StudioCardTransitionOverlay({
  cardIsTransitioning,
}: {
  cardIsTransitioning: boolean;
}) {
  if (!cardIsTransitioning) return null;

  return (
    <PanelActivityOverlay
      active
      blocking={false}
      title="Opening card…"
      message="Bringing the selected card into Compose."
    />
  );
}

function StudioComposeLeaveGuardBridge() {
  const { confirmLeaveIfDirtyAsync } = useCardForm();
  const studioShell = useStudioShell();

  React.useEffect(() => {
    studioShell.registerComposeLeaveGuard(confirmLeaveIfDirtyAsync);
    return () => {
      studioShell.registerComposeLeaveGuard(null);
    };
  }, [confirmLeaveIfDirtyAsync, studioShell]);

  return null;
}

export default function StudioCardEditPane({
  newCardRequested = false,
  onCardCreated,
}: {
  newCardRequested?: boolean;
  onCardCreated?: (cardId: string) => void;
}) {
  const router = useRouter();
  const {
    selectedCardId,
    activeCardViewModel,
    cardLoading,
    cardError,
    setSelectedDetail,
    upsertCollectionsCardList,
  } = useStudioShell();
  const { tags: allTags } = useTag();
  const handleSave = useCallback(
    async (cardData: CardUpdate): Promise<Card | null> => {
      const isCreate = !selectedCardId;
      const res = await fetch(isCreate ? '/api/cards' : `/api/cards/${selectedCardId}`, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as Card & { message?: string; error?: string };
      throwIfJsonApiFailed(res, data, 'This card could not be saved. Your changes are still here. Try again.');
      if (isCreate && data.docId) {
        onCardCreated?.(data.docId);
        upsertCollectionsCardList(data as StudioCardContext);
        router.replace(`/admin/studio?card=${encodeURIComponent(data.docId)}`);
      } else if (selectedCardId) {
        setSelectedDetail(data as StudioCardContext);
        upsertCollectionsCardList(data as StudioCardContext);
      }
      return data;
    },
    [onCardCreated, router, selectedCardId, setSelectedDetail, upsertCollectionsCardList]
  );

  const initialCard = useMemo(() => {
    if (!activeCardViewModel.card) return null;
    return studioContextToInitialCard(activeCardViewModel.card as StudioCardContext);
  }, [activeCardViewModel.card]);
  const isTransitioningToDifferentCard = Boolean(
    selectedCardId && activeCardViewModel.card?.docId && activeCardViewModel.card.docId !== selectedCardId
  );

  /** Remount only when switching cards — not on `updatedAt` churn from relationship panel PATCHes (would wipe dirty form). */
  const providerKey =
    activeCardViewModel.card?.docId ?? selectedCardId ?? (newCardRequested ? 'new' : 'none');

  if (!selectedCardId && !newCardRequested) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderIntro}>
          Select a card in the tree or list to edit fields, body, cover, gallery, and tags here.
        </p>
      </aside>
    );
  }

  if (cardLoading && !activeCardViewModel.card) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderMeta}>Loading card…</p>
      </aside>
    );
  }

  if (cardError && !initialCard) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderError}>{cardError}</p>
      </aside>
    );
  }

  if (!initialCard && !newCardRequested) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderMeta}>Could not load card data.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.studioCardEditHost} aria-label="Compose">
      {activeCardViewModel.status === 'degraded' && activeCardViewModel.error && initialCard ? (
        <p className={styles.cardEditPlaceholderError}>{activeCardViewModel.error}</p>
      ) : null}
      <CardFormProvider
        key={providerKey}
        initialCard={newCardRequested ? null : initialCard}
        allTags={allTags}
        onSave={handleSave}
      >
        <StudioComposeLeaveGuardBridge />
        <StudioCardTransitionOverlay
          cardIsTransitioning={activeCardViewModel.status === 'preview' || isTransitioningToDifferentCard}
        />
        <div className={styles.studioComposeHeader}>
          <h2 className={styles.studioComposeTitle}>Compose</h2>
          <StudioComposeFormActions />
        </div>
        <div className={styles.studioCardEditScroll}>
          <StudioCardFormStudioProvider value={{ studioShellCardForm: true, enableStudioShellDnd: true }}>
            <StudioCardFormShellSync />
            <CardForm />
          </StudioCardFormStudioProvider>
        </div>
      </CardFormProvider>
    </aside>
  );
}
