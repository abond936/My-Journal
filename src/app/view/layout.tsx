'use client';

import React from 'react';
import { useContentContext } from '@/components/providers/ContentProvider';
import ViewLayout from '@/components/view/ViewLayout';
import ContentTypeFilter from '@/components/view/ContentTypeFilter';
import { TagProvider } from '@/components/providers/TagProvider';
import { ContentProvider } from '@/components/providers/ContentProvider';

function ViewSectionInner({ children }: { children: React.ReactNode }) {
  const { selectedTags, toggleTag } = useContentContext();
  
  return (
    <ViewLayout
      selectedTags={selectedTags}
      onTagSelect={toggleTag}
      FilterComponent={<ContentTypeFilter />}
    >
      {children}
    </ViewLayout>
  );
}

export default function ViewSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContentProvider>
      <TagProvider>
        <ViewSectionInner>{children}</ViewSectionInner>
      </TagProvider>
    </ContentProvider>
  );
} 