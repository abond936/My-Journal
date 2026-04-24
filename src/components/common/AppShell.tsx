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
  const [isSidebarOpen, setSidebarOpen] = useState(
    pathname !== '/' && !pathname?.startsWith('/admin/studio')
  );

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
      return;
    }
    if (pathname?.startsWith('/admin/studio')) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Never return null here: a stuck or slow session would show a blank screen.
  // Shell chrome may briefly mismatch until status resolves; children still render.
  if (status === 'loading') {
    return <>{children}</>;
  }

  // If unauthenticated, render children directly (e.g., the login page)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Home splash (including post-login redirect): no header/sidebar until main app routes
  if (pathname === '/') {
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
          <>
            <div
              className={`${styles.sidebarBackdrop} ${isSidebarOpen ? styles.sidebarBackdropOpen : ''}`}
              onClick={() => setSidebarOpen(false)}
              aria-hidden={!isSidebarOpen}
            />
            <div
              className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.sidebarWrapperOpen : styles.sidebarWrapperClosed}`}
            >
            <GlobalSidebar isOpen={isSidebarOpen} />
            </div>
          </>
        )}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
} 
