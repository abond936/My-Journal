'use client';

import React, { useState, useMemo } from 'react';
import Navigation from '@/components/common/Navigation';
import styles from './AdminLayout.module.css';
import { AdminNavTabs } from '@/components/admin/AdminNavTabs';
import { useTag, TagWithChildren } from '@/components/providers/TagProvider';
import TagTree from '../common/TagTree';
import { Tag } from '@/lib/types/tag';
import { buildTagTree } from '@/lib/utils/tagUtils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { tags } = useTag();

  const dimensionalTree = useMemo(() => {
    if (!tags || tags.length === 0) return [];

    const masterTagTree = buildTagTree(tags);
    
    const dimensions: Record<string, TagWithChildren> = {
      who: { id: 'dim-who', name: 'Who', children: [] },
      what: { id: 'dim-what', name: 'What', children: [] },
      when: { id: 'dim-when', name: 'When', children: [] },
      where: { id: 'dim-where', name: 'Where', children: [] },
      reflection: { id: 'dim-reflection', name: 'Reflection', children: [] },
    };
    const uncategorized: TagWithChildren = { id: 'dim-uncategorized', name: 'Uncategorized', children: [] };

    masterTagTree.forEach(rootNode => {
      if (rootNode.dimension && dimensions[rootNode.dimension]) {
        dimensions[rootNode.dimension].children.push(rootNode);
      } else {
        uncategorized.children.push(rootNode);
      }
    });

    const result = Object.values(dimensions);
    if (uncategorized.children.length > 0) {
      result.push(uncategorized);
    }
    
    return result;
  }, [tags]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Dummy functions for TagTree props for now
  const handleTagSelect = (tagId: string) => {
    console.log("Admin Tag Selected:", tagId);
  };

  return (
    <div className={styles.layout}>
      <Navigation sidebarOpen={sidebarOpen} />
      <div className={styles.contentWrapper}>
        <button
          className={`${styles.menuToggle} ${sidebarOpen ? styles.open : styles.closed}`}
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '←' : '→'}
        </button>

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
          <TagTree tree={dimensionalTree} onTagSelect={handleTagSelect} selectedTags={[]} />
        </div>

        <main className={styles.mainContent}>
          <div className={styles.topNavContainer}>
            <AdminNavTabs />
          </div>
          <div className={styles.pageContent}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 