import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export interface Tag {
  id: string;
  name: string;
  type: 'story' | 'photo';
  category?: string;      // For life-stage categorization
}

// Get all tags of a specific type
export async function getTags(type: 'story' | 'photo'): Promise<Tag[]> {
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, where('type', '==', type));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

// Get tags by category
export async function getTagsByCategory(category: string): Promise<Tag[]> {
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, where('category', '==', category));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

// Create a new tag
export async function createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
  const tagsRef = collection(db, 'tags');
  const newTagRef = doc(tagsRef);
  const newTag = { id: newTagRef.id, ...tag };
  await setDoc(newTagRef, newTag);
  return newTag;
}

// Update an existing tag
export async function updateTag(id: string, data: Partial<Tag>): Promise<void> {
  const tagRef = doc(db, 'tags', id);
  await updateDoc(tagRef, data);
}

// Delete a tag
export async function deleteTag(id: string): Promise<void> {
  const tagRef = doc(db, 'tags', id);
  await deleteDoc(tagRef);
} 