import { adminDb } from '@/lib/config/firebase/admin';
import { Album, GetAlbumsOptions } from '@/lib/types/album';
import { FieldValue, Query } from 'firebase-admin/firestore';
import { PaginatedResult } from '@/lib/types/services';

const albumsCollection = adminDb.collection('albums');

export async function getAlbums(
  options: GetAlbumsOptions = {}
): Promise<PaginatedResult<Album>> {
  const { limit: pageSize = 10, tags, lastDoc } = options;
  
  let query: Query = albumsCollection;

  // If tags are provided, add a filter
  if (tags && tags.length > 0) {
    query = query.where('tags', 'array-contains-any', tags);
  }

  // Add default sorting
  query = query.orderBy('createdAt', 'desc');

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.limit(pageSize + 1).get();

  const hasMore = snapshot.docs.length > pageSize;

  const albums = snapshot.docs
    .slice(0, pageSize)
    .map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convert Firestore Timestamps to JS Dates
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Album;
    });

  const newLastDoc = snapshot.docs[albums.length - 1] || null;

  return { items: albums, lastDoc: newLastDoc, hasMore };
}

export async function createAlbum(partialAlbum: Omit<Album, 'id' | 'createdAt' | 'updatedAt' | 'mediaCount' | 'images'>): Promise<Album> {
  const newAlbumRef = albumsCollection.doc();
  const now = new Date();
  
  const albumData: Omit<Album, 'id'> = {
    ...partialAlbum,
    coverPhoto: partialAlbum.coverPhoto || null, // Ensure coverPhoto is handled
    mediaCount: 0,
    images: [],
    createdAt: now,
    updatedAt: now,
  };

  const newAlbum: Album = {
    id: newAlbumRef.id,
    ...albumData
  };

  await newAlbumRef.set(albumData);
  return newAlbum;
}

export async function getAllAlbums(): Promise<Album[]> {
  const snapshot = await albumsCollection.orderBy('createdAt', 'desc').get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      // Convert Firestore Timestamps to JS Dates
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Album;
  });
}

/**
 * Fetches a single album document by its ID from Firestore.
 * @param albumId The ID of the album to fetch.
 * @returns The album object or null if not found.
 */
export async function getAlbumById(albumId: string): Promise<Album | null> {
  const docRef = albumsCollection.doc(albumId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.warn(`Album with ID ${albumId} not found.`);
    return null;
  }

  const data = docSnap.data();
  if (!data) {
    return null;
  }
  
  // Convert Firestore Timestamps back to JS Date objects
  const albumData = {
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    // Ensure the 'images' field exists, defaulting to an empty array if not.
    // This is a robust way to handle old data that might be missing the field.
    images: data.images || [],
  } as Album;

  return albumData;
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await albumsCollection.doc(albumId).delete();
}

export async function updateAlbum(albumId: string, updates: Partial<Album>): Promise<void> {
  const updateData: Partial<Album> & { updatedAt: FieldValue } = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updates.coverPhoto !== undefined) {
    updateData.coverPhoto = updates.coverPhoto;
  }
  
  await albumsCollection.doc(albumId).update(updateData);
} 