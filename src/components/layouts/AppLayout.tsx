'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation/Navigation';
import LifeStagesSidebar from '@/components/navigation/LifeStagesSidebar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
  onTagSelect?: (tagId: string | null) => void;
}

export default function AppLayout({ children, onTagSelect }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isEditPage = pathname?.startsWith('/edit');
  const isHomePage = pathname === '/';
  const isAdminPage = pathname?.startsWith('/admin');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layout}>
      {!isHomePage && !isEditPage && <Navigation />}
      
      <div className={styles.contentWrapper}>
        {!isHomePage && !isEditPage && !isAdminPage && (
          <>
            <button 
              className={styles.menuToggle} 
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
            
            <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
              <LifeStagesSidebar onTagSelect={onTagSelect} />
            </div>
          </>
        )}
        
        <main className={`${styles.mainContent} ${isEditPage ? styles.editPage : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
} 