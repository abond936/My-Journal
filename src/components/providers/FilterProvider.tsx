'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ContentType = 'all' | 'entries' | 'albums';
export type EntryType = 'all' | 'story' | 'reflection' | 'qa' | 'quote' | 'callout';

interface IFilterContext {
  selectedTags: string[];
  contentType: ContentType;
  entryType: EntryType;
  addTag: (tagId: string) => void;
  removeTag: (tagId: string) => void;
  toggleTag: (tagId: string) => void;
  setContentType: (type: ContentType) => void;
  setEntryType: (type: EntryType) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<IFilterContext | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>('all');
  const [entryType, setEntryType] = useState<EntryType>('all');

  const addTag = useCallback((tagId: string) => {
    setSelectedTags(prevTags => [...new Set([...prevTags, tagId])]);
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags(prevTags => prevTags.filter(t => t !== tagId));
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags(prevTags => {
      const newTags = new Set(prevTags);
      if (newTags.has(tagId)) {
        newTags.delete(tagId);
      } else {
        newTags.add(tagId);
      }
      return Array.from(newTags);
    });
  }, []);

  const handleSetContentType = useCallback((type: ContentType) => {
    setContentType(type);
    // Reset entry type filter when top-level content type changes
    if (type !== 'entries') {
      setEntryType('all');
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setContentType('all');
    setEntryType('all');
  }, []);

  const value = {
    selectedTags,
    contentType,
    entryType,
    addTag,
    removeTag,
    toggleTag,
    setContentType: handleSetContentType,
    setEntryType,
    clearFilters,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = (): IFilterContext => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}; 