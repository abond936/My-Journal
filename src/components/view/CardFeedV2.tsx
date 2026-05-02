'use client';

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/lib/types/card';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './CardFeedV2.module.css';
import V2ContentCard from './V2ContentCard';

export interface CardFeedSection {
  heading: string;
  cards: Card[];
}

interface CardFeedProps {
  cards: Card[];
  /** When set, render grouped sections instead of a flat grid. */
  sections?: CardFeedSection[] | null;
  loading: boolean;
  refreshing?: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: (cardId?: string) => void;
}

export default function CardFeedV2({
  cards,
  sections,
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
    feedGroupBy,
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

  const isEmpty =
    sections && sections.length > 0
      ? sections.every((s) => s.cards.length === 0)
      : cards.length === 0;

  if (isEmpty) {
    const hasTagOrTypeFilters =
      selectedTags.length > 0 || isFeedCardTypesFilterActive || Boolean(searchTerm?.trim());
    const hasCollectionOrGroup =
      collectionId !== null || feedGroupBy !== 'none' || activeDimension === 'collections';
    const likelyFiltered = hasTagOrTypeFilters || hasCollectionOrGroup;

    return (
      <main className={styles.feedMain}>
        <div className={styles.emptyFeed}>
          <p className={styles.emptyFeedTitle}>No cards match the current view.</p>
          {likelyFiltered ? (
            <p className={styles.emptyFeedHint}>
              Tag, type, search, collection, or &ldquo;group by&rdquo; may be limiting results.
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
          {likelyFiltered ? (
            <button type="button" className={styles.emptyClearButton} onClick={() => clearFilters()}>
              Clear filters
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  const renderGrid = (items: Card[]) => (
    <div className={styles.grid}>
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
          <div className={styles.curatedContextLabel}>Collection</div>
          <h2 className={styles.curatedContextTitle}>
            {activeCollectionCard.title || activeCollectionCard.subtitle || 'Untitled'}
          </h2>
        </div>
      ) : null}
      {sections && sections.length > 0 ? (
        sections.map((section, idx) => {
          const sid = `feed-grp-${idx}`;
          return (
            <section key={sid} className={styles.groupSection} aria-labelledby={sid}>
              <h2 id={sid} className={styles.groupHeading}>
                {section.heading}
              </h2>
              {renderGrid(section.cards)}
            </section>
          );
        })
      ) : (
        renderGrid(cards)
      )}

      <div ref={loadMoreRef} />
    </main>
  );
}
