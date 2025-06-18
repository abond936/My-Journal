'use client';

import React, { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import CardGrid from '@/components/view/CardGrid';
import styles from '@/components/view/CardGrid.module.css';
import Link from 'next/link';
import { useContentContext } from '@/components/providers/ContentProvider';
import AdminFAB from '@/components/admin/AdminFAB';

const SCROLL_POSITION_KEY = 'content_scroll_position';

// Custom hook for scroll restoration
function useScrollRestoration(key: string) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(key);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }

    return () => {
      // Intentionally not saving on unmount here, to use the 'beforeunload' event instead
    };
  }, [key]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(key, window.scrollY.toString());
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save on component unmount (e.g., navigation)
      sessionStorage.setItem(key, window.scrollY.toString());
    };
  }, [key]);

  return scrollRef;
}

// A simple hook for IntersectionObserver
function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const observer = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(node => {
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    if (node) {
      observer.current.observe(node);
    }
  }, [callback, options]);

  return ref;
}

export default function ViewPage() {
  const { content, loading, error, hasMore, loadingMore, loadMore } = useContentContext();
  useScrollRestoration(SCROLL_POSITION_KEY);

  // Add a ref to lock loadMore
  const loadingLock = useRef(false);

  const handleLoadMore = useCallback(() => {
    console.log('handleLoadMore triggered', { hasMore, loadingMore, loadingLock: loadingLock.current });
    if (hasMore && !loadingMore && !loadingLock.current) {
      loadingLock.current = true;
      loadMore();
      setTimeout(() => { loadingLock.current = false; }, 500); // Release lock after 500ms
    }
  }, [hasMore, loadingMore, loadMore]);

  const loadMoreRef = useIntersectionObserver(handleLoadMore, {
    rootMargin: '200px', // Load more when the user is 200px away from the bottom
  });

  // Console log for debugging
  React.useEffect(() => {
    console.log('Filtered Content:', content);
  }, [content]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;
  if (!content || content.length === 0) {
    return <div className={styles.empty}>No matching content found.</div>;
  }

  const mappedContent = content.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: 'excerpt' in item ? item.excerpt || '' : item.caption || '',
    date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    tags: item.tags,
    href: `/view/${item.type}-view/${item.id}`,
    editHref: `/admin/${item.type}-admin/${item.id}/edit?returnTo=/view`,
    imageUrl: item.coverPhoto || (item.type === 'album' && item.images && item.images.length > 0 ? item.images[0].path : undefined),
    images: item.type === 'album' ? item.images : undefined,
    size: item.size || 'medium',
    overlay: item.size === 'large'
  }));

  return (
    <div className={styles.entriesPage}>
      <CardGrid
        items={mappedContent}
      />
      <div ref={loadMoreRef} />
      {loadingMore && <div className={styles.loading}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
} 