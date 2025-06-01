'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/config/firebase';
import { collection, getDocs, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import styles from '@/lib/styles/components/deprecated/LifeStagesSidebar.module.css';
import { Tag } from '@/lib/types/tag';
import { useTag } from '@/lib/contexts/TagContext';

interface LifeStagesSidebarProps {
  onTagSelect: (tagId: string | null) => void;
}

interface TagWithCount extends Tag {
  entryCount: number;
}

export default function LifeStagesSidebar({ onTagSelect }: LifeStagesSidebarProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const { selectedTag, setSelectedTag } = useTag();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const tagsRef = collection(db, 'tags');
    const q = query(tagsRef, orderBy('order'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedTags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tag[];
      
      // Get entry counts for each tag
      const tagsWithCounts = await Promise.all(
        fetchedTags.map(async (tag) => {
          const entriesRef = collection(db, 'entries');
          const entriesQuery = query(
            entriesRef,
            where('tags', 'array-contains', tag.id)
          );
          const entriesSnapshot = await getDocs(entriesQuery);
          return {
            ...tag,
            entryCount: entriesSnapshot.size
          };
        })
      );
      
      setTags(tagsWithCounts);
      
      // Expand root tags by default
      const rootTags = tagsWithCounts
        .filter(tag => !tag.parentId)
        .map(tag => tag.id);
      setExpandedTags(new Set(rootTags));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTag = (tagId: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleTagClick = (tagId: string) => {
    const newSelectedTag = selectedTag === tagId ? null : tagId;
    setSelectedTag(newSelectedTag);
    onTagSelect(newSelectedTag);
  };

  const renderTag = (tag: TagWithCount, level: number = 0, index: number = 0) => {
    const children = tags.filter(t => t.parentId === tag.id);
    const isExpanded = expandedTags.has(tag.id);
    const isSelected = selectedTag === tag.id;
    const isTopLevel = !tag.parentId;

    return (
      <div 
        key={`tag-${level}-${tag.id}-${index}`} 
        className={`${styles.categoryItem} ${isTopLevel ? styles.topLevel : ''}`}
      >
        <div 
          className={styles.categoryHeader}
          style={{ paddingLeft: `${level * 0.5}rem` }}
        >
          <button
            className={styles.expandButton}
            onClick={() => toggleTag(tag.id)}
            aria-expanded={isExpanded}
            disabled={children.length === 0}
          >
            {children.length > 0 && (
              <span className={styles.expandIcon}>
                {isExpanded ? '−' : '+'}
              </span>
            )}
          </button>
          
          <button
            onClick={() => handleTagClick(tag.id)}
            className={`${styles.categoryButton} ${isSelected ? styles.active : ''}`}
            data-dimension={tag.dimension}
          >
            <span className={styles.tagName}>{tag.name}</span>
            <span className={styles.entryCount}>({tag.entryCount})</span>
          </button>
        </div>

        {isExpanded && children.length > 0 && (
          <div className={styles.children}>
            {children.map((child, childIndex) => renderTag(child, level + 1, childIndex))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading tags...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const rootTags = tags.filter(tag => !tag.parentId);

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navigation}>
        {rootTags.map((tag, index) => (
          <React.Fragment key={`root-${tag.id}-${index}`}>
            {renderTag(tag)}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
} 