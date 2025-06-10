import { getFirestore, Timestamp, DocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Album } from '@/lib/types/album';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const albumsCollection = db.collection('albums');

/**
 * Converts a Firestore document to an Album object, handling timestamps.
 * @param doc The Firestore document snapshot.
 * @returns The Album object.
 */
function docToAlbum(doc: DocumentSnapshot): Album {
  const data = doc.data() as Album;
  return {
    ...data,
    id: doc.id,
    date: (data.date as Timestamp)?.toDate() || (data.createdAt as Timestamp)?.toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  };
}

/**
 * Fetches all albums from Firestore.
 * @returns A promise that resolves to an array of all albums, sorted by date.
 */
export async function getAllAlbums(): Promise<Album[]> {
  try {
    const snapshot = await albumsCollection.orderBy('date', 'desc').get();
    
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(docToAlbum);
  } catch (error) {
    console.error('Error fetching all albums from Firestore:', error);
    throw new Error('Failed to fetch albums.');
  }
}

/**
 * Fetches a single album by its ID.
 * @param id The ID of the album to fetch.
 * @returns The album object or null if not found.
 */
export async function getAlbum(id: string): Promise<Album | null> {
  if (!id) return null;

  try {
    const albumRef = albumsCollection.doc(id);
    const albumSnap = await albumRef.get();

    if (!albumSnap.exists()) {
        return null;
    }

    return docToAlbum(albumSnap);
  } catch (error) {
    console.error(`Error fetching album with ID ${id}:`, error);
    throw new Error('Failed to fetch album.');
  }
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