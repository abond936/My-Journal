'use client';

import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { useSession } from 'next-auth/react';
import { Tag } from '@/lib/types/tag';
import { buildTagTree } from '@/lib/utils/tagUtils';

// --- Helper Functions ---

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

// --- Context Definition ---

export interface TagContextType {
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  selectedFilterTagIds: string[];
  setFilterTags: (tagIds: string[]) => void;
  createTag: (tagData: Omit<Tag, 'docId'>) => Promise<Tag | undefined>;
  updateTag: (id: string, tagData: Partial<Omit<Tag, 'docId'>>) => Promise<Tag | undefined>;
  deleteTag: (id: string) => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
  getTagPath: (id: string) => Tag[];
  masterTree: TagWithChildren[];
  dimensionTree: Record<string, TagWithChildren[]>;
  mutate: KeyedMutator<Tag[]>;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

// --- Provider Component ---

export function TagProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { data: tags, error, isLoading, mutate } = useSWR<Tag[]>(
    status === 'authenticated' ? '/api/tags' : null, 
    fetcher, 
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      focusThrottleInterval: 300000 // 5 minutes
    }
  );

  // State for the global tag filter
  const [selectedFilterTagIds, setFilterTags] = useState<string[]>([]);

  const createTag = useCallback(async (tagData: Omit<Tag, 'docId'>): Promise<Tag | undefined> => {
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const errObj = data as { error?: string } | null;
        const msg =
          errObj && typeof errObj.error === 'string'
            ? errObj.error
            : res.status === 409
              ? 'Tag with this name already exists'
              : 'Failed to create tag';
        console.error('createTag failed:', msg);
        return undefined;
      }
      await mutate();
      return data as Tag;
    } catch (e) {
      console.error('Failed to create tag', e);
      return undefined;
    }
  }, [mutate]);

  const updateTag = useCallback(async (id: string, tagData: Partial<Omit<Tag, 'docId'>>): Promise<Tag | undefined> => {
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const errObj = data as { error?: string } | null;
        const msg =
          errObj && typeof errObj.error === 'string'
            ? errObj.error
            : res.status === 409
              ? 'Tag with this name already exists'
              : 'Failed to update tag';
        console.error('updateTag failed:', msg);
        return undefined;
      }
      await mutate();
      return data as Tag;
    } catch (e) {
      console.error("Failed to update tag", e);
      return undefined;
    }
  }, [mutate]);

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    try {
      await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      mutate(); // Revalidate the tags list
    } catch (e) {
      console.error("Failed to delete tag", e);
    }
  }, [mutate]);

  const getTagById = useCallback((id: string) => {
    return tags?.find(tag => tag.docId === id);
  }, [tags]);

  const getTagsByIds = useCallback((ids: string[]) => {
    if (!tags) return [];
    return tags.filter(tag => ids.includes(tag.docId!));
  }, [tags]);

  const getTagPath = useCallback((id: string) => {
    const path: Tag[] = [];
    let currentTag = getTagById(id);
    while (currentTag) {
      path.unshift(currentTag);
      currentTag = currentTag.parentId ? getTagById(currentTag.parentId) : undefined;
    }
    return path;
  }, [getTagById]);

  // --- Tree Construction ---
  const masterTree = useMemo(() => {
    const tree = buildTagTree(tags || []);
    return tree;
  }, [tags]);

  // Build dimensionTree: for each dimension, include the full subtree rooted at each tag with that dimension
  const dimensionTree = useMemo(() => {
    const dims = ['who', 'what', 'when', 'where'];
    const result: Record<string, TagWithChildren[]> = {};
    // Build the full tree once
    const fullTree = buildTagTree(tags || []);
    dims.forEach(dim => {
      // For each dimension, find roots with that dimension
      result[dim] = fullTree.filter(root => root.dimension === dim);
    });
    return result;
  }, [tags]);

  const contextValue = useMemo(() => ({
    tags: tags || [],
    loading: isLoading,
    error: error || null,
    selectedFilterTagIds,
    setFilterTags,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagsByIds,
    getTagPath,
    masterTree,
    dimensionTree,
    mutate,
  }), [
    tags, 
    isLoading, 
    error,
    selectedFilterTagIds,
    createTag, 
    updateTag, 
    deleteTag, 
    getTagById, 
    getTagsByIds, 
    getTagPath,
    masterTree,
    dimensionTree,
    mutate
  ]);

  return (
    <TagContext.Provider value={contextValue}>
      {children}
    </TagContext.Provider>
  );
}

// --- Custom Hook ---

export const useTag = (): TagContextType => {
  const context = useContext(TagContext);
  if (context === undefined) {
    throw new Error('useTag must be used within a TagProvider');
  }
  return context;
}; 