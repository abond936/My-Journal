'use client';

import { useEffect, useRef, useState } from 'react';
import AdminDesktopOnlyGate from '@/components/admin/AdminDesktopOnlyGate';
import ThemeAdminPage from '@/components/admin/theme-admin/ThemeAdminPage';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './ThemeAdminOverlay.module.css';

const DEFAULT_OVERLAY_WIDTH = 1180;
const MIN_OVERLAY_WIDTH = 860;

export default function ThemeAdminOverlay() {
  const { theme, isThemeAdminOpen, closeThemeAdmin } = useTheme();
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [overlayWidth, setOverlayWidth] = useState(DEFAULT_OVERLAY_WIDTH);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWidth = window.sessionStorage.getItem('theme-admin:overlay-width');
    if (savedWidth) {
      const parsed = Number(savedWidth);
      if (Number.isFinite(parsed) && parsed >= MIN_OVERLAY_WIDTH) {
        setOverlayWidth(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('theme-admin:overlay-width', String(overlayWidth));
  }, [overlayWidth]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const maxWidth = Math.max(MIN_OVERLAY_WIDTH, window.innerWidth - 160);
      const nextWidth = Math.min(
        Math.max(dragState.startWidth - (event.clientX - dragState.startX), MIN_OVERLAY_WIDTH),
        maxWidth
      );
      setOverlayWidth(nextWidth);
    };

    const stopDragging = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, []);

  const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: overlayWidth,
    };
    event.preventDefault();
  };

  if (!isThemeAdminOpen) {
    return null;
  }

  return (
    <AdminDesktopOnlyGate>
      <aside
        className={styles.overlay}
        aria-label="Theme Management workbench"
        style={{ width: `${overlayWidth}px` }}
      >
        <div
          className={styles.resizeHandle}
          onMouseDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Theme Management workbench"
        />
        <div className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={styles.modeBadge}>
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeThemeAdmin}
          >
            Close
          </button>
        </div>
        <div className={styles.body}>
          <ThemeAdminPage />
        </div>
      </aside>
    </AdminDesktopOnlyGate>
  );
}
