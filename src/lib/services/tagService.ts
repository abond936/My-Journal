import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Tag } from '@/lib/types/tag';
import { tagCache } from './cacheService';

// Read counter and warning threshold
let readCount = 30000; // Starting from current usage
const READ_WARNING_THRESHOLD = 45000; // 45k reads
const READ_LIMIT = 50000; // 50k reads

function incrementReadCount(operation: string) {
  readCount++;
  if (readCount >= READ_WARNING_THRESHOLD) {
    console.warn(`⚠️ WARNING: Approaching Firestore read limit! Current reads: ${readCount}/${READ_LIMIT}`);
    console.warn(`Last operation: ${operation}`);
  }
  if (readCount >= READ_LIMIT) {
    console.error(`🚨 CRITICAL: Firestore read limit reached! Current reads: ${readCount}/${READ_LIMIT}`);
    console.error(`Last operation: ${operation}`);
  }
}

// Function to check current read count
export function getCurrentReadCount() {
  console.log(`Current Firestore reads: ${readCount}/${READ_LIMIT}`);
  return {
    current: readCount,
    limit: READ_LIMIT,
    remaining: READ_LIMIT - readCount,
    percentage: Math.round((readCount / READ_LIMIT) * 100)
  };
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).getFirestoreReadCount = getCurrentReadCount;
}

export async function getTags(): Promise<Tag[]> {
  // Try to get from cache first
  const cacheKey = 'tags:all';
  const cachedTags = tagCache.get<Tag[]>(cacheKey);
  if (cachedTags) {
    console.log('Returning cached tags:', cachedTags);
    return cachedTags;
  }

  console.log('Fetching tags from Firestore...');
  incrementReadCount('getTags');
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, orderBy('order'));
  const snapshot = await getDocs(q);
  const tags = snapshot.docs.map(doc => {
    const data = doc.data();
    // Ensure we're using the document ID as the tag ID
    const tag = { 
      id: doc.id,  // Use the document ID
      name: data.name,
      dimension: data.dimension,
      parentId: data.parentId,
      order: data.order || 0, // Default to 0 if order is not set
      description: data.description,
      entryCount: data.entryCount,
      albumCount: data.albumCount
    } as Tag;
    return tag;
  });

  // Sort by parentId and order in memory
  tags.sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return (a.parentId || '').localeCompare(b.parentId || '');
    }
    return (a.order || 0) - (b.order || 0);
  });

  console.log('Fetched tags:', tags);
  // Cache the tags
  tagCache.set(cacheKey, tags);
  return tags;
}

export async function createTag(tagData: Omit<Tag, 'id'>): Promise<Tag> {
  const tagsRef = collection(db, 'tags');
  const docRef = await addDoc(tagsRef, {
    ...tagData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  const newTag = {
    id: docRef.id,
    ...tagData
  };

  // Invalidate tags cache
  tagCache.clear();
  
  return newTag;
}

export async function updateTag(id: string, tagData: Partial<Tag>): Promise<Tag> {
  const tagRef = doc(db, 'tags', id);
  const tagDoc = await getDoc(tagRef);
  
  if (!tagDoc.exists()) {
    throw new Error('Tag not found');
  }
  
  const existingData = tagDoc.data();
  const updateData = {
    ...existingData,  // Preserve existing data
    ...tagData,       // Apply updates
    updatedAt: Timestamp.now()
  };
  
  await updateDoc(tagRef, updateData);
  
  const updatedTag = {
    id,
    ...existingData,
    ...tagData
  } as Tag;

  // Invalidate caches
  tagCache.delete(`tag:${id}`);
  tagCache.clear();
  
  return updatedTag;
}

export async function deleteTag(id: string): Promise<void> {
  if (!id) {
    throw new Error('Tag ID is required');
  }

  // Count the read for checking the tag
  incrementReadCount('deleteTag:check');
  const tagRef = doc(db, 'tags', id);
  const tagDoc = await getDoc(tagRef);
  
  if (!tagDoc.exists()) {
    throw new Error('Tag not found');
  }

  // Count the read for finding child tags
  incrementReadCount('deleteTag:children');
  const childTagsQuery = query(
    collection(db, 'tags'),
    where('parentId', '==', id)
  );
  const childTagsSnapshot = await getDocs(childTagsQuery);
  
  // Count reads for each child tag
  childTagsSnapshot.docs.forEach(() => {
    incrementReadCount('deleteTag:child');
  });

  try {
    // First delete the parent tag
    console.log(`Deleting parent tag: ${id}`);
    await deleteDoc(tagRef);
    
    // Then delete each child tag individually
    for (const childDoc of childTagsSnapshot.docs) {
      console.log(`Deleting child tag: ${childDoc.id}`);
      await deleteDoc(childDoc.ref);
    }
    
    // Clear caches
    tagCache.delete(`tag:${id}`);
    tagCache.clear();
    
    console.log('Successfully deleted tag and all its children');
  } catch (error) {
    console.error('Error deleting tags:', error);
    throw error;
  }
}

export async function getTagsByDimension(): Promise<Record<Tag['dimension'], Tag[]>> {
  const tags = await getTags();
  const tagsByDimension: Record<Tag['dimension'], Tag[]> = {
    who: [],
    what: [],
    when: [],
    where: [],
    reflection: []
  };

  tags.forEach(tag => {
    if (tag.dimension in tagsByDimension) {
      tagsByDimension[tag.dimension].push(tag);
    }
  });

  return tagsByDimension;
}

export async function organizeEntryTags(entryTags: string[]): Promise<{
  who: string[];
  what: string[];
  when: string[];
  where: string[];
  reflection: string[];
}> {
  const tags = await getTags();
  const organizedTags = {
    who: [] as string[],
    what: [] as string[],
    when: [] as string[],
    where: [] as string[],
    reflection: [] as string[]
  };

  entryTags.forEach(tagId => {
    const tag = tags.find(t => t.id === tagId);
    if (tag && tag.dimension in organizedTags) {
      organizedTags[tag.dimension].push(tagId);
    }
  });

  return organizedTags;
} 