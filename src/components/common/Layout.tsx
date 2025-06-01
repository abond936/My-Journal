'use client';

import React, { useState } from 'react';
import Navigation from '@/components/navigation/Navigation';
import TagNavigation from '@/components/navigation/TagNavigation';
import styles from '@/styles/components/layout/Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layout}>
      <Navigation className={styles.mainNav} />
      
      <div className={styles.contentWrapper}>
        <button 
          className={styles.menuToggle} 
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
          <TagNavigation tags={[]} />
        </div>
        
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 