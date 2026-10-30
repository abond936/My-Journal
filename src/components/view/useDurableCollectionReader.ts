'use client';

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import type { Collection } from '@/lib/types/collection';
import type { DurableCollectionStructure } from '@/lib/utils/durableCollectionReader';

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Collections could not be loaded.');
  return data as T;
};

export function useDurableCollectionReader(enabled = true) {
  const searchParams = useSearchParams();
  const list = useSWR<{ collections: Collection[] }>(enabled ? '/api/collections' : null, fetcher);
  const collections = list.data?.collections ?? [];
  const requestedCollectionId = searchParams.get('collection');
  const collectionId = collections.some((collection) => collection.docId === requestedCollectionId)
    ? requestedCollectionId!
    : collections[0]?.docId ?? null;
  const structure = useSWR<DurableCollectionStructure>(
    enabled && collectionId ? `/api/collections/${encodeURIComponent(collectionId)}` : null,
    fetcher
  );
  return {
    collections,
    collectionId,
    selectedPlacementId: searchParams.get('placement'),
    structure: structure.data ?? null,
    loading: list.isLoading || (Boolean(collectionId) && structure.isLoading),
    error: list.error ?? structure.error ?? null,
    hasDurableCollections: collections.length > 0,
  };
}
