'use client';

import React from 'react';
import { useContentContext } from '@/components/providers/ContentProvider';
import ViewLayout from '@/components/view/ViewLayout';
import ContentTypeFilter from '@/components/view/ContentTypeFilter';
import { TagProvider, useTag } from '@/components/providers/TagProvider';
import { ContentProvider } from '@/components/providers/ContentProvider';

function ViewSectionInner({ children }: { children: React.ReactNode }) {
  const { selectedTags, toggleTag } = useContentContext();
  const { dimensionTree, loading } = useTag();

  // Combine all dimension roots into a single array for the sidebar tree
  const allRoots = Object.values(dimensionTree).flat();
  console.log('[ViewSectionInner] dimensionTree:', dimensionTree);
  console.log('[ViewSectionInner] allRoots:', allRoots);

  return (
    <ViewLayout
      selectedTags={selectedTags}
      onTagSelect={toggleTag}
      FilterComponent={<ContentTypeFilter />}
      tree={allRoots}
      loading={loading}
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
      <ViewSectionInner>{children}</ViewSectionInner>
    </ContentProvider>
  );
} 