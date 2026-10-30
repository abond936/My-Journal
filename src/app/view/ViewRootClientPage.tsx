'use client';

import React, { Suspense, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCardContext } from '@/components/providers/CardProvider';
import { parseReaderEntryMode, READER_LAST_MODE_KEY } from '@/lib/utils/readerEntry';
import styles from './ViewPage.module.css';
import AdminFAB from '@/components/admin/studio/cards/AdminFAB';
import CardFeedV2 from '@/components/view/CardFeedV2';
import ViewMediaFeed from '@/components/view/ViewMediaFeed';
import ReaderHome from '@/components/view/ReaderHome';
import DurableCollectionFeed from '@/components/view/DurableCollectionFeed';
import { useDurableCollectionReader } from '@/components/view/useDurableCollectionReader';

const SCROLL_POSITION_KEY = 'contentViewScrollPos';
const FOCUS_CARD_KEY = 'contentViewFocusCardId';

function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, options);
    if (node) observer.current.observe(node);
  }, [callback, options]);
  return ref;
}

function ViewPageContent({ explicitMode }: { explicitMode: 'guided' | 'freeform' }) {
  const {
    visibleCards,
    loadingMore,
    hasMore,
    loadMore,
    isInitialLoading,
    isRefreshing,
    error,
    browseTarget,
    readerMode,
    setReaderMode,
    isGuidedCollectionTransition,
  } =
    useCardContext();
  const searchParams = useSearchParams();
  const focusCardId = searchParams.get('focusCardId');
  const consumedFocusRef = useRef<string | null>(null);
  const prepositionedFocusRef = useRef<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(READER_LAST_MODE_KEY, explicitMode);
    if (readerMode !== explicitMode) setReaderMode(explicitMode);
  }, [explicitMode, readerMode, setReaderMode]);

  const loadingLock = useRef(false);
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loadingLock.current) {
      loadingLock.current = true;
      loadMore();
      setTimeout(() => { loadingLock.current = false; }, 500);
    }
  }, [hasMore, loadingMore, loadMore]);

  const loadMoreRef = useIntersectionObserver(handleLoadMore, {
    rootMargin: '400px',
  });

  // Restore to the last opened or edited card once the feed has rendered it.
  useLayoutEffect(() => {
    if (isGuidedCollectionTransition) {
      sessionStorage.removeItem(FOCUS_CARD_KEY);
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
      return;
    }
    if (isInitialLoading || visibleCards.length === 0) return;

    const pendingFocusCardId = focusCardId ?? sessionStorage.getItem(FOCUS_CARD_KEY);
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    const parsedSavedPosition = savedPosition ? parseInt(savedPosition, 10) : Number.NaN;

    if (pendingFocusCardId && consumedFocusRef.current !== pendingFocusCardId) {
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 20;

      if (!Number.isNaN(parsedSavedPosition) && prepositionedFocusRef.current !== pendingFocusCardId) {
        window.scrollTo(0, parsedSavedPosition);
        prepositionedFocusRef.current = pendingFocusCardId;
      }

      const tryRestoreFocus = () => {
        if (cancelled) return;

        const el = document.querySelector(`[data-card-id="${pendingFocusCardId}"]`) as HTMLElement | null;
        if (el) {
          consumedFocusRef.current = pendingFocusCardId;
          prepositionedFocusRef.current = null;
          sessionStorage.removeItem(FOCUS_CARD_KEY);
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
          el.scrollIntoView({ block: 'center' });
          return;
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          window.setTimeout(tryRestoreFocus, 120);
          return;
        }

        if (!Number.isNaN(parsedSavedPosition)) {
          window.scrollTo(0, parsedSavedPosition);
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }
        prepositionedFocusRef.current = null;
        sessionStorage.removeItem(FOCUS_CARD_KEY);
      };

      tryRestoreFocus();

      return () => {
        cancelled = true;
      };
    }

    if (!Number.isNaN(parsedSavedPosition)) {
      window.scrollTo(0, parsedSavedPosition);
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
      prepositionedFocusRef.current = null;
    } else if (savedPosition) {
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
    }
  }, [isGuidedCollectionTransition, isInitialLoading, visibleCards.length, focusCardId]);

  const onSaveScrollPosition = useCallback((cardId?: string) => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    if (cardId) {
      sessionStorage.setItem(FOCUS_CARD_KEY, cardId);
    }
  }, []);

  const feedErrorMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'The journal view could not refresh right now.';
  
  if (browseTarget === 'media' && readerMode === 'freeform') {
    return (
      <div className={styles.page}>
        <ViewMediaFeed />
        <AdminFAB />
      </div>
    );
  }

  if (error) {
    const hasFeedContent = visibleCards.length > 0;
    if (!hasFeedContent && !isInitialLoading) {
      return (
        <div className={`${styles.page} ${styles.errorState}`} role="alert">
          <p className={styles.errorTitle}>This view could not update right now.</p>
          <p className={styles.errorDetail}>{feedErrorMessage}</p>
          <p className={styles.errorDetail}>
            Try clearing filters or reloading the page in a moment.
          </p>
        </div>
      );
    }
  }

  return (
    <div className={styles.page}>
      <CardFeedV2
        cards={visibleCards}
        loading={isInitialLoading}
        refreshing={isRefreshing}
        showFeedContext={explicitMode === 'freeform'}
        loadMoreRef={loadMoreRef}
        onSaveScrollPosition={onSaveScrollPosition}
      />
      {loadingMore && <div className={styles.loadingMore}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
}

function ViewRouteContent() {
  const searchParams = useSearchParams();
  const explicitMode = parseReaderEntryMode(searchParams.get('mode'));
  const durable = useDurableCollectionReader(explicitMode === 'guided');

  if (!explicitMode) return <ReaderHome />;
  if (explicitMode === 'guided') {
    if (durable.loading) return <ViewPageFallback />;
    if (durable.error) {
      return (
        <div className={`${styles.page} ${styles.errorState}`} role="alert">
          <p className={styles.errorTitle}>Collections could not be loaded.</p>
          <p className={styles.errorDetail}>Reload Reader to try again.</p>
        </div>
      );
    }
    if (durable.hasDurableCollections && durable.structure) {
      return (
        <DurableCollectionFeed
          structure={durable.structure}
          selectedPlacementId={durable.selectedPlacementId}
        />
      );
    }
  }
  return <ViewPageContent explicitMode={explicitMode} />;
}

function ViewPageFallback() {
  return (
    <div className={styles.page}>
      <CardFeedV2
        cards={[]}
        loading
        refreshing={false}
        showFeedContext={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    </div>
  );
}

export default function ViewRootClientPage() {
  return (
    <Suspense fallback={<ViewPageFallback />}>
      <ViewRouteContent />
    </Suspense>
  );
}
