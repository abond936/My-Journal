import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// Types for your journal entries
interface ContentGroup {
  id: string;
  type: 'content-group';
  content: Array<{
    id: string;
    type: 'heading' | 'text';
    content: string;
    metadata?: {
      headingLevel?: number;
    };
  }>;
}

export interface Story {
  id: string;
  title: string;
  content: string;        // Text with image markers [image:imageId]
  date: string;
  tags: string[];         // Story-specific tags
  category: string;       // Life-stage category
  images: string[];       // References to images
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JournalPage {
  id: string;
  heading: {
    title: string;
    metadata?: {
      date?: string;
      tags?: string[];
    };
  };
  content: string;
  mainContent: ContentGroup[];
}

// Get all journal pages
export async function getAllJournalPages(): Promise<JournalPage[]> {
  const pagesCollection = collection(db, 'pages');
  const snapshot = await getDocs(pagesCollection);
  return snapshot.docs.map(doc => doc.data() as JournalPage);
}

// Get a single journal page by ID
export async function getJournalPage(id: string): Promise<JournalPage | null> {
  const pageRef = doc(db, 'pages', id);
  const pageSnap = await getDoc(pageRef);
  return pageSnap.exists() ? (pageSnap.data() as JournalPage) : null;
}

// Create or update a journal page
export async function saveJournalPage(page: JournalPage): Promise<void> {
  const pageRef = doc(db, 'pages', page.id);
  await setDoc(pageRef, page);
}

// Delete a journal page
export async function deleteJournalPage(id: string): Promise<void> {
  const pageRef = doc(db, 'pages', id);
  await deleteDoc(pageRef);
}

// Update a specific content group within a page
export async function updateContentGroup(pageId: string, contentGroup: ContentGroup): Promise<void> {
  const pageRef = doc(db, 'pages', pageId);
  const pageSnap = await getDoc(pageRef);
  
  if (!pageSnap.exists()) {
    throw new Error('Page not found');
  }

  const page = pageSnap.data() as JournalPage;
  const updatedContent = page.mainContent.map(group => 
    group.id === contentGroup.id ? contentGroup : group
  );

  await updateDoc(pageRef, {
    mainContent: updatedContent
  });
} 