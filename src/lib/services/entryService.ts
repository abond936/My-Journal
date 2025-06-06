import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { entryCache } from './cacheService';
import CacheService from './cacheService';
import { mockEntries } from './mockData';

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

  const entryRef = doc(db, 'entries', id);
  const entrySnap = await getDoc(entryRef);
  
  if (!entrySnap.exists()) {
    return null;
  }

  const data = entrySnap.data();
  const entry = {
    id: entrySnap.id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    type: data.type || 'story',
    status: data.status || 'published',
    date: data.date?.toDate() || data.createdAt?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    media: data.media || [],
    visibility: data.visibility || 'private',
    inheritedTags: data.inheritedTags || data.tags || [],
    coverPhoto: data.coverPhoto || undefined
  } as Entry;

  // Cache the entry
  entryCache.set(cacheKey, entry);
  return entry;
}

export async function createEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
  const entriesRef = collection(db, 'entries');
  const now = new Date();
  
  const entryData = {
    ...entry,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    date: Timestamp.fromDate(entry.date || now),
    type: entry.type || 'story',
    status: entry.status || 'draft',
    media: entry.media || [],
    visibility: entry.visibility || 'private',
    coverPhoto: entry.coverPhoto || undefined
  };

  const docRef = await addDoc(entriesRef, entryData);
  
  const newEntry = {
    id: docRef.id,
    ...entry,
    createdAt: now,
    updatedAt: now,
    date: entry.date || now,
    type: entry.type || 'story',
    status: entry.status || 'draft',
    media: entry.media || [],
    visibility: entry.visibility || 'private',
    coverPhoto: entry.coverPhoto || undefined
  } as Entry;

  // Invalidate entries cache
  entryCache.clear();
  
  return newEntry;
}

export async function updateEntry(id: string, entry: Partial<Entry>): Promise<Entry> {
  const entryRef = doc(db, 'entries', id);
  const now = new Date();
  
  // Get existing entry data first
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    throw new Error('Entry not found');
  }
  const existingData = entrySnap.data();
  
  const updateData: any = {
    ...existingData,  // Preserve existing data
    ...entry,         // Apply updates
    updatedAt: Timestamp.fromDate(now)
  };

  if (entry.date) {
    updateData.date = Timestamp.fromDate(entry.date);
  }

  // Ensure coverPhoto is included in the update
  if (entry.coverPhoto !== undefined) {
    updateData.coverPhoto = entry.coverPhoto;
  }

  await updateDoc(entryRef, updateData);
  
  const updatedEntry = {
    id,
    ...existingData,
    ...entry,
    updatedAt: now
  } as Entry;

  // Invalidate caches
  entryCache.delete(`entry:${id}`);
  entryCache.clear();
  
  return updatedEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  const entryRef = doc(db, 'entries', id);
  await deleteDoc(entryRef);
  
  // Invalidate caches
  entryCache.delete(`entry:${id}`);
  entryCache.clear();
}

interface PaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function getEntries(
  options: GetEntriesOptions & { lastDoc?: DocumentSnapshot } = {}
): Promise<PaginatedResult<Entry>> {
  const { 
    page = 1, 
    limit: pageSize = 10, 
    tag, 
    tags, 
    type, 
    status, 
    dateRange,
    lastDoc 
  } = options;
  
  // Generate cache key based on options
  const cacheKey = CacheService.generateKey('entries', { ...options, lastDoc: lastDoc?.id });
  const cachedResult = entryCache.get<PaginatedResult<Entry>>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const entriesRef = collection(db, 'entries');
  let q = query(entriesRef);
  
  if (tag) {
    q = query(q, where('tags', 'array-contains', tag));
  }
  
  if (tags && tags.length > 0) {
    q = query(q, where('tags', 'array-contains-any', tags));
  }

  if (type) {
    q = query(q, where('type', '==', type));
  }

  if (status) {
    q = query(q, where('status', '==', status));
  }

  if (dateRange) {
    q = query(q, 
      where('date', '>=', Timestamp.fromDate(dateRange.start)),
      where('date', '<=', Timestamp.fromDate(dateRange.end))
    );
  }
  
  // First, get one more document than we need to check if there are more
  const nextPageQuery = query(q, orderBy('createdAt', 'desc'), limit(pageSize + 1));
  if (lastDoc) {
    q = query(nextPageQuery, startAfter(lastDoc));
  } else {
    q = nextPageQuery;
  }
  
  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const entries = snapshot.docs
    .slice(0, pageSize) // Only take the number we want to display
    .map(doc => ({
      id: doc.id,
      title: doc.data().title,
      content: doc.data().content,
      tags: doc.data().tags || [],
      type: doc.data().type || 'story',
      status: doc.data().status || 'published',
      date: doc.data().date?.toDate() || doc.data().createdAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      media: doc.data().media || [],
      visibility: doc.data().visibility || 'private',
      inheritedTags: doc.data().inheritedTags || doc.data().tags || [],
      coverPhoto: doc.data().coverPhoto || undefined
    })) as Entry[];

  const result = {
    items: entries,
    lastDoc: snapshot.docs[pageSize - 1] || null,
    hasMore
  };

  // Cache the result
  entryCache.set(cacheKey, result);
  return result;
} 