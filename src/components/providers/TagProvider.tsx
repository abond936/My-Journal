'use client';

import React, { createContext, useContext, useMemo, ReactNode, useCallback } from 'react';
import useSWR, { SWRMutator } from 'swr';
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
  createTag: (tagData: Omit<Tag, 'id'>) => Promise<Tag | undefined>;
  updateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => Promise<Tag | undefined>;
  deleteTag: (id: string) => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
  getTagPath: (id: string) => Tag[];
  masterTree: TagWithChildren[];
  dimensionTree: Record<string, TagWithChildren[]>;
  mutate: SWRMutator<Tag[], any>;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

// --- Provider Component ---

export function TagProvider({ children }: { children: ReactNode }) {
  const { data: tags, error, isLoading, mutate } = useSWR<Tag[]>('/api/tags', fetcher, {
    fallbackData: [],
  });

  const createTag = useCallback(async (tagData: Omit<Tag, 'id'>): Promise<Tag | undefined> => {
    try {
      const newTag = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      }).then(res => res.json());

      mutate(); // Revalidate the tags list
      return newTag;
    } catch (e) {
      console.error("Failed to create tag", e);
      return undefined;
    }
  }, [mutate]);

  const updateTag = useCallback(async (id: string, tagData: Partial<Omit<Tag, 'id'>>): Promise<Tag | undefined> => {
    try {
      const updatedTag = await fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      }).then(res => res.json());

      return updatedTag;
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
    return tags?.find(tag => tag.id === id);
  }, [tags]);

  const getTagsByIds = useCallback((ids: string[]) => {
    if (!tags) return [];
    return tags.filter(tag => ids.includes(tag.id));
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
  console.log('[TagProvider] fetched tags:', tags);
  const masterTree = useMemo(() => {
    const tree = buildTagTree(tags || []);
    console.log('[TagProvider] built masterTree:', tree);
    return tree;
  }, [tags]);

  // Build dimensionTree: for each dimension, include the full subtree rooted at each tag with that dimension
  const dimensionTree = useMemo(() => {
    const dims = ['who', 'what', 'when', 'where', 'reflection'];
    const result: Record<string, TagWithChildren[]> = {};
    // Build the full tree once
    const fullTree = buildTagTree(tags || []);
    dims.forEach(dim => {
      // For each dimension, find roots with that dimension
      result[dim] = fullTree.filter(root => root.dimension === dim);
    });
    console.log('[TagProvider] built dimensionTree:', result);
    return result;
  }, [tags]);

  const contextValue = useMemo(() => ({
    tags: tags || [],
    loading: isLoading,
    error: error || null,
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