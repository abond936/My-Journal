'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Media } from '@/lib/types/photo';

type MediaReferenceSummaryResponse = {
  ok?: boolean;
  summaries?: Record<string, string[]>;
};

const mediaReferenceSummaryCache = new Map<string, string[]>();

export default function useMediaReferenceSummaries(mediaItems: Media[]) {
  const mediaIds = useMemo(
    () => mediaItems.map((item) => item.docId).filter((id): id is string => typeof id === 'string' && id.length > 0),
    [mediaItems]
  );
  const mediaIdsKey = useMemo(() => mediaIds.join('\u001e'), [mediaIds]);
  const [summaries, setSummaries] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSummaries((current) => {
      const next = { ...current };
      for (const item of mediaItems) {
        if (!item.docId) continue;
        if (!mediaReferenceSummaryCache.has(item.docId) && Array.isArray(item.referencedByCardIds)) {
          mediaReferenceSummaryCache.set(item.docId, item.referencedByCardIds);
        }
        if (!next[item.docId] && mediaReferenceSummaryCache.has(item.docId)) {
          next[item.docId] = mediaReferenceSummaryCache.get(item.docId) ?? [];
        }
      }
      return next;
    });
  }, [mediaItems]);

  useEffect(() => {
    if (mediaIds.length === 0) return;
    const missingIds = mediaIds.filter((id) => !mediaReferenceSummaryCache.has(id));
    if (missingIds.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    missingIds.forEach((id) => params.append('id', id));

    void (async () => {
      try {
        const response = await fetch(`/api/media/reference-summary?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => ({}))) as MediaReferenceSummaryResponse;
        if (!data.summaries) return;
        Object.entries(data.summaries).forEach(([id, summary]) => {
          mediaReferenceSummaryCache.set(id, summary);
        });
        setSummaries((current) => ({ ...current, ...data.summaries }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    })();

    return () => controller.abort();
  }, [mediaIds, mediaIdsKey]);

  return summaries;
}
