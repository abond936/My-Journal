'use client';

import React, { Suspense, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './ViewPage.module.css';
import AdminFAB from '@/components/admin/card-admin/AdminFAB';
import CardFeedV2 from '@/components/view/CardFeedV2';

const SCROLL_POSITION_KEY = 'contentViewScrollPos';

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

  // Restore to edited card when returning from edit; otherwise restore prior scroll position.
  useEffect(() => {
    if (isInitialLoading || visibleCards.length === 0) return;

    if (focusCardId && consumedFocusRef.current !== focusCardId) {
      const el = document.querySelector(`[data-card-id="${focusCardId}"]`) as HTMLElement | null;
      if (el) {
        consumedFocusRef.current = focusCardId;
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
      }, 100); // Delay to allow DOM to render
    }
  }, [isInitialLoading, visibleCards.length, focusCardId]);

  const onSaveScrollPosition = useCallback(() => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
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
