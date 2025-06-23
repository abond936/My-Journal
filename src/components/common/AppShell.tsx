'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navigation from '@/components/common/Navigation';
import GlobalSidebar from '@/components/common/GlobalSidebar';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const isAuthenticated = status === 'authenticated';

  // Automatically hide sidebar on small screens initially
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };
  
  // If unauthenticated, render children directly (e.g., the login page)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If authenticated, render the full application shell
  return (
    <div className={styles.appShell}>
      <div className={styles.header}>
        <Navigation 
            onToggleSidebar={toggleSidebar} 
            isSidebarOpen={isSidebarOpen}
        />
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.sidebarWrapper}>
            <GlobalSidebar isOpen={isSidebarOpen} />
        </div>
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
} 