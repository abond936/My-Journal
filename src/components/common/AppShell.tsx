'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import GlobalSidebar from '@/components/common/GlobalSidebar';
import ThemeAdminOverlay from '@/components/common/ThemeAdminOverlay';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT_QUERY = '(max-width: 768px)';
const MOBILE_SWIPE_EDGE_PX = 28;
const MOBILE_SWIPE_MIN_DISTANCE_PX = 54;

export default function AppShell({ children }: AppShellProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(
    pathname !== '/' && !pathname?.startsWith('/admin/studio')
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number; tracking: boolean } | null>(null);

  const isAuthenticated = status === 'authenticated';

  // Keep shell sidebar state aligned with the mobile breakpoint.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);

    const syncSidebarForViewport = (isMobile: boolean, forceDesktopDefault = false) => {
      if (pathname === '/' || pathname?.startsWith('/admin/studio')) {
        return;
      }

      setIsMobileViewport(isMobile);
      setSidebarOpen((current) => {
        if (isMobile) return false;
        if (forceDesktopDefault) return true;
        return current;
      });
    };

    syncSidebarForViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarForViewport(event.matches, !event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [pathname]);

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
    setSidebarOpen((prev) => !prev);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileViewport || pathname === '/' || pathname?.startsWith('/admin/studio')) return;
    const touch = event.touches[0];
    if (!touch) return;

    const shouldTrack = isSidebarOpen || touch.clientX <= MOBILE_SWIPE_EDGE_PX;
    swipeStartRef.current = shouldTrack
      ? { x: touch.clientX, y: touch.clientY, tracking: true }
      : null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start?.tracking) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (
      Math.abs(deltaX) < MOBILE_SWIPE_MIN_DISTANCE_PX ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.35
    ) {
      return;
    }

    if (!isSidebarOpen && deltaX > 0) {
      setSidebarOpen(true);
      return;
    }
    if (isSidebarOpen && deltaX < 0) {
      setSidebarOpen(false);
    }
  };

  const handleTouchCancel = () => {
    swipeStartRef.current = null;
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
        {pathname !== '/' && (
          <button
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={isSidebarOpen}
          >
            <span aria-hidden="true">{isSidebarOpen ? '←' : '→'}</span>
          </button>
        )}
        <Navigation sidebarOpen={isSidebarOpen} />
      </div>
      <div
        className={styles.contentWrapper}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
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
        <main className={styles.mainContent}>{children}</main>
      </div>
      <ThemeAdminOverlay />
    </div>
  );
}
