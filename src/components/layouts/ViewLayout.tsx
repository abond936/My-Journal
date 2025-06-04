'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation/Navigation';
import LifeStagesSidebar from '@/components/navigation/LifeStagesSidebar';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import styles from './ViewLayout.module.css';

interface ViewLayoutProps {
  children: React.ReactNode;
  onTagSelect?: (tagId: string | null) => void;
}

export default function ViewLayout({ children, onTagSelect }: ViewLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
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
            <LifeStagesSidebar onTagSelect={onTagSelect} />
          )}
        </div>
        
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
} 