'use client';

import React, { useMemo } from 'react';
import { CardProvider, useCardContext } from '@/components/providers/CardProvider';
import ViewLayout from '@/components/view/ViewLayout';
import { TagProvider, useTag } from '@/components/providers/TagProvider';
import { buildTagTree } from '@/lib/utils/tagUtils';

function CardsLayoutInner({ children }: { children: React.ReactNode }) {
  // From CardProvider: handles which cards to show and which tags are selected
  const { selectedTags, toggleTag } = useCardContext();
  // From TagProvider: handles fetching the master list of all tags to display in the filter
  const { tags, loading: tagsLoading } = useTag();

  // Build the hierarchical tree structure required by the TagTree component
  const tagTree = useMemo(() => {
    if (!tags) return [];
    return buildTagTree(tags);
  }, [tags]);
  
  return (
    <ViewLayout
      selectedTags={selectedTags}
      onTagSelect={toggleTag}
      FilterComponent={null} // This can be used later for other filters (e.g., by type)
      tree={tagTree}
      loading={tagsLoading}
    >
      {children}
    </ViewLayout>
  );
}

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CardProvider>
      <TagProvider>
        <CardsLayoutInner>{children}</CardsLayoutInner>
      </TagProvider>
    </CardProvider>
  );
} 