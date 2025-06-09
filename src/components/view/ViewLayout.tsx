'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import TagTree from '@/components/common/TagTree';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from './ViewLayout.module.css';
import { useFilter } from '@/lib/contexts/FilterContext';

interface ViewLayoutProps {
  children: React.ReactNode;
}

export default function ViewLayout({ children }: ViewLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { toggleTag, selectedTags } = useFilter();

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
      <Navigation />
      <div className={styles.contentWrapper}>
        <button 
          className={styles.menuToggle} 
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
          {isAdminPage ? (
            <AdminSidebar />
          ) : (
            <TagTree onTagSelect={toggleTag} selectedTags={selectedTags} />
          )}
        </div>
        
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
} 