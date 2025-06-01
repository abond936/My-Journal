import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Entry } from '@/lib/types/entry';
import { Tag } from '@/lib/types/tag';
import CardLayout from '@/components/layouts/CardLayout';
import TimelineLayout from '@/components/layouts/TimelineLayout';
import AccordionLayout from '@/components/layouts/AccordionLayout';
import BlogLayout from '@/components/layouts/BlogLayout';

interface PageProps {
  params: {
    id: string;
  };
}

interface TagWithLayout extends Tag {
  layout?: 'timeline' | 'accordion' | 'blog';
}

async function getTag(tagId: string): Promise<Tag | null> {
  const tagRef = collection(db, 'tags');
  const q = query(tagRef, where('id', '==', tagId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as Tag;
}

async function getEntries(tagId: string): Promise<Entry[]> {
  const entriesRef = collection(db, 'entries');
  const q = query(
    entriesRef,
    where('tags', 'array-contains', tagId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Entry[];
}

export default async function TagPage({ params }: PageProps) {
  const tag = await getTag(params.id) as TagWithLayout;
  
  if (!tag) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Tag Not Found</h1>
        <p>The requested tag could not be found.</p>
      </div>
    );
  }

  const entries = await getEntries(params.id);
  
  // Determine which layout to use based on tag properties
  let LayoutComponent = CardLayout;
  if (tag.layout === 'timeline') {
    LayoutComponent = TimelineLayout;
  } else if (tag.layout === 'accordion') {
    LayoutComponent = AccordionLayout;
  } else if (tag.layout === 'blog') {
    LayoutComponent = BlogLayout;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{tag.name}</h1>
      {tag.description && (
        <p className="text-gray-600 mb-8">{tag.description}</p>
      )}
      <LayoutComponent stories={entries.map(entry => ({ ...entry, categoryId: entry.id }))} />
    </div>
  );
} 