'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CardProvider } from '@/components/providers/CardProvider';
import CardGrid from '@/components/view/CardGrid';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SearchResultsClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q');

  if (!query) {
    // Optionally, you could show a message prompting the user to search.
    // Or redirect them back to the homepage.
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return <LoadingSpinner />; // Show a spinner while redirecting
  }

  const initialApiUrl = `/api/cards/search?q=${encodeURIComponent(query)}`;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Search Results for &quot;{query}&quot;</h1>
      <CardProvider initialApiUrl={initialApiUrl}>
        <CardGrid />
      </CardProvider>
    </div>
  );
} 