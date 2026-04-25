'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { StructuredThemeData } from '@/lib/types/theme';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import CardDetailPage from '@/app/view/[id]/CardDetailPage';
import V2ContentCard from '@/components/view/V2ContentCard';
import styles from './ThemeAdmin.module.css';

type PreviewMode = 'light' | 'dark';
type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const PREVIEW_SCOPE = 'themeAdminReaderPreview';
const ADMIN_PREVIEW_SCOPE = 'themeAdminAdminPreview';

const PREVIEW_DEBOUNCE_MS = 280;

const now = 1_700_000_000_000;
const previewTransparentPixel =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const lakeMedia: Media = {
  docId: 'preview-lake',
  filename: 'lake-preview.png',
  width: 1200,
  height: 760,
  size: 1,
  contentType: 'image/png',
  storageUrl: previewTransparentPixel,
  storagePath: 'preview/lake-preview.png',
  source: 'local',
  sourcePath: 'preview/lake-preview.png',
  createdAt: now,
  updatedAt: now,
};

const portraitMedia: Media = {
  ...lakeMedia,
  docId: 'preview-portrait',
  filename: 'portrait-preview.png',
  width: 900,
  height: 1100,
  storageUrl: previewTransparentPixel,
};

const baseCard = {
  docId: '',
  title_lowercase: '',
  status: 'published' as const,
  tags: [],
  content: '',
  createdAt: now,
  updatedAt: now,
};

const previewCards: Card[] = [
  {
    ...baseCard,
    title: 'Summer at the lake',
    type: 'story',
    displayMode: 'navigate',
    coverImage: lakeMedia,
    contentMedia: ['preview-lake'],
    content:
      '<p>We came back to this same little pier every July. The photos are ordinary, but together they make the place feel alive again.</p>',
  },
  {
    ...baseCard,
    title: "Greg's birthday",
    type: 'gallery',
    displayMode: 'navigate',
    coverImage: lakeMedia,
    galleryMedia: [
      { mediaId: 'preview-lake', media: lakeMedia, order: 0, caption: 'Cake, cousins, and the backyard table.' },
      { mediaId: 'preview-portrait', media: portraitMedia, order: 1, caption: 'Opening presents.' },
    ],
  },
  {
    ...baseCard,
    title: 'What did Grandma always cook?',
    type: 'qa',
    displayMode: 'navigate',
    excerpt: 'A Sunday answer from the kitchen table.',
    content:
      '<p>Chicken and noodles on Sundays, usually with everyone finding a chair wherever they could.</p>',
  },
  {
    ...baseCard,
    title: 'Family saying',
    subtitle: 'Grandpa',
    excerpt: 'Grandpa',
    type: 'quote',
    displayMode: 'static',
    content: '<p>Family is where the story keeps going.</p>',
  },
  {
    ...baseCard,
    title: 'Why this trip mattered',
    subtitle: 'Context note',
    excerpt: 'A short note that frames the memory.',
    type: 'callout',
    displayMode: 'static',
    content: '<p>This was the first summer everyone made it back at the same time.</p>',
  },
];

const [storyPreviewCard, galleryPreviewCard, questionPreviewCard] = previewCards;

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
          Preview only - applying presets changes this scoped sample until you choose Save Theme.
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
          <div className={styles.readerPreviewViewport}>
            <aside className={styles.readerPreviewSidebar}>
              <div className={styles.previewKicker}>Sidebar open</div>
              <div className={styles.readerPreviewModePill}>Freeform</div>
              <div className={styles.readerPreviewFilterGroup}>
                <span className={styles.readerPreviewFilterTitle}>Cards</span>
                <div className={styles.readerPreviewChipRow}>
                  <span>Story</span>
                  <span>Gallery</span>
                  <span>Q&A</span>
                  <span>Quote</span>
                  <span>Callout</span>
                </div>
              </div>
              <div className={styles.readerPreviewFilterGroup}>
                <span className={styles.readerPreviewFilterTitle}>Tags</span>
                <div className={styles.readerPreviewTagList}>
                  <span>Who / Family</span>
                  <span>What / Birthday</span>
                  <span>When / 1980s</span>
                  <span>Where / Illinois</span>
                </div>
              </div>
            </aside>
            <main className={styles.readerPreviewMain}>
              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Feed preview - closed cards</div>
                <div className={styles.readerPreviewFeedGrid}>
                  {previewCards.map((card) => (
                    <div key={`${card.type}-${card.title}`} className={styles.readerPreviewFeedCell}>
                      <V2ContentCard card={card} fullWidth />
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Detail preview - opened cards</div>
                <div className={styles.readerPreviewOpenGrid}>
                  {[storyPreviewCard, galleryPreviewCard, questionPreviewCard].map((card) => (
                    <div key={`open-${card.type}`} className={styles.readerPreviewDetailFrame}>
                      <div className={styles.previewKicker}>Open {card.type === 'qa' ? 'question' : card.type}</div>
                      <CardDetailPage card={card} childrenCards={[]} suppressDiscovery />
                    </div>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>
        <div
          className={`${ADMIN_PREVIEW_SCOPE} ${styles.adminPreviewCanvas}`}
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
