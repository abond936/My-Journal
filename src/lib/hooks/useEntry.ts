import useSWR from 'swr';
import { Entry } from '@/lib/types/entry';
import { useCallback } from 'react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useEntry(id?: string) {
  const { data: entry, error, isLoading, mutate } = useSWR<Entry>(
    id ? `/api/entries/${id}` : null,
    fetcher
  );

  const updateEntry = useCallback(
    async (updateData: Partial<Omit<Entry, 'id'>>) => {
      if (!id) return;

      try {
        const response = await fetch(`/api/entries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error('Failed to update entry');
        }

        const updatedEntry = await response.json();
        
        // Optimistically update the local cache
        mutate(updatedEntry, false);
        
        return updatedEntry;
      } catch (err) {
        console.error('Error updating entry:', err);
        // On error, revalidate to get the correct server state
        mutate();
        throw err;
      }
    },
    [id, mutate]
  );

  const deleteEntry = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Clear the local cache for this entry
      mutate(undefined, false);

    } catch (err) {
      console.error('Error deleting entry:', err);
      mutate();
      throw err;
    }
  }, [id, mutate]);

  return {
    entry,
    loading: isLoading,
    error,
    updateEntry,
    deleteEntry,
  };
} 