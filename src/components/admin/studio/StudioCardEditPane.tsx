'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { useRouter } from 'next/navigation';
import CardForm from '@/components/admin/card-admin/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import StudioCardFormShellSync from '@/components/admin/studio/StudioCardFormShellSync';
import StudioComposeFormActions from '@/components/admin/studio/StudioComposeFormActions';
import { StudioCardFormStudioProvider } from '@/components/admin/studio/studioCardFormStudioContext';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
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
    selectedCard,
    cardLoading,
    cardError,
    setSelectedCard,
    refreshCollectionsCardList,
  } = useStudioShell();
  const { tags: allTags } = useTag();
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
      throwIfJsonApiFailed(res, data, 'Failed to save card');
      if (isCreate && data.docId) {
        onCardCreated?.(data.docId);
        router.replace(`/admin/studio?card=${encodeURIComponent(data.docId)}`);
      } else if (selectedCardId) {
        setSelectedCard(data as StudioCardContext);
      }
      refreshCollectionsCardList();
      void globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
        undefined,
        { revalidate: true }
      );
      return data;
    },
    [onCardCreated, refreshCollectionsCardList, router, selectedCardId, setSelectedCard]
  );

  const initialCard = useMemo(() => {
    if (!selectedCard) return null;
    return studioContextToInitialCard(selectedCard);
  }, [selectedCard]);
  const isTransitioningToDifferentCard = Boolean(
    selectedCardId && selectedCard?.docId && selectedCard.docId !== selectedCardId
  );

  const handleWheelCapture = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input[type="range"]')) return;
    el.scrollTop += e.deltaY;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /** Remount only when switching cards — not on `updatedAt` churn from relationship panel PATCHes (would wipe dirty form). */
  const providerKey =
    selectedCard?.docId ?? selectedCardId ?? (newCardRequested ? 'new' : 'none');

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

  if (cardLoading && !selectedCard) {
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
      <h2 className={styles.studioComposeTitle}>Compose</h2>
      {cardError && initialCard ? (
        <p className={styles.cardEditPlaceholderError}>{cardError}</p>
      ) : null}
      {isTransitioningToDifferentCard ? (
        <p className={styles.cardEditPlaceholderMeta}>Loading selected card...</p>
      ) : null}
      <CardFormProvider
        key={providerKey}
        initialCard={newCardRequested ? null : initialCard}
        allTags={allTags}
        onSave={handleSave}
      >
        <div className={styles.studioCardEditToolbar}>
          <StudioComposeFormActions />
        </div>
        <div
          ref={scrollRef}
          className={styles.studioCardEditScroll}
          onWheelCapture={handleWheelCapture}
        >
          <StudioCardFormStudioProvider value={{ studioShellCardForm: true, enableStudioShellDnd: true }}>
            <StudioCardFormShellSync />
            <CardForm />
          </StudioCardFormStudioProvider>
        </div>
      </CardFormProvider>
    </aside>
  );
}
