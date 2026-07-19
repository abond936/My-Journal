'use client';

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/lib/types/card';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './CardFeedV2.module.css';
import V2ContentCard from './V2ContentCard';

interface CardFeedProps {
  cards: Card[];
  loading: boolean;
  refreshing?: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: (cardId?: string) => void;
}

export default function CardFeedV2({
  cards,
  loading,
  refreshing = false,
  loadMoreRef,
  onSaveScrollPosition,
}: CardFeedProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const {
    clearFilters,
    selectedTags,
    isFeedCardTypesFilterActive,
    searchTerm,
    activeDimension,
    collectionId,
    collectionTreeCards,
    readerMode,
    isGuidedCollectionTransition,
    guidedTransitionTitle,
    readerTagFilterScope,
  } = useCardContext();

  const activeCollectionCard =
    activeDimension === 'collections' && collectionId
      ? collectionTreeCards.find((card) => card.docId === collectionId) ?? null
      : null;
  const curatedContextRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    if (!activeCollectionCard || !curatedContextRef.current) {
      body.classList.remove('curated-feed-active');
      root.style.removeProperty('--curated-context-bar-height');
      return;
    }

    const updateHeight = () => {
      const height = curatedContextRef.current?.offsetHeight ?? 0;
      root.style.setProperty('--curated-context-bar-height', `${height}px`);
    };

    body.classList.add('curated-feed-active');
    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      body.classList.remove('curated-feed-active');
      root.style.removeProperty('--curated-context-bar-height');
      window.removeEventListener('resize', updateHeight);
    };
  }, [activeCollectionCard]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main>Loading...</main>
      </div>
    );
  }

  if (isGuidedCollectionTransition) {
    return (
      <main className={styles.feedMain} aria-busy="true" aria-live="polite">
        <div className={styles.guidedTransition}>
          <p className={styles.guidedTransitionTitle}>
            {guidedTransitionTitle ? `Loading ${guidedTransitionTitle}...` : 'Loading this guided section...'}
          </p>
          <p className={styles.guidedTransitionHint}>The next part of the guided journal is opening.</p>
        </div>
      </main>
    );
  }

  const isEmpty = cards.length === 0;

  if (isEmpty) {
    const isCollectionsListMode = activeDimension === 'collections' && collectionId === null;
    const hasTagOrTypeFilters =
      selectedTags.length > 0 || isFeedCardTypesFilterActive || Boolean(searchTerm?.trim());
    const likelyFiltered = hasTagOrTypeFilters || collectionId !== null;

    return (
      <main className={styles.feedMain}>
        <div className={styles.emptyFeed}>
          <p className={styles.emptyFeedTitle}>
            {isCollectionsListMode ? 'No guided collections to show.' : 'No cards match the current view.'}
          </p>
          {isCollectionsListMode ? (
            <p className={styles.emptyFeedHint}>
              {readerMode === 'guided'
                ? 'There are no collection roots yet, or none are visible at your access level. Switch to Freeform to browse cards by tag, or create collections in Studio.'
                : 'Select a collection in the sidebar or switch browsing mode.'}
            </p>
          ) : likelyFiltered ? (
            <p className={styles.emptyFeedHint}>
              {collectionId !== null
                ? 'This guided section does not have visible cards yet.'
                : readerTagFilterScope === 'subject'
                  ? 'Tag match is set to Subject only — only cards with a marked subject tag for the selected filter will appear. Try Any assigned, or mark subjects in Studio.'
                  : 'Tag, type, search, or collection may be limiting results.'}
            </p>
          ) : !isAdmin ? (
            <p className={styles.emptyFeedHint}>
              Signed-in family members only see <strong>published</strong> cards. Drafts stay hidden
              until the author publishes them.
            </p>
          ) : (
            <p className={styles.emptyFeedHint}>
              If you expect cards here, confirm they exist in Admin → Cards and are not filtered out
              by curation or tags.
            </p>
          )}
          {likelyFiltered && !isCollectionsListMode ? (
            <button type="button" className={styles.emptyClearButton} onClick={() => clearFilters()}>
              Clear filters
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  const renderGrid = (items: Card[]) => (
    <div
      className={`${styles.grid} ${activeDimension === 'collections' ? styles.guidedGrid : ''}`}
      data-feed-virtualization="css-containment"
    >
      {items.map((card) => (
        <V2ContentCard
          key={card.docId}
          card={card}
          size="medium"
          onClick={card.docId ? () => onSaveScrollPosition(card.docId) : undefined}
          onBeforeNavigateToAdminEdit={onSaveScrollPosition}
        />
      ))}
    </div>
  );

  return (
    <main className={styles.feedMain}>
      {refreshing ? (
        <div className={styles.refreshingNotice} aria-live="polite">
          Refreshing the journal view...
        </div>
      ) : null}
      {activeCollectionCard ? (
        <div ref={curatedContextRef} className={styles.curatedContextBar}>
          <h2 className={styles.curatedContextTitle}>
            {activeCollectionCard.title || activeCollectionCard.subtitle || 'Untitled'}
          </h2>
        </div>
      ) : null}
      {renderGrid(cards)}

      <div ref={loadMoreRef} />
    </main>
  );
}
