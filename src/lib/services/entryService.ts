import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { entryCache } from './cacheService';
import CacheService from './cacheService';
import { mockEntries } from './mockData';

export async function getAllEntries(options: GetEntriesOptions = {}): Promise<Entry[]> {
  // Use mock data in development
  if (process.env.NODE_ENV === 'development') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockEntries];
  }

  const { page = 1, limit: pageSize = 10, tag, tags, type, status, dateRange } = options;
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
  
  q = query(q, orderBy('createdAt', 'desc'), limit(pageSize));
  
  if (page > 1) {
    // TODO: Implement pagination using startAfter
    console.warn('Pagination not yet implemented');
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
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
    inheritedTags: doc.data().inheritedTags || doc.data().tags || []
  })) as Entry[];
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
    inheritedTags: data.inheritedTags || data.tags || []
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
    visibility: entry.visibility || 'private'
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
    visibility: entry.visibility || 'private'
  } as Entry;

  // Invalidate entries cache
  entryCache.clear();
  
  return newEntry;
}

export async function updateEntry(id: string, entry: Partial<Entry>): Promise<Entry> {
  const entryRef = doc(db, 'entries', id);
  const now = new Date();
  
  const updateData: any = {
    ...entry,
    updatedAt: Timestamp.fromDate(now)
  };

  if (entry.date) {
    updateData.date = Timestamp.fromDate(entry.date);
  }

  await updateDoc(entryRef, updateData);
  
  const updatedEntry = {
    id,
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
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  q = query(q, limit(pageSize));
  
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(doc => ({
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
    inheritedTags: doc.data().inheritedTags || doc.data().tags || []
  })) as Entry[];

  const result = {
    items: entries,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize
  };

  // Cache the result
  entryCache.set(cacheKey, result);
  return result;
} 