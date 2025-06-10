import { getFirestore, FieldValue, Timestamp, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { PaginatedResult } from '@/lib/types/services';
import { validateContent, validateMediaReferences } from '@/lib/utils/contentValidation';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const entriesCollection = db.collection('entries');

/**
 * Converts Firestore document data to an Entry object, handling timestamps.
 * @param doc The Firestore document snapshot.
 * @returns The Entry object.
 */
function docToEntry(doc: DocumentSnapshot): Entry {
  const data = doc.data() as Entry;
  return {
    ...data,
    id: doc.id,
    date: (data.date as Timestamp)?.toDate() || (data.createdAt as Timestamp)?.toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  };
}

/**
 * Fetches a paginated list of entries from Firestore based on the provided options.
 * @param options Options for filtering and pagination.
 * @returns A paginated result of entries.
 */
export async function getEntries(options: GetEntriesOptions = {}): Promise<PaginatedResult<Entry>> {
  const { limit: pageSize = 10, tags, status, lastDocId } = options;

  let q: Query = entriesCollection;

  if (tags && tags.length > 0) {
    q = q.where('tags', 'array-contains-any', tags);
  }
  if (status) {
    q = q.where('status', '==', status);
  }

  q = q.orderBy('date', 'desc');

  if (lastDocId) {
    const lastDocSnapshot = await entriesCollection.doc(lastDocId).get();
    if (lastDocSnapshot.exists) {
      q = q.startAfter(lastDocSnapshot);
    }
  }

  // Fetch one more than the page size to check if there are more documents.
  const snapshot = await q.limit(pageSize + 1).get();

  const entries = snapshot.docs.slice(0, pageSize).map(docToEntry);
  const hasMore = snapshot.docs.length > pageSize;
  const lastDoc = hasMore ? snapshot.docs[entries.length - 1] : null;

  return {
    items: entries,
    hasMore,
    lastDoc: lastDoc ? { id: lastDoc.id, date: lastDoc.data().date } : undefined,
  };
}

/**
 * Fetches a single entry by its ID.
 * @param id The ID of the entry to fetch.
 * @returns The entry object or null if not found.
 */
export async function getEntry(id: string): Promise<Entry | null> {
  if (!id) return null;

  const entryRef = entriesCollection.doc(id);
  const entrySnap = await entryRef.get();

  if (!entrySnap.exists) {
    return null;
  }

  return docToEntry(entrySnap);
}

/**
 * Creates a new entry in Firestore.
 * @param entryData The data for the new entry.
 * @returns The newly created entry.
 */
export async function createEntry(entryData: Omit<Entry, 'id'>): Promise<Entry> {
  if (entryData.content) validateContent(entryData.content);
  if (entryData.content) validateMediaReferences(entryData.content, entryData.media || []);

  const dataWithTimestamps = {
    ...entryData,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    date: entryData.date ? Timestamp.fromDate(new Date(entryData.date)) : FieldValue.serverTimestamp(),
  };

  const docRef = await entriesCollection.add(dataWithTimestamps);
  
  // To avoid another read, we'll construct the final object, but timestamps will be null
  // until the data is read back from the server. The client will get this on the next fetch.
  return {
    id: docRef.id,
    ...entryData,
  } as Entry;
}

/**
 * Updates an existing entry.
 * @param id The ID of the entry to update.
 * @param entryUpdateData The partial data to update the entry with.
 * @returns The updated entry.
 */
export async function updateEntry(id: string, entryUpdateData: Partial<Omit<Entry, 'id'>>): Promise<Entry> {
  const entryRef = entriesCollection.doc(id);

  if (entryUpdateData.content) validateContent(entryUpdateData.content);
  // For media validation, we may need the existing media array if not provided in update
  if (entryUpdateData.content) {
      const existing = await entryRef.get();
      const existingData = existing.data();
      validateMediaReferences(entryUpdateData.content, entryUpdateData.media || existingData?.media || []);
  }

  const updateData: any = {
    ...entryUpdateData,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (entryUpdateData.date) {
    updateData.date = Timestamp.fromDate(new Date(entryUpdateData.date));
  }
  
  await entryRef.update(updateData);

  const updatedSnap = await entryRef.get();
  return docToEntry(updatedSnap);
}

/**
 * Deletes an entry from Firestore.
 * @param id The ID of the entry to delete.
 */
export async function deleteEntry(id: string): Promise<void> {
  await entriesCollection.doc(id).delete();
} 