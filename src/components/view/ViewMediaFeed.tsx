'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { PaginatedResult } from '@/lib/types/services';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './ViewMediaFeed.module.css';

function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = useCallback(
    (node: Element | null | undefined) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) callback();
      }, options);
      if (node) observer.current.observe(node);
    },
    [callback, options]
  );
  return ref;
}

function dedupeMediaByDocId(items: Media[]): Media[] {
  const seen = new Set<string>();
  const out: Media[] = [];
  for (const item of items) {
    const id = item.docId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

export default function ViewMediaFeed() {
  const {
    selectedTags,
    searchTerm,
    includeSubTagsInFeed,
    clearFilters,
  } = useCardContext();
  const { tags: allTags } = useTag();
  const [lightboxMedia, setLightboxMedia] = useState<Media | null>(null);

  const dimensionalTags = useMemo(() => {
    const grouped: Partial<Record<'who' | 'what' | 'when' | 'where', string[]>> = {};
    selectedTags.forEach((tagId) => {
      const tag = allTags.find((t) => t.docId === tagId);
      if (!tag?.dimension) return;
      const dim = String(tag.dimension) === 'reflection' ? 'what' : tag.dimension;
      if (dim !== 'who' && dim !== 'what' && dim !== 'when' && dim !== 'where') return;
      if (!grouped[dim]) grouped[dim] = [];
      grouped[dim]!.push(tagId);
    });
    return grouped;
  }, [allTags, selectedTags]);

  const fetcher = useCallback(async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();
    let data: PaginatedResult<Media> & { message?: string } = { items: [], hasMore: false };
    try {
      data = text ? JSON.parse(text) : data;
    } catch {
      // Keep fallback shape
    }
    if (!response.ok) {
      throw new Error(data.message?.trim() || `Could not load media (${response.status}).`);
    }
    return data;
  }, []);

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite<PaginatedResult<Media>>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const params = new URLSearchParams();
      params.set('limit', '40');
      params.set('page', String(pageIndex + 1));
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (pageIndex > 0 && previousPageData?.lastDocId) params.set('lastDocId', previousPageData.lastDocId);

      for (const [dim, ids] of Object.entries(dimensionalTags) as Array<
        ['who' | 'what' | 'when' | 'where', string[] | undefined]
      >) {
        if (!ids?.length) continue;
        const key = includeSubTagsInFeed ? dim : `exact${dim[0].toUpperCase()}${dim.slice(1)}`;
        params.set(key, ids.join(','));
      }

      return `/api/view/media?${params.toString()}`;
    },
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const media = useMemo(() => {
    const flat = (Array.isArray(data) ? data : []).flatMap((page) => page.items);
    return dedupeMediaByDocId(flat);
  }, [data]);

  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const loadingMore = isValidating && size > 1;
  const refreshing = !isLoading && !loadingMore && isValidating;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isValidating) return;
    void setSize((current) => current + 1);
  }, [hasMore, isValidating, setSize]);

  const loadMoreRef = useIntersectionObserver(handleLoadMore, { rootMargin: '500px' });

  const hasFilters = selectedTags.length > 0 || Boolean(searchTerm.trim());

  if (error) {
    return (
      <main className={styles.feedMain}>
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>This media view could not update right now.</p>
          <p className={styles.errorDetail}>
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
        </div>
      </main>
    );
  }

  if (isLoading && media.length === 0) {
    return (
      <main className={styles.feedMain}>
        <div className={styles.loadingState}>Loading media...</div>
      </main>
    );
  }

  if (media.length === 0) {
    return (
      <main className={styles.feedMain}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No media match the current view.</p>
          <p className={styles.emptyHint}>
            {hasFilters ? 'Try broadening the selected tags or search.' : 'There is no media to show here yet.'}
          </p>
          {hasFilters ? (
            <button type="button" className={styles.emptyClearButton} onClick={() => clearFilters()}>
              Clear filters
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={styles.feedMain}>
        {refreshing ? (
          <div className={styles.refreshingNotice} aria-live="polite">
            Refreshing the media view...
          </div>
        ) : null}
        <div className={styles.masonry}>
          {media.map((item) => (
            <button
              key={item.docId}
              type="button"
              className={styles.mediaCard}
              onClick={() => setLightboxMedia(item)}
            >
              <JournalImage
                src={getDisplayUrl(item)}
                alt={item.caption || item.filename}
                width={Math.max(item.width || 800, 1)}
                height={Math.max(item.height || 600, 1)}
                className={styles.mediaImage}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectPosition: item.objectPosition || '50% 50%' }}
              />
              {item.caption?.trim() ? (
                <div className={styles.mediaCaption}>{item.caption.trim()}</div>
              ) : null}
            </button>
          ))}
        </div>
        <div ref={loadMoreRef} />
        {loadingMore ? <div className={styles.loadingState}>Loading more media...</div> : null}
      </main>

      {lightboxMedia ? (
        <div className={styles.lightboxBackdrop} role="dialog" aria-modal="true" onClick={() => setLightboxMedia(null)}>
          <div className={styles.lightboxPanel} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={() => setLightboxMedia(null)}
              aria-label="Close media view"
            >
              ×
            </button>
            <div className={styles.lightboxImageWrap}>
              <JournalImage
                src={getDisplayUrl(lightboxMedia)}
                alt={lightboxMedia.caption || lightboxMedia.filename}
                width={Math.max(lightboxMedia.width || 1200, 1)}
                height={Math.max(lightboxMedia.height || 900, 1)}
                className={styles.lightboxImage}
                sizes="100vw"
                style={{ objectPosition: lightboxMedia.objectPosition || '50% 50%' }}
              />
            </div>
            <div className={styles.lightboxMeta}>
              <p className={styles.lightboxFilename}>{lightboxMedia.filename}</p>
              {lightboxMedia.caption?.trim() ? (
                <p className={styles.lightboxCaption}>{lightboxMedia.caption.trim()}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
