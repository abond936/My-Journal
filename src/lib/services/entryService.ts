import { adminDb } from '@/lib/config/firebase/admin';
import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { entryCache } from './cacheService';
import CacheService from './cacheService';
import { mockEntries } from './mockData';
import { validateContent, validateMediaReferences, extractPhotoMetadata } from '@/lib/utils/contentValidation';
import { backupEntryBeforeUpdate } from './backupService';
import { FieldValue, Timestamp, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { PaginatedResult } from '@/lib/types/services';

export async function getAllEntries(options: GetEntriesOptions = {}): Promise<Entry[]> {
  const result = await getEntries(options);
  return result.items;
}

export async function getEntry(id: string): Promise<Entry | null> {
  // Try to get from cache first
  const cacheKey = `entry:${id}`;
  const cachedEntry = entryCache.get<Entry>(cacheKey);
  if (cachedEntry) {
    return cachedEntry;
  }

  const entryRef = adminDb.collection('entries').doc(id);
  const entrySnap = await entryRef.get();
  
  if (!entrySnap.exists) {
    return null;
  }

  const data = entrySnap.data() as Entry;
  const entry = {
    ...data,
    id: entrySnap.id,
    date: data.date ? (data.date as Timestamp).toDate() : (data.createdAt as Timestamp)?.toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  };

  // Cache the entry
  entryCache.set(cacheKey, entry);
  entryCache.delete(`entry:${id}`);
  entryCache.clear();
  return entry;
}

export async function createEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
  const entriesRef = adminDb.collection('entries');
  const now = new Date();
  
  if (entry.content) validateContent(entry.content);
  if (entry.content) validateMediaReferences(entry.content, entry.media || []);
  
  const entryData = {
    ...entry,
    coverPhoto: entry.coverPhoto || null,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    date: Timestamp.fromDate(entry.date || now),
  };

  const docRef = await entriesRef.add(entryData);
  
  const newEntry = {
    id: docRef.id,
    ...entry,
    createdAt: now,
    updatedAt: now,
    date: entry.date || now,
  } as Entry;

  entryCache.clear();
  return newEntry;
}

export async function updateEntry(id: string, entry: Partial<Entry>): Promise<Entry> {
  const entryRef = adminDb.collection('entries').doc(id);
  const now = new Date();
  
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) throw new Error('Entry not found');
  
  const existingData = entrySnap.data() as Entry;
  
  await backupEntryBeforeUpdate(id, {
    ...existingData,
    id: entrySnap.id,
    createdAt: (existingData.createdAt as Timestamp)?.toDate(),
    updatedAt: (existingData.updatedAt as Timestamp)?.toDate(),
    date: (existingData.date as Timestamp)?.toDate(),
  });

  if (entry.content) validateContent(entry.content);
  if (entry.content) validateMediaReferences(entry.content, entry.media || existingData.media || []);

  const updateData: any = { ...entry, updatedAt: Timestamp.fromDate(now) };

  if (entry.date) updateData.date = Timestamp.fromDate(entry.date);
  if (entry.coverPhoto !== undefined) updateData.coverPhoto = entry.coverPhoto;

  await entryRef.update(updateData);
  
  const updatedEntry = { ...existingData, ...entry, updatedAt: now } as Entry;

  entryCache.delete(`entry:${id}`);
  entryCache.clear();
  
  return updatedEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  await adminDb.collection('entries').doc(id).delete();
  
  entryCache.delete(`entry:${id}`);
  entryCache.clear();
}

export async function getEntries(
  options: GetEntriesOptions & { lastDoc?: DocumentSnapshot } = {}
): Promise<PaginatedResult<Entry>> {
  const { 
    limit: pageSize = 10, 
    tags, 
    status, 
    lastDoc 
  } = options;
  
  const cacheKey = CacheService.generateKey('entries', { ...options, lastDoc: lastDoc?.id });
  const cachedResult = entryCache.get<PaginatedResult<Entry>>(cacheKey);
  if (cachedResult) return cachedResult;

  let q: Query = adminDb.collection('entries');
  
  if (tags && tags.length > 0) q = q.where('tags', 'array-contains-any', tags);
  if (status) q = q.where('status', '==', status);

  q = q.orderBy('createdAt', 'desc');

  if (lastDoc) q = q.startAfter(lastDoc);
  
  const snapshot = await q.limit(pageSize + 1).get();

  const hasMore = snapshot.docs.length > pageSize;
  const entries = snapshot.docs
    .slice(0, pageSize)
    .map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date?.toDate() || data.createdAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Entry;
    });

  const newLastDoc = snapshot.docs[entries.length - 1] || null;
  const result = { items: entries, lastDoc: newLastDoc, hasMore };

  entryCache.set(cacheKey, result);

  return result;
} 