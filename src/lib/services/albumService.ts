import { adminDb } from '@/lib/config/firebase/admin';
import { Album } from '@/lib/types/album';
import { FieldValue } from 'firebase-admin/firestore';

const albumsCollection = adminDb.collection('albums');

export async function createAlbum(partialAlbum: Omit<Album, 'id' | 'createdAt' | 'updatedAt' | 'mediaCount' | 'images'>): Promise<Album> {
  const newAlbumRef = albumsCollection.doc();
  const now = new Date();
  const newAlbum: Album = {
    id: newAlbumRef.id,
    ...partialAlbum,
    mediaCount: 0,
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  await newAlbumRef.set(newAlbum);
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
  const updateData = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await albumsCollection.doc(albumId).update(updateData);
} 