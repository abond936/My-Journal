// This file is now a CLIENT-SIDE service.
// It is responsible for making fetch requests to the API routes.
// It should NEVER import 'firebase-admin' or other server-side code.

import { Album } from '@/lib/types/album';

/**
 * Fetches a paginated list of albums from the API.
 * @param options Optional parameters for pagination and filtering.
 * @returns {Promise<{ items: Album[], hasMore: boolean, lastDocId?: string }>} Paginated result.
 */
export async function getAlbums(options: {
    limit?: number;
    lastDocId?: string;
    tags?: string[];
} = {}): Promise<{ items: Album[], hasMore: boolean, lastDocId?: string }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.lastDocId) params.set('lastDocId', options.lastDocId);
    if (options.tags && options.tags.length > 0) params.set('tags', options.tags.join(','));

    const response = await fetch(`/api/albums?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch albums');
    }
    const result = await response.json();
    // Convert date strings back to Date objects for each album
    return {
        ...result,
        items: result.items.map((album: any) => ({
            ...album,
            createdAt: album.createdAt ? new Date(album.createdAt) : undefined,
            updatedAt: album.updatedAt ? new Date(album.updatedAt) : undefined,
        })),
    };
}

/**
 * Fetches a single album by its ID from the API.
 * @param {string} id - The ID of the album to fetch.
 * @returns {Promise<Album | null>} A promise that resolves to the album or null if not found.
 */
export async function getAlbumById(id: string): Promise<Album | null> {
    if (!id) return null;
    const response = await fetch(`/api/albums/${id}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch album ${id}`);
    }
    const album = await response.json();
    return {
        ...album,
        createdAt: album.createdAt ? new Date(album.createdAt) : undefined,
        updatedAt: album.updatedAt ? new Date(album.updatedAt) : undefined,
    };
}

/**
 * Creates a new album via the API.
 * @param {Omit<Album, 'id' | 'createdAt' | 'updatedAt'>} albumData - The data for the new album.
 * @returns {Promise<Album>} A promise that resolves to the newly created album.
 */
export async function createAlbum(albumData: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>): Promise<Album> {
    const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create album: ${errorBody}`);
    }
    return response.json();
}

/**
 * Updates an existing album via the API.
 * @param {string} id - The ID of the album to update.
 * @param {Partial<Omit<Album, 'id' | 'createdAt'>>} albumData - The data to update.
 * @returns {Promise<Album>} A promise that resolves to the updated album.
 */
export async function updateAlbum(id: string, albumData: Partial<Omit<Album, 'id' | 'createdAt'>>): Promise<Album> {
    const response = await fetch(`/api/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to update album ${id}: ${errorBody}`);
    }
    return response.json();
}

/**
 * Deletes an album via the API.
 * @param {string} id - The ID of the album to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteAlbum(id: string): Promise<void> {
    const response = await fetch(`/api/albums/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to delete album ${id}: ${errorBody}`);
    }
} 