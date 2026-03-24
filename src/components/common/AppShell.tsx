'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import GlobalSidebar from '@/components/common/GlobalSidebar';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(pathname !== '/');

  const isAuthenticated = status === 'authenticated';

  // Automatically hide sidebar on small screens initially
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Update sidebar state when route changes
  useEffect(() => {
    if (pathname === '/') {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Avoid transitional overlap between intro page and authenticated shell
  // while session status is still resolving.
  if (status === 'loading') {
    return null;
  }
  
  // If unauthenticated, render children directly (e.g., the login page)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If authenticated, render the full application shell
  return (
    <div className={styles.appShell}>
      <div className={styles.header}>
        <Navigation 
            sidebarOpen={isSidebarOpen}
        />
      </div>
      <div className={styles.contentWrapper}>
        {/* Sidebar toggle button - only show when not on home page */}
        {pathname !== '/' && (
          <button
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        )}
        {pathname !== '/' && (
          <div className={styles.sidebarWrapper}>
            <GlobalSidebar isOpen={isSidebarOpen} />
          </div>
        )}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
} 