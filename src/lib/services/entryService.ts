// This file is now a CLIENT-SIDE service.
// It is responsible for making fetch requests to the API routes.
// It should NEVER import 'firebase-admin' or other server-side code.

import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { PaginatedResult } from '@/lib/types/services';

/**
 * Fetches a paginated list of entries from the API.
 * @param options Options for filtering and pagination.
 * @returns A paginated result of entries.
 */
export async function getEntries(options: GetEntriesOptions = {}): Promise<PaginatedResult<Entry>> {
  const { limit: pageSize = 10, tags, status, lastDocId } = options;

  const params = new URLSearchParams();
  params.set('limit', String(pageSize));

  if (tags && tags.length > 0) {
    params.set('tags', tags.join(','));
  }
  if (status) {
    params.set('status', status);
  }
  if (lastDocId) {
    params.set('lastDocId', lastDocId);
  }

  const response = await fetch(`/api/entries?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch entries');
  }

  // The API now returns data with dates already serialized as strings.
  const result = await response.json();
  return {
      ...result,
      items: result.items.map((item: any) => ({
          ...item,
          date: item.date ? new Date(item.date) : undefined,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
          coverPhoto: item.coverPhoto ? {
              ...item.coverPhoto,
              createdAt: item.coverPhoto.createdAt ? new Date(item.coverPhoto.createdAt) : undefined,
          } : null,
      }))
  };
}

/**
 * Fetches a single entry by its ID from the API.
 * @param id The ID of the entry to fetch.
 * @returns The entry object or null if not found.
 */
export async function getEntry(id: string): Promise<Entry | null> {
  if (!id) return null;

  const response = await fetch(`/api/entries/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch entry');
  }
  const result = await response.json();
  return {
      ...result,
      date: result.date ? new Date(result.date) : undefined,
      createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
      updatedAt: result.updatedAt ? new Date(result.updatedAt) : undefined,
      coverPhoto: result.coverPhoto ? {
          ...result.coverPhoto,
          createdAt: result.coverPhoto.createdAt ? new Date(result.coverPhoto.createdAt) : undefined,
      } : null,
  };
}

/**
 * Creates a new entry via the API.
 * @param entryData The data for the new entry.
 * @returns The newly created entry.
 */
export async function createEntry(entryData: Omit<Entry, 'id'>): Promise<Entry> {
  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to create entry:', errorBody);
    throw new Error(`Failed to create entry: ${errorBody}`);
  }
  return response.json();
}

/**
 * Updates an existing entry via the API.
 * @param id The ID of the entry to update.
 * @param entryUpdateData The partial data to update the entry with.
 * @returns The updated entry.
 */
export async function updateEntry(id: string, entryUpdateData: Partial<Omit<Entry, 'id'>>): Promise<Entry> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryUpdateData),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed to update entry ${id}:`, errorBody);
    throw new Error(`Failed to update entry ${id}: ${errorBody}`);
  }
  return response.json();
}

/**
 * Deletes an entry via the API.
 * @param id The ID of the entry to delete.
 */
export async function deleteEntry(id: string): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed to delete entry ${id}:`, errorBody);
    throw new Error(`Failed to delete entry ${id}: ${errorBody}`);
  }
} 