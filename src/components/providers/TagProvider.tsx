'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Tag } from '@/lib/types/tag';

// The fetcher function for SWR, which can be reused.
const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
});

interface TagContextType {
  tags: Tag[];
  tagsByDimension: Record<Tag['dimension'], Tag[]>;
  loading: boolean;
  error: Error | undefined;
  createTag: (tagData: Omit<Tag, 'id'>) => Promise<Tag | undefined>;
  updateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => Promise<Tag | undefined>;
  deleteTag: (id: string) => Promise<void>;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const { data: tags, error, isLoading, mutate } = useSWR<Tag[]>('/api/tags', fetcher);

  const tagsByDimension = React.useMemo(() => {
    const byDimension: Record<Tag['dimension'], Tag[]> = {
        who: [], what: [], when: [], where: [], reflection: []
    };
    if (tags) {
        tags.forEach(tag => {
            if (byDimension[tag.dimension]) {
                byDimension[tag.dimension].push(tag);
            }
        });
    }
    return byDimension;
  }, [tags]);

  const createTag = useCallback(async (tagData: Omit<Tag, 'id'>) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create tag: ${errorText}`);
      }

      const newTag = await response.json();
      mutate(currentTags => [...(currentTags || []), newTag], false); // Optimistic update
      return newTag;
    } catch (e) {
      console.error('Error creating tag:', e);
      // Optionally re-fetch data on error to revert optimistic update
      mutate(); 
      return undefined;
    }
  }, [mutate]);

  const updateTag = useCallback(async (id: string, tagData: Partial<Omit<Tag, 'id'>>) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update tag: ${errorText}`);
      }

      const updatedTag = await response.json();
      mutate(currentTags => 
          currentTags?.map(tag => (tag.id === id ? updatedTag : tag)) || [], 
          false
      ); // Optimistic update
      return updatedTag;
    } catch (e) {
      console.error(`Error updating tag ${id}:`, e);
      mutate();
      return undefined;
    }
  }, [mutate]);

  const deleteTag = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete tag: ${errorText}`);
      }
      
      mutate(currentTags => currentTags?.filter(tag => tag.id !== id) || [], false); // Optimistic update
    } catch (e) {
      console.error(`Error deleting tag ${id}:`, e);
      mutate();
    }
  }, [mutate]);

  const value = useMemo(() => ({
    tags: tags || [],
    tagsByDimension,
    loading: isLoading,
    error,
    createTag,
    updateTag,
    deleteTag,
  }), [tags, tagsByDimension, isLoading, error, createTag, updateTag, deleteTag]);

  return (
    <TagContext.Provider value={value}>
      {children}
    </TagContext.Provider>
  );
}

export function useTag() {
  const context = useContext(TagContext);
  if (context === undefined) {
    throw new Error('useTag must be used within a TagProvider');
  }
  return context;
} 