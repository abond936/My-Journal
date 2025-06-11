'use client';

import React from 'react';
import ViewLayout from '@/components/view/ViewLayout';
import { FilterProvider } from '@/components/providers/FilterProvider';

export default function ViewSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <ViewLayout>
        {children}
      </ViewLayout>
    </FilterProvider>
  );
} 