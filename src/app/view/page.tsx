'use client';

import React, { Suspense, useRef, useCallback, useEffect } from 'react';
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
  useEffect(() => {
    if (isInitialLoading || visibleCards.length === 0) return;

    const pendingFocusCardId = focusCardId ?? sessionStorage.getItem(FOCUS_CARD_KEY);
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);

    if (pendingFocusCardId && consumedFocusRef.current !== pendingFocusCardId) {
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 20;

      const tryRestoreFocus = () => {
        if (cancelled) return;

        const el = document.querySelector(`[data-card-id="${pendingFocusCardId}"]`) as HTMLElement | null;
        if (el) {
          consumedFocusRef.current = pendingFocusCardId;
          sessionStorage.removeItem(FOCUS_CARD_KEY);
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
          window.requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          return;
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          window.setTimeout(tryRestoreFocus, 120);
          return;
        }

        if (savedPosition) {
          window.scrollTo(0, parseInt(savedPosition, 10));
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }
        sessionStorage.removeItem(FOCUS_CARD_KEY);
      };

      tryRestoreFocus();

      return () => {
        cancelled = true;
      };
    }

    if (savedPosition) {
      const y = parseInt(savedPosition, 10);
      if (!Number.isNaN(y)) {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, y);
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        });
      } else {
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
      }
    }
  }, [isInitialLoading, visibleCards.length, focusCardId]);

  const onSaveScrollPosition = useCallback((cardId?: string) => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    if (cardId) {
      sessionStorage.setItem(FOCUS_CARD_KEY, cardId);
    }
  }, []);
  
  if (error) {
    return (
      <div className={`${styles.page} ${styles.errorState}`} role="alert">
        <p className={styles.errorTitle}>Could not load the feed.</p>
        <pre className={styles.errorDetail}>{error instanceof Error ? error.message : String(error)}</pre>
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
