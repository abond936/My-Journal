'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import V2ContentCard from '@/components/view/V2ContentCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from '@/components/view/CardFeedV2.module.css';
import type { Card } from '@/lib/types/card';
import type { PaginatedResult } from '@/lib/types/services';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  });

export default function SearchResultsClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q');

  const searchUrl =
    query != null && query !== ''
      ? `/api/cards/search?q=${encodeURIComponent(query)}&limit=50`
      : null;

  const { data, error, isLoading } = useSWR<PaginatedResult<Card>>(searchUrl, fetcher);

  if (!query) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p role="alert">Could not load search results.</p>
      </div>
    );
  }

  const cards = data?.items ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Search Results for &quot;{query}&quot;</h1>
      </header>
      {isLoading ? (
        <LoadingSpinner />
      ) : cards.length === 0 ? (
        <p>No cards matched your search.</p>
      ) : (
        <main className={styles.grid}>
          {cards.map((card) => (
            <V2ContentCard key={card.docId} card={card} size="medium" />
          ))}
        </main>
      )}
    </div>
  );
}
