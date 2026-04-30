'use client';

import { useEffect, useRef, useState } from 'react';
import AdminDesktopOnlyGate from '@/components/admin/AdminDesktopOnlyGate';
import ThemeAdminPage from '@/components/admin/theme-admin/ThemeAdminPage';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './ThemeAdminOverlay.module.css';

const DEFAULT_OVERLAY_WIDTH = 1794;
const DEFAULT_OVERLAY_HEIGHT = 860;
const MIN_OVERLAY_WIDTH = 860;
const MIN_OVERLAY_HEIGHT = 620;
const VIEWPORT_MARGIN = 24;
const LEGACY_DEFAULT_OVERLAY_WIDTH = 1380;

type OverlayRect = {
  width: number;
  height: number;
  left: number;
  top: number;
};

type InteractionState =
  | {
      mode: 'move' | 'resize-right' | 'resize-corner';
      startX: number;
      startY: number;
      startLeft: number;
      startTop: number;
      startWidth: number;
      startHeight: number;
    }
  | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getViewportBounds() {
  const minTop = Math.max(0, VIEWPORT_MARGIN + 8);
  const maxWidth = Math.max(MIN_OVERLAY_WIDTH, window.innerWidth - (VIEWPORT_MARGIN * 2));
  return {
    minTop,
    maxWidth,
    maxHeight: Math.max(MIN_OVERLAY_HEIGHT, window.innerHeight - 120),
  };
}

function getDefaultOverlayRect(): OverlayRect {
  const { minTop, maxWidth, maxHeight } = getViewportBounds();
  const width = Math.min(DEFAULT_OVERLAY_WIDTH, maxWidth);
  const height = Math.min(DEFAULT_OVERLAY_HEIGHT, maxHeight);
  return {
    width,
    height,
    left: Math.max(VIEWPORT_MARGIN, Math.round((window.innerWidth - width) / 2)),
    top: Math.max(minTop, Math.round((window.innerHeight - height) / 2)),
  };
}

function constrainOverlayRect(rect: OverlayRect): OverlayRect {
  const { minTop, maxWidth, maxHeight } = getViewportBounds();
  const width = clamp(rect.width, MIN_OVERLAY_WIDTH, maxWidth);
  const height = clamp(rect.height, MIN_OVERLAY_HEIGHT, maxHeight);
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const maxTop = Math.max(minTop, window.innerHeight - height - VIEWPORT_MARGIN);

  return {
    width,
    height,
    left: clamp(rect.left, VIEWPORT_MARGIN, maxLeft),
    top: clamp(rect.top, minTop, maxTop),
  };
}

export default function ThemeAdminOverlay() {
  const { isThemeAdminOpen, closeThemeAdmin } = useTheme();
  const interactionRef = useRef<InteractionState>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !isThemeAdminOpen) return;

    const savedRect = window.sessionStorage.getItem('theme-admin:overlay-rect');
    if (savedRect) {
      try {
        const parsed = JSON.parse(savedRect) as Partial<OverlayRect>;
        if (
          typeof parsed.width === 'number' &&
          typeof parsed.height === 'number' &&
          typeof parsed.left === 'number' &&
          typeof parsed.top === 'number'
        ) {
          const upgradedRect: OverlayRect = {
            ...(parsed as OverlayRect),
            width:
              parsed.width === LEGACY_DEFAULT_OVERLAY_WIDTH
                ? DEFAULT_OVERLAY_WIDTH
                : parsed.width,
          };
          setOverlayRect(constrainOverlayRect(upgradedRect));
          return;
        }
      } catch {
        // Ignore corrupted session state and fall back to defaults.
      }
    }

    setOverlayRect(getDefaultOverlayRect());
  }, [isThemeAdminOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !overlayRect) return;
    window.sessionStorage.setItem('theme-admin:overlay-rect', JSON.stringify(overlayRect));
  }, [overlayRect]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (interaction.mode === 'move') {
        const nextLeft = interaction.startLeft + (event.clientX - interaction.startX);
        const nextTop = interaction.startTop + (event.clientY - interaction.startY);
        setOverlayRect((prev) => (prev
          ? constrainOverlayRect({
              ...prev,
              left: nextLeft,
              top: nextTop,
            })
          : prev));
        return;
      }

      if (interaction.mode === 'resize-right') {
        const nextWidth = interaction.startWidth + (event.clientX - interaction.startX);
        setOverlayRect((prev) => (prev
          ? constrainOverlayRect({
              ...prev,
              width: nextWidth,
            })
          : prev));
        return;
      }

      const nextWidth = interaction.startWidth + (event.clientX - interaction.startX);
      const nextHeight = interaction.startHeight + (event.clientY - interaction.startY);
      setOverlayRect((prev) => (prev
        ? constrainOverlayRect({
            ...prev,
            width: nextWidth,
            height: nextHeight,
          })
        : prev));
    };

    const stopInteraction = () => {
      interactionRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopInteraction);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopInteraction);
    };
  }, []);

  useEffect(() => {
    if (!isThemeAdminOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeThemeAdmin();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeThemeAdmin, isThemeAdminOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !overlayRect) return;

    const onResize = () => {
      setOverlayRect((prev) => (prev ? constrainOverlayRect(prev) : prev));
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [overlayRect]);

  const startMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRect) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    interactionRef.current = {
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      startLeft: overlayRect.left,
      startTop: overlayRect.top,
      startWidth: overlayRect.width,
      startHeight: overlayRect.height,
    };
    event.preventDefault();
  };

  const startResize = (
    mode: 'resize-right' | 'resize-corner',
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!overlayRect) return;
    interactionRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: overlayRect.left,
      startTop: overlayRect.top,
      startWidth: overlayRect.width,
      startHeight: overlayRect.height,
    };
    event.preventDefault();
    event.stopPropagation();
  };

  if (!isThemeAdminOpen || !overlayRect) {
    return null;
  }

  return (
    <AdminDesktopOnlyGate>
      <div
        className={styles.scrim}
      >
        <aside
          className={`${styles.overlay} ${styles.themeLinkedOverlay}`}
          aria-label="Theme Management workbench"
          role="dialog"
          style={{
            width: `${overlayRect.width}px`,
            height: `${overlayRect.height}px`,
            left: `${overlayRect.left}px`,
            top: `${overlayRect.top}px`,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div
            className={styles.resizeHandle}
            onMouseDown={(event) => startResize('resize-right', event)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Theme Management workbench"
          />
          <div
            className={styles.resizeCorner}
            onMouseDown={(event) => startResize('resize-corner', event)}
            aria-hidden="true"
          />
          <div
            className={styles.header}
            onMouseDown={startMove}
          >
            <div />
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeThemeAdmin}
            >
              X
            </button>
          </div>
          <div className={`${styles.body} ${styles.themeLinkedOverlay}`}>
            <ThemeAdminPage />
          </div>
        </aside>
      </div>
    </AdminDesktopOnlyGate>
  );
}
