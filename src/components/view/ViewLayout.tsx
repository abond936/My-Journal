'use client';

import React, { useState } from 'react';
import Navigation from '@/components/common/Navigation';
import TagTree from '@/components/common/TagTree';
import styles from './ViewLayout.module.css';
import { TagWithChildren } from '@/components/providers/TagProvider';

interface ViewLayoutProps {
  children: React.ReactNode;
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  FilterComponent?: React.ReactNode;
  tree: TagWithChildren[];
  loading: boolean;
}

export default function ViewLayout({ 
  children,
  selectedTags,
  onTagSelect,
  FilterComponent,
  tree,
  loading,
}: ViewLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layout}>
      <Navigation sidebarOpen={sidebarOpen} />
      <div className={styles.contentWrapper}>
        <button
          className={styles.menuToggle}
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '←' : '→'}
        </button>

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
          <TagTree tree={tree} onTagSelect={onTagSelect} selectedTags={selectedTags} loading={loading} />
        </div>

        <main className={`${styles.mainContent} ${sidebarOpen ? styles.mainContentOpen : ''}`}>
          <div className={styles.topNavContainer}>
            {FilterComponent}
          </div>
          <div className={styles.pageContent}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 