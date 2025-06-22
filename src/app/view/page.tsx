'use client';

import React, { useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './CardList.module.css'; // Use the new, correct stylesheet
import AdminFAB from '@/components/admin/card-admin/AdminFAB';
import { getDisplayUrl } from '@/lib/utils/photoUtils';

const SCROLL_POSITION_KEY = 'cards_feed_scroll_position';

// Custom hook for scroll restoration (from legacy /view page)
function useScrollRestoration(key: string) {
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(key);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }
  }, [key]);

  const handleScroll = useCallback(() => {
    sessionStorage.setItem(key, window.scrollY.toString());
  }, [key]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [key, handleScroll]);
}

// Custom hook for IntersectionObserver (from legacy /view page)
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

// This is the inner component that renders the UI, now matching the prototype.
const CardFeed = () => {
  const { cards, loadingMore, hasMore, loadMore, isLoading } = useCardContext();
  useScrollRestoration(SCROLL_POSITION_KEY);

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

  if (isLoading) {
    // A simple loading state
    return <div className={styles.page}><header className={styles.header}><h1>My Stories</h1></header><main>Loading...</main></div>;
  }
  
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>My Stories</h1>
        {/* TODO: Add Filter UI components here */}
      </header>
      <main className={styles.grid}>
        {cards.map(card => (
          <Link key={card.id} href={`/view/${card.id}`} className={styles.cardLink}>
            <div className={styles.card}>
              {card.coverImage && (
                <img
                  src={getDisplayUrl(card.coverImage)} 
                  alt={card.title}
                  className={styles.cardImage}
                />
              )}
              <div className={styles.cardOverlay}>
                <h2 className={styles.cardTitle}>{card.title}</h2>
                {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
              </div>
            </div>
          </Link>
        ))}
      </main>
      <div ref={loadMoreRef} style={{ height: '100px' }} />
      {loadingMore && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
};

// This is the main page component. It now just renders the CardFeed.
export default function CardsPage() {
  return <CardFeed />;
} 