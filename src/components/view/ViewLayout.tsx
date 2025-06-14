'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import TagTree from '@/components/common/TagTree';
import styles from './ViewLayout.module.css';
import { useContentContext } from '@/components/providers/ContentProvider';
import { AdminNavTabs } from '@/components/admin/AdminNavTabs';
import ContentTypeFilter from '@/components/view/ContentTypeFilter';

interface ViewLayoutProps {
  children: React.ReactNode;
}

export default function ViewLayout({ children }: ViewLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { toggleTag, selectedTags } = useContentContext();

  const isHomePage = pathname === '/';
  const isAdminPage = pathname?.startsWith('/admin');

  // Don't render layout on home page
  if (isHomePage) {
    return <>{children}</>;
  }

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
          <TagTree onTagSelect={toggleTag} selectedTags={selectedTags} />
        </div>

        <main className={styles.mainContent}>
          <div className={styles.topNavContainer}>
            {isAdminPage ? <AdminNavTabs /> : <ContentTypeFilter />}
          </div>
          <div className={styles.pageContent}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 