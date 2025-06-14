'use client';

import React, { useState } from 'react';
import Navigation from '@/components/common/Navigation';
import styles from './AdminLayout.module.css';
import { AdminNavTabs } from '@/components/admin/AdminNavTabs';
import { useTag } from '@/components/providers/TagProvider';
import TagTree from '../common/TagTree';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { tags } = useTag();

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
          <TagTree onTagSelect={handleTagSelect} selectedTags={[]} />
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