'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { mutate as globalMutate } from 'swr';
import CardForm from '@/components/admin/card-admin/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import StudioCardFormShellSync from '@/components/admin/studio/StudioCardFormShellSync';
import { StudioCardFormStudioProvider } from '@/components/admin/studio/studioCardFormStudioContext';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';
import { useTag } from '@/components/providers/TagProvider';
import type { Card, CardUpdate } from '@/lib/types/card';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './StudioWorkspace.module.css';

function studioContextToInitialCard(card: StudioCardContext): Card {
  const { children: _children, ...rest } = card;
  return rest as Card;
}

export default function StudioCardEditPane() {
  const {
    selectedCardId,
    selectedCard,
    cardLoading,
    cardError,
    loadSelectedCard,
    refreshCollectionsCardList,
  } = useStudioShell();
  const { tags: allTags } = useTag();

  const handleSave = useCallback(
    async (cardData: CardUpdate): Promise<Card | null> => {
      if (!selectedCardId) return null;
      const res = await fetch(`/api/cards/${selectedCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as Card & { message?: string; error?: string };
      throwIfJsonApiFailed(res, data, 'Failed to save card');
      await loadSelectedCard(selectedCardId, { quiet: true });
      refreshCollectionsCardList();
      void globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
        undefined,
        { revalidate: true }
      );
      return data;
    },
    [selectedCardId, loadSelectedCard, refreshCollectionsCardList]
  );

  const initialCard = useMemo(() => {
    if (!selectedCard) return null;
    return studioContextToInitialCard(selectedCard);
  }, [selectedCard]);

  /** Remount only when switching cards — not on `updatedAt` churn from relationship panel PATCHes (would wipe dirty form). */
  const providerKey = selectedCardId ?? 'none';

  if (!selectedCardId) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderIntro}>
          Select a card in the tree or list to edit fields, body, cover, gallery, and tags here. Delete, duplicate, and
          full-page chrome stay on{' '}
          <Link href="/admin/card-admin" className={styles.studioCardEditChromeLink}>
            Card admin
          </Link>
          .
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

  if (cardError) {
    return (
      <aside className={styles.cardEditPlaceholder} aria-label="Compose">
        <h2 className={styles.studioComposeTitle}>Compose</h2>
        <p className={styles.cardEditPlaceholderError}>{cardError}</p>
      </aside>
    );
  }

  if (!initialCard) {
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
      <div className={styles.studioCardEditToolbar}>
        <Link
          href={`/admin/card-admin/${selectedCardId}/edit`}
          className={styles.studioCardEditChromeLink}
          target="_blank"
          rel="noreferrer"
        >
          Open full page
        </Link>
      </div>
      <div className={styles.studioCardEditScroll}>
        <StudioCardFormStudioProvider value={{ studioShellCardForm: true }}>
          <CardFormProvider key={providerKey} initialCard={initialCard} allTags={allTags} onSave={handleSave}>
            <StudioCardFormShellSync />
            <CardForm />
          </CardFormProvider>
        </StudioCardFormStudioProvider>
      </div>
    </aside>
  );
}
