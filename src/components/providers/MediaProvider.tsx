'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Media } from '@/lib/types/photo';

interface MediaListResponse {
  media: Media[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface MediaFilters {
  status: string;
  source: string;
  dimensions: string;
  hasCaption: string;
  search: string;
}

interface MediaContextType {
  // Data
  media: Media[];
  loading: boolean;
  error: Error | null;
  
  // Pagination
  pagination: MediaListResponse['pagination'] | null;
  currentPage: number;
  
  // Filters
  filters: MediaFilters;
  
  // Actions
  fetchMedia: (page?: number, newFilters?: Partial<MediaFilters>) => Promise<void>;
  updateMedia: (id: string, updates: Partial<Media>) => Promise<Media | undefined>;
  deleteMedia: (id: string) => Promise<void>;
  deleteMultipleMedia: (ids: string[]) => Promise<void>;
  
  // Filter actions
  setFilter: (key: keyof MediaFilters, value: string) => void;
  clearFilters: () => void;
  
  // Selection
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleMediaSelection: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

const defaultFilters: MediaFilters = {
  status: 'all',
  source: 'all',
  dimensions: 'all',
  hasCaption: 'all',
  search: '',
};

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<MediaListResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const buildQueryString = useCallback((page: number, filters: MediaFilters) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '50');
    
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.source !== 'all') params.append('source', filters.source);
    if (filters.dimensions !== 'all') params.append('dimensions', filters.dimensions);
    if (filters.hasCaption !== 'all') params.append('hasCaption', filters.hasCaption);
    if (filters.search) params.append('search', filters.search);
    
    return params.toString();
  }, []);

  const fetchMedia = useCallback(async (page = 1, newFilters?: Partial<MediaFilters>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedFilters = { ...filters, ...newFilters };
      const queryString = buildQueryString(page, updatedFilters);
      
      const response = await fetch(`/api/media?${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }
      
      const data: MediaListResponse = await response.json();
      setMedia(data.media);
      setPagination(data.pagination);
      setCurrentPage(page);
      
      if (newFilters) {
        setFilters(updatedFilters);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryString]);

  const updateMedia = useCallback(async (id: string, updates: Partial<Media>): Promise<Media | undefined> => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update media: ${response.statusText}`);
      }

      // Refresh the current page to get updated data
      await fetchMedia(currentPage);
      return media.find(m => m.id === id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error updating media:', error);
      return undefined;
    }
  }, [fetchMedia, currentPage, media]);

  const deleteMedia = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete media: ${response.statusText}`);
      }

      // Remove from local state
      setMedia(prev => prev.filter(m => m.id !== id));
      setSelectedMediaIds(prev => prev.filter(selectedId => selectedId !== id));
      
      // Refresh pagination if needed
      if (pagination && media.length === 1 && currentPage > 1) {
        await fetchMedia(currentPage - 1);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting media:', error);
    }
  }, [fetchMedia, currentPage, pagination, media.length]);

  const deleteMultipleMedia = useCallback(async (ids: string[]) => {
    try {
      // Delete each media item sequentially
      for (const id of ids) {
        await deleteMedia(id);
      }
      
      // Clear selection after bulk delete
      setSelectedMediaIds([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting multiple media:', error);
    }
  }, [deleteMedia]);

  const setFilter = useCallback((key: keyof MediaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const toggleMediaSelection = useCallback((id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMediaIds(media.map(m => m.id));
  }, [media]);

  const selectNone = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMedia(1);
  }, []); // Only run on mount

  const value: MediaContextType = {
    media,
    loading,
    error,
    pagination,
    currentPage,
    filters,
    fetchMedia,
    updateMedia,
    deleteMedia,
    deleteMultipleMedia,
    setFilter,
    clearFilters,
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll,
    selectNone,
  };

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (context === undefined) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
} 