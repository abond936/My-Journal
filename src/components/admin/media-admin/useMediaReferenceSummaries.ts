'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Media } from '@/lib/types/photo';

type MediaReferenceSummaryResponse = {
  ok?: boolean;
  summaries?: Record<string, string[]>;
};

export default function useMediaReferenceSummaries(mediaItems: Media[]) {
  const mediaIds = useMemo(
    () => mediaItems.map((item) => item.docId).filter((id): id is string => typeof id === 'string' && id.length > 0),
    [mediaItems]
  );
  const [summaries, setSummaries] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSummaries((current) => {
      const next = { ...current };
      for (const item of mediaItems) {
        if (!item.docId) continue;
        if (!next[item.docId]) {
          next[item.docId] = Array.isArray(item.referencedByCardIds) ? item.referencedByCardIds : [];
        }
      }
      return next;
    });
  }, [mediaItems]);

  useEffect(() => {
    if (mediaIds.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    mediaIds.forEach((id) => params.append('id', id));

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
        setSummaries((current) => ({ ...current, ...data.summaries }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    })();

    return () => controller.abort();
  }, [mediaIds]);

  return summaries;
}
