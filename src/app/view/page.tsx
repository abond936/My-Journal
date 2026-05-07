'use client';

import React, { Suspense, useRef, useCallback, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './ViewPage.module.css';
import AdminFAB from '@/components/admin/card-admin/AdminFAB';
import CardFeedV2 from '@/components/view/CardFeedV2';

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

function ViewPageContent() {
  const {
    visibleCards,
    visibleFeedSections,
    loadingMore,
    hasMore,
    loadMore,
    isInitialLoading,
    isRefreshing,
    error,
  } =
    useCardContext();
  const searchParams = useSearchParams();
  const focusCardId = searchParams.get('focusCardId');
  const consumedFocusRef = useRef<string | null>(null);
  const prepositionedFocusRef = useRef<string | null>(null);

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
  }, [isInitialLoading, visibleCards.length, focusCardId]);

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
  
  if (error) {
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

  return (
    <div className={styles.page}>
      <CardFeedV2
        cards={visibleCards}
        sections={visibleFeedSections}
        loading={isInitialLoading}
        refreshing={isRefreshing}
        loadMoreRef={loadMoreRef}
        onSaveScrollPosition={onSaveScrollPosition}
      />
      {loadingMore && <div className={styles.loadingMore}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
}

function ViewPageFallback() {
  return (
    <div className={styles.page}>
      <CardFeedV2
        cards={[]}
        sections={null}
        loading
        refreshing={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<ViewPageFallback />}>
      <ViewPageContent />
    </Suspense>
  );
}
