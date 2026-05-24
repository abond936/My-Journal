'use client';

import React, { Suspense } from 'react';
import SearchResultsClientPage from './SearchResultsClientPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SearchRootClientPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchResultsClientPage />
    </Suspense>
  );
}
