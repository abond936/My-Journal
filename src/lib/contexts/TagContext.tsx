'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTags } from '@/lib/services/tagService';
import { Tag } from '@/lib/types/tag';

interface TagContextType {
  selectedTag: string | null;
  setSelectedTag: (tagId: string | null) => void;
  tags: Tag[];
  loading: boolean;
  error: string | null;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      try {
        setLoading(true);
        setError(null);
        const loadedTags = await getTags();
        setTags(loadedTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tags');
      } finally {
        setLoading(false);
      }
    }

    loadTags();
  }, []);

  return (
    <TagContext.Provider value={{ selectedTag, setSelectedTag, tags, loading, error }}>
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