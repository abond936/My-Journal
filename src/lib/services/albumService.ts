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