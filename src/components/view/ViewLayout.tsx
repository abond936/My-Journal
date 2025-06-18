'use client';

import React, { useState } from 'react';
import Navigation from '@/components/common/Navigation';
import TagTree from '@/components/common/TagTree';
import styles from './ViewLayout.module.css';

interface ViewLayoutProps {
  children: React.ReactNode;
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  FilterComponent?: React.ReactNode;
}

export default function ViewLayout({ 
  children,
  selectedTags,
  onTagSelect,
  FilterComponent,
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
          <TagTree onTagSelect={onTagSelect} selectedTags={selectedTags} />
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