'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './ViewPage.module.css';
import AdminFAB from '@/components/admin/card-admin/AdminFAB';
import CardFeed from '@/components/view/CardFeed';

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

export default function CardsPage() {
  const { cards, loadingMore, hasMore, loadMore, isLoading } = useCardContext();

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

  // Restore scroll position on page load
  useEffect(() => {
    if (!isLoading && cards.length > 0) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }, 100); // Delay to allow DOM to render
      }
    }
  }, [isLoading, cards.length]);

  const onSaveScrollPosition = useCallback(() => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
  }, []);
  
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>My Stories</h1>
      </header>
      <CardFeed 
        cards={cards} 
        loading={isLoading}
        loadMoreRef={loadMoreRef} 
        onSaveScrollPosition={onSaveScrollPosition}
      />
      <div ref={loadMoreRef} style={{ height: '100px' }} />
      {loadingMore && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
} 