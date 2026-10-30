'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/lib/types/card';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './CardFeedV2.module.css';
import V2ContentCard from './V2ContentCard';
import { resolveCuratedPathToCard } from '@/lib/utils/curatedCollectionTree';
import { useTag } from '@/components/providers/TagProvider';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import { useReaderSidebar } from '@/components/common/ReaderSidebarContext';
import CollectionIntroduction, {
  hasCollectionIntroduction,
} from '@/components/view/CollectionIntroduction';

type FeedDimension = 'who' | 'what' | 'when' | 'where';

const FEED_DIMENSIONS: Array<{ id: FeedDimension; label: string }> = [
  { id: 'who', label: 'Who' },
  { id: 'what', label: 'What' },
  { id: 'when', label: 'When' },
  { id: 'where', label: 'Where' },
];

interface CardFeedProps {
  cards: Card[];
  loading: boolean;
  refreshing?: boolean;
  showFeedContext?: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: (cardId?: string) => void;
}

export default function CardFeedV2({
  cards,
  loading,
  refreshing = false,
  showFeedContext,
  loadMoreRef,
  onSaveScrollPosition,
}: CardFeedProps) {
  const { data: session } = useSession();
  const { tags } = useTag();
  const { openFeedDimension } = useReaderSidebar();
  const isAdmin = session?.user?.role === 'admin';
  const {
    clearFilters,
    selectedTags,
    isFeedCardTypesFilterActive,
    searchTerm,
    activeDimension,
    collectionId,
    collectionPathIds,
    collectionTreeCards,
    activeCollectionIntroductionCard,
    readerMode,
    isGuidedCollectionTransition,
    guidedTransitionTitle,
    readerTagFilterScope,
  } = useCardContext();

  const activeCollectionCard =
    activeDimension === 'collections' && collectionId
      ? collectionTreeCards.find((card) => card.docId === collectionId) ?? null
      : null;
  const activeCollectionPath = useMemo(
    () => collectionId
      ? resolveCuratedPathToCard(collectionTreeCards, collectionId, collectionPathIds)
      : [],
    [collectionId, collectionPathIds, collectionTreeCards]
  );
  const curatedContextRef = useRef<HTMLDivElement | null>(null);

  const selectedTagsByDimension = useMemo(() => {
    const dimensionById = buildResolvedTagDimensionMap(tags);
    const groups: Record<FeedDimension, string[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };
    const tagById = new Map(tags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));

    selectedTags.forEach((tagId) => {
      const dimension = dimensionById.get(tagId);
      if (!dimension) return;
      groups[dimension].push(tagById.get(tagId)?.name ?? tagId);
    });

    return groups;
  }, [selectedTags, tags]);

  const renderFeedContext = () => {
    if (showFeedContext === false || (showFeedContext === undefined && readerMode !== 'freeform')) return null;
    return (
      <section className={styles.feedContextBar} aria-labelledby="feed-context-title">
        <div className={styles.feedContextHeadingRow}>
          <div>
            <p className={styles.feedContextLabel}>Stories from</p>
            <p className={styles.feedContextAuthor}>This archive</p>
          </div>
          <h1 id="feed-context-title" className={styles.feedContextTitle}>Feed</h1>
        </div>
        <div className={styles.feedDimensionSummary} aria-label="Feed tag filters">
          {FEED_DIMENSIONS.map(({ id, label }) => {
            const values = selectedTagsByDimension[id];
            return (
              <button
                key={id}
                type="button"
                className={styles.feedDimensionButton}
                data-feed-dimension={id}
                onClick={() => openFeedDimension(id)}
                aria-label={`Open ${label} filters`}
              >
                <span className={styles.feedDimensionLabel}>{label}</span>
                <span className={styles.feedDimensionValues}>
                  {values.length > 0
                    ? values.map((value) => <span key={value}>{value}</span>)
                    : <span className={styles.feedDimensionAll}>All</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCuratedContext = () => {
    if (!activeCollectionCard) return null;
    const ancestors = activeCollectionPath.slice(0, -1);
    const introductionCard =
      activeCollectionIntroductionCard?.docId === activeCollectionCard.docId
        ? activeCollectionIntroductionCard
        : null;
    const hasIntroduction = hasCollectionIntroduction(introductionCard);
    return (
      <div
        ref={curatedContextRef}
        className={`${styles.curatedContextBar} ${hasIntroduction ? styles.curatedContextBarWithIntroduction : ''}`}
      >
        <p className={styles.curatedContextLabel}>Collection</p>
        {ancestors.length > 0 ? (
          <nav aria-label="Collection breadcrumb">
            <ol className={styles.curatedBreadcrumbs}>
              {ancestors.map((card) => (
                <li key={card.docId}>{card.title || card.subtitle || 'Untitled'}</li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className={styles.curatedContextTitleRow}>
          <h2 className={styles.curatedContextTitle}>
            {activeCollectionCard.title || activeCollectionCard.subtitle || 'Untitled'}
          </h2>
          <span className={styles.curatedContextCount}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>
        {introductionCard ? (
          <CollectionIntroduction card={introductionCard} />
        ) : null}
      </div>
    );
  };

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
        {renderFeedContext()}
        <main>Loading...</main>
      </div>
    );
  }

  if (isGuidedCollectionTransition) {
    return (
      <main className={styles.feedMain} aria-busy="true" aria-live="polite">
        {renderFeedContext()}
        {renderCuratedContext()}
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
        {renderFeedContext()}
        {renderCuratedContext()}
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
      {renderFeedContext()}
      {refreshing ? (
        <div className={styles.refreshingNotice} aria-live="polite">
          Refreshing the journal view...
        </div>
      ) : null}
      {renderCuratedContext()}
      {renderGrid(cards)}

      <div ref={loadMoreRef} />
    </main>
  );
}
