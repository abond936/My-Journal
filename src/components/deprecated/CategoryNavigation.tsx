import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import styles from '../styles/components/navigation/CategoryNavigation.module.css';

interface Category {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
}

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

export default function CategoryNavigation() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = collection(db, 'categories');
        const q = query(categoriesRef, orderBy('order'));
        const snapshot = await getDocs(q);
        
        const fetchedCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];

        setCategories(fetchedCategories);
        
        // Expand root categories by default
        const rootCategories = fetchedCategories
          .filter(cat => !cat.parentId)
          .map(cat => cat.id);
        setExpandedCategories(new Set(rootCategories));
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch stories when a category is selected
  useEffect(() => {
    const fetchStories = async (categoryId: string) => {
      try {
        const storiesRef = collection(db, 'stories');
        const q = query(
          storiesRef,
          where('categoryId', '==', categoryId),
          orderBy('metadata.date', 'desc')
        );
        const snapshot = await getDocs(q);
        
        const fetchedStories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Story[];

        setStories(fetchedStories);
      } catch (error) {
        console.error('Error fetching stories:', error);
      }
    };

    if (selectedCategory) {
      fetchStories(selectedCategory);
    }
  }, [selectedCategory]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    router.push(`/stories/${categoryId}`);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const children = categories.filter(cat => cat.parentId === category.id);
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id} className={styles.categoryItem}>
        <div 
          className={`${styles.categoryHeader} ${isSelected ? styles.selected : ''}`}
          style={{ paddingLeft: `${level * 1.5}rem` }}
        >
          <button
            className={styles.expandButton}
            onClick={() => toggleCategory(category.id)}
            aria-expanded={isExpanded}
          >
            {children.length > 0 && (
              <span className={styles.expandIcon}>
                {isExpanded ? '−' : '+'}
              </span>
            )}
          </button>
          
          <button
            className={styles.categoryButton}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </button>
        </div>

        {isExpanded && children.length > 0 && (
          <div className={styles.children}>
            {children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading categories...</div>;
  }

  const rootCategories = categories.filter(cat => !cat.parentId);

  return (
    <nav className={styles.navigation}>
      <div className={styles.categories}>
        {rootCategories.map(category => renderCategory(category))}
      </div>
    </nav>
  );
} 