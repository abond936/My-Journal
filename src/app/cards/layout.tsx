'use client';

import React from 'react';
import { TagProvider } from '@/components/providers/TagProvider';
import { CardProvider, useCardContext } from '@/components/providers/CardProvider';
import ViewLayout from '@/components/view/ViewLayout';

function CardsLayoutInner({ children }: { children: React.ReactNode }) {
  const { selectedTags, toggleTag } = useCardContext();
  
  return (
    <ViewLayout
      selectedTags={selectedTags}
      onTagSelect={toggleTag}
      FilterComponent={null} // No specific filter component for cards yet
    >
      {children}
    </ViewLayout>
  );
}

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TagProvider>
      <CardProvider>
        <CardsLayoutInner>{children}</CardsLayoutInner>
      </CardProvider>
    </TagProvider>
  );
} 