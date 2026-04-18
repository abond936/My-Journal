'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import TagAdminStudioPane from '@/components/admin/studio/TagAdminStudioPane';
import styles from './StudioWorkspace.module.css';

const STORAGE_KEY = 'studioPaneWidths';
const HANDLE = 8;
const MIN_LEFT = 200;
const MIN_CENTER = 240;
const MIN_RIGHT = 160;

function readStoredWidths(): { left: number; right: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { left?: number; right?: number };
    if (typeof o.left === 'number' && typeof o.right === 'number') return { left: o.left, right: o.right };
  } catch {
    /* ignore */
  }
  return null;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export default function StudioWorkspace() {
  const [wideLayout, setWideLayout] = useState(true);
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(280);
  const leftRef = useRef(leftWidth);
  const rightRef = useRef(rightWidth);
  const [drag, setDrag] = useState<{
    which: 1 | 2;
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  leftRef.current = leftWidth;
  rightRef.current = rightWidth;

  useEffect(() => {
    const stored = readStoredWidths();
    if (stored) {
      setLeftWidth(stored.left);
      setRightWidth(stored.right);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1201px)');
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const persistWidths = useCallback((left: number, right: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!drag) return;

    const chrome = 32;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX;
      if (drag.which === 1) {
        const maxLeft =
          window.innerWidth - rightRef.current - HANDLE * 2 - MIN_CENTER - chrome;
        const next = clamp(drag.startLeft + dx, MIN_LEFT, maxLeft);
        setLeftWidth(next);
      } else {
        const maxRight =
          window.innerWidth - leftRef.current - HANDLE * 2 - MIN_CENTER - chrome;
        const next = clamp(drag.startRight - dx, MIN_RIGHT, maxRight);
        setRightWidth(next);
      }
    };

    const onUp = () => {
      persistWidths(leftRef.current, rightRef.current);
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, persistWidths]);

  const onHandleDown = useCallback(
    (which: 1 | 2) => (e: React.PointerEvent) => {
      if (!wideLayout) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ which, startX: e.clientX, startLeft: leftWidth, startRight: rightWidth });
    },
    [wideLayout, leftWidth, rightWidth]
  );

  const gridStyle = useMemo(() => {
    if (!wideLayout) return undefined;
    return {
      gridTemplateColumns: `${leftWidth}px ${HANDLE}px minmax(${MIN_CENTER}px, 1fr) ${HANDLE}px ${rightWidth}px`,
    } as React.CSSProperties;
  }, [wideLayout, leftWidth, rightWidth]);

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Experimental <strong>Admin Studio</strong>: tag tree, curated card tree, and a metadata column in one
        screen. This route is separate from Collections and Tag admin so we can evolve layout and interactions without
        replacing them.{' '}
        <Link href="/admin/collections">Collections</Link> · <Link href="/admin/tag-admin">Tag admin</Link>.
        {wideLayout ? (
          <>
            {' '}
            Drag the narrow bars between columns to resize; widths are saved in this browser.
          </>
        ) : null}
      </p>

      <div className={wideLayout ? styles.grid : styles.gridStacked} style={gridStyle}>
        <TagAdminStudioPane />

        {wideLayout ? (
          <div
            className={styles.resizeHandle}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tag and card columns"
            onPointerDown={onHandleDown(1)}
          />
        ) : null}

        <div className={styles.collectionsHost}>
          <CollectionsAdminClient embedded />
        </div>

        {wideLayout ? (
          <div
            className={styles.resizeHandle}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize card and metadata columns"
            onPointerDown={onHandleDown(2)}
          />
        ) : null}

        <aside className={styles.metaPane} aria-label="Studio notes">
          <h2>Metadata</h2>
          <p>
            Inline metadata for each card and media row (status, type, display mode, captions) will live here as
            the studio grows. Bulk tag apply across mixed selections can follow later.
          </p>
          <p>
            For scale, this pane will pair with stronger <strong>filtering</strong> and <strong>collapse</strong> in
            the tree columns.
          </p>
          <ul>
            <li>Left: same tag DnD as Tag admin (shared hook + data).</li>
            <li>Center: same curated collections client as the Collections page.</li>
            <li>Right: placeholder for per-row fields and future media subtree.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
