'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import CardGrid from '@/components/view/CardGrid';
import styles from '@/components/view/CardGrid.module.css';
import Link from 'next/link';
import { useContent } from '@/lib/hooks/useContent';
import ContentTypeFilter from '@/components/view/ContentTypeFilter';
import AdminFAB from '@/components/admin/AdminFAB';

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
  const { content, loading, error, hasMore, loadingMore, loadMore } = useContent();

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
    imageUrl: item.coverPhoto || (item.type === 'album' && item.images && item.images.length > 0 ? item.images[0].path : undefined),
    images: item.type === 'album' ? item.images : undefined,
    size: item.size || 'medium',
    overlay: item.size === 'large'
  }));

  return (
    <div className={styles.entriesPage}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <ContentTypeFilter />
        </div>
      </header>
      <CardGrid
        items={mappedContent}
      />
      <div ref={loadMoreRef} />
      {loadingMore && <div className={styles.loading}>Loading more...</div>}
      <AdminFAB />
    </div>
  );
} 