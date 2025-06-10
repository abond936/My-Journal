import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { Tag } from '@/lib/types/tag';
import { getAdminApp } from '@/lib/config/firebase/admin';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();

/**
 * Fetches all tags from Firestore.
 * @returns {Promise<Tag[]>} A promise that resolves to an array of tags.
 */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const tagsRef = db.collection('tags');
    const snapshot = await tagsRef.get();
    
    if (snapshot.empty) {
      return [];
    }

    const tags: Tag[] = [];
    snapshot.forEach(doc => {
      tags.push({ id: doc.id, ...doc.data() } as Tag);
    });
    
    return tags;
  } catch (error) {
    console.error('Error fetching all tags from Firestore:', error);
    throw new Error('Failed to fetch tags.');
  }
}

/**
 * Fetches a single tag by its ID.
 * @param {string} id - The ID of the tag to fetch.
 * @returns {Promise<Tag | null>} A promise that resolves to the tag or null if not found.
 */
export async function getTagById(id: string): Promise<Tag | null> {
    if (!id) {
        throw new Error('Tag ID is required');
    }
    try {
        const tagRef = db.collection('tags').doc(id);
        const doc = await tagRef.get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() } as Tag;
    } catch (error) {
        console.error(`Error fetching tag with ID ${id}:`, error);
        throw new Error('Failed to fetch tag.');
    }
}

/**
 * Creates a new tag in Firestore.
 * @param {Omit<Tag, 'id'>} tagData - The data for the new tag.
 * @returns {Promise<Tag>} A promise that resolves to the newly created tag.
 */
export async function createTag(tagData: Omit<Tag, 'id'>): Promise<Tag> {
  try {
    const tagsRef = db.collection('tags');
    const docRef = await tagsRef.add({
      ...tagData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: docRef.id, ...tagData };
  } catch (error) {
    console.error('Error creating tag in Firestore:', error);
    throw new Error('Failed to create tag.');
  }
}

/**
 * Updates an existing tag in Firestore.
 * @param {string} id - The ID of the tag to update.
 * @param {Partial<Tag>} tagData - The data to update.
 * @returns {Promise<Tag>} A promise that resolves to the updated tag.
 */
export async function updateTag(id: string, tagData: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<Tag> {
  if (!id) {
    throw new Error('Tag ID is required for update');
  }
  try {
    const tagRef = db.collection('tags').doc(id);
    await tagRef.update({
      ...tagData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await tagRef.get();
    if (!updatedDoc.exists) {
      throw new Error('Tag not found after update.');
    }

    return { id: updatedDoc.id, ...updatedDoc.data() } as Tag;
  } catch (error) {
    console.error(`Error updating tag with ID ${id}:`, error);
    throw new Error('Failed to update tag.');
  }
}

/**
 * Deletes a tag and all its children from Firestore.
 * @param {string} id - The ID of the tag to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteTag(id: string): Promise<void> {
  if (!id) {
    throw new Error('Tag ID is required');
  }
  
  try {
    const tagRef = db.collection('tags').doc(id);
    
    // Find all direct children of the tag
    const childrenQuery = db.collection('tags').where('parentId', '==', id);
    const childrenSnapshot = await childrenQuery.get();

    // Use a batch to delete the parent and all children atomically
    const batch = db.batch();
    
    // Delete parent
    batch.delete(tagRef);
    
    // Delete children
    childrenSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully deleted tag ${id} and its ${childrenSnapshot.size} children.`);
  } catch (error) {
    console.error(`Error deleting tag with ID ${id} and its children:`, error);
    throw new Error('Failed to delete tag and its children.');
  }
}

export async function getTagsByDimension(): Promise<Record<Tag['dimension'], Tag[]>> {
  const tags = await getAllTags();
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
  const tags = await getAllTags();
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