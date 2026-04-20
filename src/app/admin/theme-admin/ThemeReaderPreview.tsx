'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { StructuredThemeData } from '@/lib/types/theme';
import styles from './ThemeAdmin.module.css';

type PreviewMode = 'light' | 'dark';
type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const PREVIEW_SCOPE = 'themeAdminReaderPreview';

const PREVIEW_DEBOUNCE_MS = 280;

export default function ThemeReaderPreview({
  themeData,
  darkModeShift,
}: {
  themeData: StructuredThemeData | null;
  darkModeShift: number;
}) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('light');
  const [scopedCss, setScopedCss] = useState('');

  /** Stable serialized body; empty when theme is not ready for CSS generation. */
  const previewBodyJson = useMemo(() => {
    if (!themeData?.palette?.length || !themeData.themeColors?.length) return '';
    try {
      return JSON.stringify({ ...themeData, darkModeShift });
    } catch {
      return '';
    }
  }, [themeData, darkModeShift]);

  useEffect(() => {
    if (!previewBodyJson) {
      setScopedCss('');
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      (async () => {
        try {
          const res = await fetch('/api/theme/preview-css', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: previewBodyJson,
          });
          const data = await res.json();
          if (!ctrl.signal.aborted && res.ok && typeof data.css === 'string') {
            setScopedCss(data.css);
          } else if (!ctrl.signal.aborted) {
            const err = data as ApiErrorResponse;
            if (err.message || err.error) {
              console.error('[ThemeReaderPreview] preview CSS failed:', err.message || err.error);
            }
            setScopedCss('');
          }
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
          if (!ctrl.signal.aborted) setScopedCss('');
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [previewBodyJson]);

  return (
    <div className={styles.readerPreviewSection}>
      <div className={styles.readerPreviewHeader}>
        <h3 className={styles.readerPreviewTitle}>Reader preview</h3>
        <p className={styles.readerPreviewHint}>
          Sample feed tile using the tokens above (does not affect the rest of this page).
        </p>
        <div className={styles.readerPreviewModeToggle}>
          <button
            type="button"
            className={previewMode === 'light' ? styles.readerPreviewModeActive : styles.readerPreviewModeBtn}
            onClick={() => setPreviewMode('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={previewMode === 'dark' ? styles.readerPreviewModeActive : styles.readerPreviewModeBtn}
            onClick={() => setPreviewMode('dark')}
          >
            Dark
          </button>
        </div>
      </div>
      {scopedCss ? <style dangerouslySetInnerHTML={{ __html: scopedCss }} /> : null}
      <div
        className={`${PREVIEW_SCOPE} ${styles.readerPreviewCanvas}`}
        data-theme={previewMode}
      >
        <div className={styles.readerPreviewPage}>
          <div className={styles.readerPreviewCard}>
            <div className={styles.readerPreviewTagRow}>
              <span className={styles.readerPreviewTagWho}>Who</span>
              <span className={styles.readerPreviewTagWhen}>When</span>
            </div>
            <h4 className={styles.readerPreviewCardTitle}>Summer at the lake</h4>
            <p className={styles.readerPreviewCardBody}>
              A short sample paragraph in body type—how family will read longer stories on a phone.
            </p>
            <button type="button" className={styles.readerPreviewPrimaryBtn}>
              Open story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
