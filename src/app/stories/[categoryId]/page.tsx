import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import BlogLayout from '@/components/layouts/BlogLayout';
import AccordionLayout from '@/components/layouts/AccordionLayout';
import CardLayout from '@/components/layouts/CardLayout';
import TimelineLayout from '@/components/layouts/TimelineLayout';
import MagazineLayout from '@/components/layouts/MagazineLayout';

interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  metadata: {
    date?: Date;
    tags?: string[];
    images?: {
      url: string;
      caption?: string;
      order: number;
    }[];
  };
}

interface Category {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
}

type ViewType = 'blog' | 'accordion' | 'card' | 'timeline' | 'magazine';

async function getCategory(categoryId: string): Promise<Category | null> {
  const categoryRef = collection(db, 'categories');
  const q = query(categoryRef, where('id', '==', categoryId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as Category;
}

async function getStories(categoryId: string): Promise<Story[]> {
  const storiesRef = collection(db, 'stories');
  const q = query(
    storiesRef,
    where('categoryId', '==', categoryId),
    orderBy('metadata.date', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Story[];
}

function getLayoutComponent(view: ViewType) {
  switch (view) {
    case 'blog':
      return BlogLayout;
    case 'accordion':
      return AccordionLayout;
    case 'card':
      return CardLayout;
    case 'timeline':
      return TimelineLayout;
    case 'magazine':
      return MagazineLayout;
    default:
      return BlogLayout;
  }
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: { categoryId: string };
  searchParams: { view?: ViewType };
}) {
  const category = await getCategory(params.categoryId);
  
  if (!category) {
    notFound();
  }
  
  const stories = await getStories(params.categoryId);
  const view = searchParams.view || 'blog';
  const LayoutComponent = getLayoutComponent(view);
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{category.name}</h1>
      </header>
      
      <LayoutComponent stories={stories} />
    </div>
  );
} 