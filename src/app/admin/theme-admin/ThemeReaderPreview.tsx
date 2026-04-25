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
const ADMIN_PREVIEW_SCOPE = 'themeAdminAdminPreview';

const PREVIEW_DEBOUNCE_MS = 280;

export default function ThemeReaderPreview({
  themeData,
  darkModeShift,
  adminThemeData,
  adminDarkModeShift,
}: {
  themeData: StructuredThemeData | null;
  darkModeShift: number;
  adminThemeData: StructuredThemeData | null;
  adminDarkModeShift: number;
}) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('light');
  const [scopedCss, setScopedCss] = useState('');

  /** Stable serialized body; empty when theme is not ready for CSS generation. */
  const previewBodyJson = useMemo(() => {
    if (!themeData?.palette?.length || !themeData.themeColors?.length) return '';
    try {
      return JSON.stringify({
        reader: { themeData, darkModeShift },
        admin: { themeData: adminThemeData, darkModeShift: adminDarkModeShift },
      });
    } catch {
      return '';
    }
  }, [themeData, darkModeShift, adminThemeData, adminDarkModeShift]);

  useEffect(() => {
    if (!previewBodyJson) {
      setScopedCss('');
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      (async () => {
        try {
          const body = JSON.parse(previewBodyJson) as {
            reader: { themeData: StructuredThemeData; darkModeShift: number };
            admin: { themeData: StructuredThemeData | null; darkModeShift: number };
          };
          const [readerRes, adminRes] = await Promise.all([
            fetch('/api/theme/preview-css', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: ctrl.signal,
              body: JSON.stringify({ ...body.reader.themeData, darkModeShift: body.reader.darkModeShift }),
            }),
            body.admin.themeData
              ? fetch('/api/theme/preview-css', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: ctrl.signal,
                  body: JSON.stringify({
                    themeData: body.admin.themeData,
                    darkModeShift: body.admin.darkModeShift,
                    scope: 'admin',
                  }),
                })
              : Promise.resolve(null),
          ]);
          const readerData = await readerRes.json();
          const adminData = adminRes ? await adminRes.json() : { css: '' };
          if (
            !ctrl.signal.aborted &&
            readerRes.ok &&
            (!adminRes || adminRes.ok) &&
            typeof readerData.css === 'string' &&
            typeof adminData.css === 'string'
          ) {
            setScopedCss(`${readerData.css}\n${adminData.css}`);
          } else if (!ctrl.signal.aborted) {
            const err = (!readerRes.ok ? readerData : adminData) as ApiErrorResponse;
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
          Scoped reader and admin samples using the tokens above (does not affect the rest of this page).
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
      <div className={styles.previewSamples}>
        <div
          className={`${PREVIEW_SCOPE} ${styles.readerPreviewCanvas}`}
          data-theme={previewMode}
        >
          <div className={styles.readerPreviewPage}>
            <div className={styles.previewKicker}>Reader</div>
            <div className={styles.readerPreviewCard}>
              <div className={styles.readerPreviewTagRow}>
                <span className={styles.readerPreviewTagWho}>Who</span>
                <span className={styles.readerPreviewTagWhen}>When</span>
              </div>
              <h4 className={styles.readerPreviewCardTitle}>Summer at the lake</h4>
              <p className={styles.readerPreviewCardBody}>
                A short sample paragraph in body type - how family will read longer stories on a phone.
              </p>
              <button type="button" className={styles.readerPreviewPrimaryBtn}>
                Open story
              </button>
            </div>
          </div>
        </div>
        <div
          className={`${ADMIN_PREVIEW_SCOPE} ${styles.readerPreviewCanvas}`}
          data-theme={previewMode}
        >
          <div className={styles.readerPreviewPage}>
            <div className={styles.previewKicker}>Admin</div>
            <div className={styles.adminPreviewPanel}>
              <div className={styles.adminPreviewToolbar}>
                <button type="button" className={styles.readerPreviewPrimaryBtn}>
                  Save
                </button>
                <button type="button" className={styles.adminPreviewSecondaryBtn}>
                  Review changes
                </button>
              </div>
              <label className={styles.adminPreviewLabel}>
                Title
                <input className={styles.adminPreviewInput} value="Greg's Birthday" readOnly />
              </label>
              <div className={styles.adminPreviewGridRow}>
                <span>Status</span>
                <strong>Draft</strong>
              </div>
              <div className={styles.adminPreviewNotice}>Tags saved. 12 media selected.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
