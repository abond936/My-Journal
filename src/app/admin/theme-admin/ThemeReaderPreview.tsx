'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { StructuredThemeData } from '@/lib/types/theme';
import type { ThemePresetId } from '@/lib/theme/themePresets';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import JournalImage from '@/components/common/JournalImage';
import CardDetailPage from '@/app/view/[id]/CardDetailPage';
import V2ContentCard from '@/components/view/V2ContentCard';
import ChildCardsRail from '@/components/view/ChildCardsRail';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import TagTree from '@/components/common/TagTree';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './ThemeAdmin.module.css';
import feedStyles from '@/components/view/CardFeedV2.module.css';
import discoveryStyles from '@/components/view/DiscoverySection.module.css';
import sidebarStyles from '@/components/common/GlobalSidebar.module.css';
import galleryStyles from '@/components/view/InlineGallery.module.css';

type PreviewMode = 'light' | 'dark';
type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const PREVIEW_SCOPE = 'themeAdminReaderPreview';
const ADMIN_PREVIEW_SCOPE = 'themeAdminAdminPreview';

const PREVIEW_DEBOUNCE_MS = 280;

const now = 1_700_000_000_000;

const svgPreviewImage = (primary: string, secondary: string, label: string) => (
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="760" fill="url(#sky)" />
      <circle cx="950" cy="170" r="86" fill="rgba(255,255,255,.55)" />
      <path d="M0 520 C160 455 260 585 420 515 C610 430 750 560 930 490 C1040 448 1120 462 1200 430 L1200 760 L0 760 Z" fill="rgba(255,255,255,.28)" />
      <path d="M0 610 C180 550 320 650 520 590 C720 530 860 640 1200 565 L1200 760 L0 760 Z" fill="rgba(0,0,0,.20)" />
    </svg>
  `)}`
);

const lakePreviewImage = svgPreviewImage('#7ea6b8', '#d5b98d', 'Lake preview');
const portraitPreviewImage = svgPreviewImage('#a58972', '#d9c8b4', 'Portrait preview');

const lakeMedia: Media = {
  docId: 'preview-lake',
  filename: 'lake-preview.png',
  width: 1200,
  height: 760,
  size: 1,
  contentType: 'image/png',
  storageUrl: lakePreviewImage,
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
  storageUrl: portraitPreviewImage,
};

const buildFigureHtml = (src: string, mediaId: string, label: string, caption: string) => `
  <figure class="figure" data-figure-with-image="" data-size="large" data-alignment="center" data-wrap="off" data-media-id="${mediaId}">
    <img src="${src}" alt="${label}" width="1200" height="760" data-media-id="${mediaId}" />
    <figcaption>${caption}</figcaption>
  </figure>
`;

const previewStoryContent = `
  <h2>The dock kept the memory honest</h2>
  <p>
    We came back with different cameras and different kids, but the same angle kept pulling us in.
    <span data-type="cardMention" data-card-id="preview-family-saying" data-label="Family saying" class="card-inline-link" role="link" tabindex="0">@Family saying</span>
    still sounds right whenever these photos come up.
  </p>
  ${buildFigureHtml(
    lakePreviewImage,
    'preview-lake',
    'Lake preview',
    'Evening light on the pier, after everyone else had gone inside.'
  )}
  <blockquote><p>Being in the same place again made the years line up for a minute.</p></blockquote>
  <p>The little details matter here: captions, figure frames, inline links, and the blockquote treatment all need to read cleanly against the same theme.</p>
`;

const previewCalloutContent = `
  <p>This note wants to prove subtitle, excerpt, lists, and inline rich text all stay coherent.</p>
  <ul>
    <li>Short framing text</li>
    <li>A list that is still easy to scan</li>
    <li>An inline reference to <span data-type="cardMention" data-card-id="preview-lake-story" data-label="Summer at the lake" class="card-inline-link" role="link" tabindex="0">@Summer at the lake</span></li>
  </ul>
`;

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
    docId: 'preview-lake-story',
    title: 'Summer at the lake',
    title_lowercase: 'summer at the lake',
    type: 'story',
    displayMode: 'navigate',
    coverImage: lakeMedia,
    contentMedia: ['preview-lake'],
    subtitle: 'A recurring place',
    excerpt: 'Same dock, different years, still the easiest way back into the story.',
    who: ['family'],
    what: ['summer trip'],
    when: ['1980s'],
    where: ['illinois'],
    content: previewStoryContent,
  },
  {
    ...baseCard,
    docId: 'preview-birthday-gallery',
    title: "Greg's birthday",
    title_lowercase: "greg's birthday",
    type: 'gallery',
    displayMode: 'navigate',
    coverImage: lakeMedia,
    excerpt: 'Cake, cousins, and the backyard table.',
    galleryMedia: [
      { mediaId: 'preview-lake', media: lakeMedia, order: 0, caption: 'Cake, cousins, and the backyard table.' },
      { mediaId: 'preview-portrait', media: portraitMedia, order: 1, caption: 'Opening presents.' },
    ],
  },
  {
    ...baseCard,
    docId: 'preview-grandma-qa',
    title: 'What did Grandma always cook?',
    title_lowercase: 'what did grandma always cook?',
    type: 'qa',
    displayMode: 'navigate',
    subtitle: 'Kitchen memory',
    excerpt: 'A Sunday answer from the kitchen table.',
    content: '<p>Chicken and noodles on Sundays, usually with everyone finding a chair wherever they could.</p>',
  },
  {
    ...baseCard,
    docId: 'preview-family-saying',
    title: 'Family saying',
    title_lowercase: 'family saying',
    subtitle: 'Grandpa',
    excerpt: 'Grandpa',
    type: 'quote',
    displayMode: 'static',
    content: '<p>Family is where the story keeps going.</p>',
  },
  {
    ...baseCard,
    docId: 'preview-trip-callout',
    title: 'Why this trip mattered',
    title_lowercase: 'why this trip mattered',
    subtitle: 'Context note',
    excerpt: 'A short note that frames the memory.',
    type: 'callout',
    displayMode: 'static',
    content: previewCalloutContent,
  },
];

const [storyPreviewCard, galleryPreviewCard, questionPreviewCard, quotePreviewCard, calloutPreviewCard] = previewCards;

const previewChildCards: Card[] = [
  {
    ...baseCard,
    docId: 'preview-child-1',
    title: 'Grandpa on the dock',
    title_lowercase: 'grandpa on the dock',
    type: 'story',
    displayMode: 'navigate',
    coverImage: portraitMedia,
    excerpt: 'A quiet portrait before dinner.',
  },
  {
    ...baseCard,
    docId: 'preview-child-2',
    title: 'Picnic spread',
    title_lowercase: 'picnic spread',
    type: 'gallery',
    displayMode: 'navigate',
    coverImage: lakeMedia,
  },
  {
    ...baseCard,
    docId: 'preview-child-3',
    title: 'Who remembered the song?',
    title_lowercase: 'who remembered the song?',
    type: 'qa',
    displayMode: 'navigate',
    excerpt: 'A tiny prompt card in the rail.',
  },
];

const previewDiscoveryRelated: Card[] = [galleryPreviewCard, questionPreviewCard, quotePreviewCard];
const previewDiscoveryRandom: Card[] = [calloutPreviewCard, storyPreviewCard, galleryPreviewCard];

const previewTagTree: TagWithChildren[] = [
  {
    docId: 'tag-family',
    name: 'Family',
    dimension: 'who',
    cardCount: 12,
    mediaCount: 33,
    defaultExpanded: true,
    children: [
      {
        docId: 'tag-grandparents',
        name: 'Grandparents',
        dimension: 'who',
        parentId: 'tag-family',
        cardCount: 5,
        mediaCount: 11,
        children: [],
      },
      {
        docId: 'tag-cousins',
        name: 'Cousins',
        dimension: 'who',
        parentId: 'tag-family',
        cardCount: 4,
        mediaCount: 8,
        children: [],
      },
    ],
  },
  {
    docId: 'tag-trips',
    name: 'Trips',
    dimension: 'what',
    cardCount: 9,
    mediaCount: 18,
    defaultExpanded: false,
    children: [
      {
        docId: 'tag-lake-house',
        name: 'Lake house',
        dimension: 'what',
        parentId: 'tag-trips',
        cardCount: 6,
        mediaCount: 14,
        children: [],
      },
    ],
  },
];

const previewSolidControlStyle = {
  backgroundColor: 'var(--reader-solid-background-color)',
  color: 'var(--reader-solid-text-color)',
  borderColor: 'var(--reader-solid-border-color)',
  fontWeight: 'var(--font-weight-semibold)',
} as const;

function PreviewSidebarChrome() {
  return (
    <>
      <h2 className={sidebarStyles.title}>Explore</h2>
      <div className={sidebarStyles.modeTabs} role="tablist" aria-label="Browsing mode">
        <button type="button" role="tab" aria-selected={false} className={sidebarStyles.modeTab}>
          Curated
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={true}
          className={`${sidebarStyles.modeTab} ${sidebarStyles.modeTabActive} ${styles.readerPreviewSolidControl}`}
          style={previewSolidControlStyle}
        >
          Freeform
        </button>
      </div>

      <div className={sidebarStyles.sidebarSection}>
        <h3 className={sidebarStyles.sectionHeading}>Cards</h3>
        <div className={sidebarStyles.cardTypeChips} role="group" aria-label="Filter by card type">
          <button type="button" className={`${sidebarStyles.cardTypeChip} ${sidebarStyles.cardTypeChipActive} ${styles.readerPreviewSolidControl}`}>Story</button>
          <button type="button" className={`${sidebarStyles.cardTypeChip} ${sidebarStyles.cardTypeChipActive} ${styles.readerPreviewSolidControl}`}>Gallery</button>
          <button type="button" className={sidebarStyles.cardTypeChip}>Q&amp;A</button>
          <button type="button" className={sidebarStyles.cardTypeChip}>Quote</button>
          <button type="button" className={sidebarStyles.cardTypeChip}>Callout</button>
        </div>
      </div>

      <div className={sidebarStyles.sidebarSection}>
        <h3 className={sidebarStyles.sectionHeading}>Tags</h3>
        <div className={sidebarStyles.viewTagSidebarTabs} role="tablist" aria-label="Tag sidebar mode">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={`${sidebarStyles.viewTagSidebarTab} ${sidebarStyles.viewTagSidebarTabActive} ${styles.readerPreviewSolidControl}`}
          >
            Filter feed
          </button>
          <button type="button" role="tab" aria-selected={false} className={sidebarStyles.viewTagSidebarTab}>
            Edit library
          </button>
        </div>
        <div className={sidebarStyles.dimensionsBlock}>
          <div className={sidebarStyles.dimensionTabs} role="tablist" aria-label="Tag dimensions">
            <button type="button" role="tab" aria-selected={true} className={`${sidebarStyles.dimensionTab} ${sidebarStyles.dimensionTabActive} ${styles.readerPreviewSolidControl}`}>Who</button>
            <button type="button" role="tab" aria-selected={false} className={sidebarStyles.dimensionTab}>What</button>
            <button type="button" role="tab" aria-selected={false} className={sidebarStyles.dimensionTab}>When</button>
            <button type="button" role="tab" aria-selected={false} className={sidebarStyles.dimensionTab}>Where</button>
          </div>
        </div>
        <div className={sidebarStyles.searchBlock}>
          <input
            type="search"
            readOnly
            value="fam"
            className={sidebarStyles.compactControl}
            aria-label="Search tags in tree"
          />
        </div>
        <div className={sidebarStyles.activeFilters}>
          <span className={sidebarStyles.activeFiltersLabel}>Active</span>
          <div className={sidebarStyles.activeFiltersChips}>
            <span className={`${sidebarStyles.filterChip} ${styles.readerPreviewSolidChip}`}>
              Story
              <button type="button" className={sidebarStyles.filterChipRemove} aria-label="Remove Story filter">
                x
              </button>
            </span>
            <span className={`${sidebarStyles.filterChip} ${styles.readerPreviewSolidChip}`}>
              Family
              <button type="button" className={sidebarStyles.filterChipRemove} aria-label="Remove Family filter">
                x
              </button>
            </span>
            <button type="button" className={sidebarStyles.activeFiltersResetTypes}>All card types</button>
          </div>
        </div>
        <nav className={sidebarStyles.navigation}>
          <TagTree
            tree={previewTagTree}
            selectedTags={['tag-family']}
            onSelectionChange={() => {}}
            emptyMessage="No tags available."
          />
        </nav>
      </div>

      <div className={sidebarStyles.sidebarSection}>
        <h3 className={sidebarStyles.sectionHeading}>Sort by</h3>
        <select className={sidebarStyles.compactControl} defaultValue="random" aria-label="Sort card feed">
          <option value="random">Random</option>
        </select>
      </div>

      <div className={sidebarStyles.sidebarSection}>
        <h3 className={sidebarStyles.sectionHeading}>Group by</h3>
        <select className={sidebarStyles.compactControl} defaultValue="when" aria-label="Group card feed">
          <option value="when">When</option>
        </select>
      </div>

      <div className={sidebarStyles.filterControls}>
        <button type="button" className={sidebarStyles.clearButton}>Clear filters</button>
      </div>
    </>
  );
}

function PreviewDiscoverySection() {
  return (
    <section className={discoveryStyles.discoverySection}>
      <h2 className={discoveryStyles.discoveryTitle}>Explore More</h2>

      <div className={discoveryStyles.discoveryGroup}>
        <h3 className={discoveryStyles.groupTitle}>Related</h3>
        <div className={discoveryStyles.cardRail} role="list" aria-label="Related cards">
          {previewDiscoveryRelated.map((card) => (
            <div key={`related-${card.docId}`} className={discoveryStyles.cardRailCell} role="listitem">
              <V2ContentCard card={card} size="small" fullWidth />
            </div>
          ))}
        </div>
      </div>

      <div className={discoveryStyles.discoveryGroup}>
        <h3 className={`${discoveryStyles.groupTitle} ${discoveryStyles.exploreGroupTitle}`}>Random</h3>
        <div className={discoveryStyles.cardRail} role="list" aria-label="Random cards">
          {previewDiscoveryRandom.map((card) => (
            <div key={`random-${card.docId}`} className={discoveryStyles.cardRailCell} role="listitem">
              <V2ContentCard card={card} size="small" fullWidth />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewStatesStrip() {
  return (
    <section className={styles.readerPreviewStatesSection}>
      <div className={styles.previewKicker}>States</div>
      <div className={styles.readerPreviewStatesGrid}>
        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Feed empty</div>
          <div className={feedStyles.emptyFeed}>
            <p className={feedStyles.emptyFeedTitle}>No cards match the current view.</p>
            <p className={feedStyles.emptyFeedHint}>
              Tag, type, search, collection, or group by may be limiting results.
            </p>
            <button type="button" className={feedStyles.emptyClearButton}>Clear filters</button>
          </div>
        </div>

        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Discovery loading</div>
          <section className={discoveryStyles.discoverySection}>
            <h2 className={discoveryStyles.discoveryTitle}>Explore More</h2>
            <div className={discoveryStyles.loadingContainer}>
              <LoadingSpinner />
              <p>Loading related content...</p>
            </div>
          </section>
        </div>

        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Discovery error</div>
          <section className={discoveryStyles.discoverySection}>
            <h2 className={discoveryStyles.discoveryTitle}>Explore More</h2>
            <div className={discoveryStyles.errorContainer} role="alert">
              <p>Unable to load suggestions. Try again in a moment.</p>
            </div>
          </section>
        </div>

        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Gallery lightbox</div>
          <div className={styles.readerPreviewLightboxFrame}>
            <div
              className={galleryStyles.lightboxOverlay}
              style={{ position: 'absolute', inset: 0, padding: 'var(--spacing-md)' }}
            >
              <div
                className={galleryStyles.lightboxCounter}
                style={{ position: 'absolute', top: 'var(--spacing-md)', left: 'var(--spacing-md)' }}
              >
                2 / 8
              </div>
              <div className={galleryStyles.lightboxInner} style={{ width: '100%', maxHeight: 'none' }}>
                <button
                  type="button"
                  className={galleryStyles.lightboxClose}
                  style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)' }}
                  disabled
                  aria-disabled="true"
                >
                  Close
                </button>
                <div className={styles.readerPreviewLightboxImageWrap}>
                  <JournalImage
                    src={portraitPreviewImage}
                    alt="Preview lightbox"
                    className={galleryStyles.lightboxImage}
                    width={900}
                    height={1100}
                    sizes="320px"
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                  />
                </div>
                <p className={galleryStyles.lightboxCaption}>Opening presents in the living room.</p>
              </div>
            </div>
          </div>
          <p className={styles.readerPreviewStateNote}>Static state sample only.</p>
        </div>

        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Collection mode</div>
          <div className={styles.readerPreviewSidebarMini}>
            <div className={sidebarStyles.modeTabs} role="tablist" aria-label="Browsing mode">
              <button
                type="button"
                role="tab"
                aria-selected={true}
                className={`${sidebarStyles.modeTab} ${sidebarStyles.modeTabActive} ${styles.readerPreviewSolidControl}`}
                style={previewSolidControlStyle}
              >
                Curated
              </button>
              <button type="button" role="tab" aria-selected={false} className={sidebarStyles.modeTab}>
                Freeform
              </button>
            </div>
            <div className={sidebarStyles.dimensionsBlock}>
              <div className={sidebarStyles.dimensionTabs} role="tablist" aria-label="Dimensions">
                <button type="button" role="tab" aria-selected={true} className={`${sidebarStyles.dimensionTab} ${sidebarStyles.dimensionTabActive} ${styles.readerPreviewSolidControl}`}>
                  All
                </button>
                <button type="button" role="tab" aria-selected={false} className={sidebarStyles.dimensionTab}>
                  Who
                </button>
                <button type="button" role="tab" aria-selected={false} className={sidebarStyles.dimensionTab}>
                  What
                </button>
              </div>
            </div>
            <div className={sidebarStyles.collectionGroups}>
              <div className={sidebarStyles.collectionGroup}>
                <div className={sidebarStyles.collectionGroupLabel}>Who</div>
                <ul className={sidebarStyles.collectionList}>
                  <li>
                    <button type="button" className={sidebarStyles.collectionItem}>
                      Grandparents <span className={sidebarStyles.collectionCount}>(4)</span>
                    </button>
                  </li>
                  <li>
                    <button type="button" className={sidebarStyles.collectionItem}>
                      Cousins <span className={sidebarStyles.collectionCount}>(3)</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.readerPreviewStateCard}>
          <div className={styles.previewKicker}>Focus and active</div>
          <div className={styles.readerPreviewControlStack}>
            <span className={styles.readerPreviewInlineLinkFocus} role="link" tabIndex={0}>
              @Summer at the lake
            </span>
            <button type="button" className={`${sidebarStyles.cardTypeChip} ${sidebarStyles.cardTypeChipActive} ${styles.readerPreviewSolidControl}`}>
              Story
            </button>
            <button type="button" className={styles.readerPreviewFocusButton}>
              Focus ring sample
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ThemeReaderPreview({
  themeData,
  darkModeShift,
  adminThemeData,
  adminDarkModeShift,
  activePresetId,
  readerControls,
  readerScopeClass = PREVIEW_SCOPE,
  adminScopeClass = ADMIN_PREVIEW_SCOPE,
  extraScopedCss,
}: {
  themeData: StructuredThemeData | null;
  darkModeShift: number;
  adminThemeData: StructuredThemeData | null;
  adminDarkModeShift: number;
  activePresetId: ThemePresetId | 'custom';
  readerControls?: React.ReactNode;
  readerScopeClass?: string;
  adminScopeClass?: string;
  extraScopedCss?: string;
}) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  });
  const [scopedCss, setScopedCss] = useState('');
  const [previewCssError, setPreviewCssError] = useState<string | null>(null);

  const previewBodyJson = useMemo(() => {
    if (!themeData?.palette?.length || !themeData.themeColors?.length) return '';
    try {
      return JSON.stringify({
        reader: { themeData, darkModeShift, activePresetId },
        admin: { themeData: adminThemeData, darkModeShift: adminDarkModeShift },
      });
    } catch {
      return '';
    }
  }, [themeData, darkModeShift, activePresetId, adminThemeData, adminDarkModeShift]);

  useEffect(() => {
    if (!previewBodyJson) {
      setScopedCss('');
      setPreviewCssError('Preview CSS is waiting for valid theme data.');
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      (async () => {
        try {
          const body = JSON.parse(previewBodyJson) as {
            reader: { themeData: StructuredThemeData; darkModeShift: number; activePresetId: ThemePresetId | 'custom' };
            admin: { themeData: StructuredThemeData | null; darkModeShift: number };
          };
          const [readerRes, adminRes] = await Promise.all([
            fetch('/api/theme/preview-css', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: ctrl.signal,
              body: JSON.stringify({
                ...body.reader.themeData,
                darkModeShift: body.reader.darkModeShift,
                activePresetId: body.reader.activePresetId,
                scopeSelector: `.${readerScopeClass}`,
              }),
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
                    scopeSelector: `.${adminScopeClass}`,
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
            setPreviewCssError(null);
          } else if (!ctrl.signal.aborted) {
            const err = (!readerRes.ok ? readerData : adminData) as ApiErrorResponse;
            if (err.message || err.error) {
              console.error('[ThemeReaderPreview] preview CSS failed:', err.message || err.error);
            }
            setScopedCss('');
            setPreviewCssError(err.message || err.error || 'Preview CSS failed to generate.');
          }
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
          if (!ctrl.signal.aborted) {
            setScopedCss('');
            setPreviewCssError('Preview CSS failed to generate.');
          }
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [previewBodyJson, adminScopeClass, readerScopeClass]);

  return (
    <div className={styles.readerPreviewSection}>
      <div className={styles.readerPreviewHeader}>
        <h3 className={styles.readerPreviewTitle}>Theme preview</h3>
        <div className={styles.previewHeaderControls}>
          {readerControls}
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
      </div>
      {scopedCss || extraScopedCss ? (
        <style dangerouslySetInnerHTML={{ __html: `${scopedCss || ''}\n${extraScopedCss || ''}` }} />
      ) : null}
      {previewCssError ? (
        <div className={styles.previewWarning} role="alert">
          {previewCssError}
        </div>
      ) : null}
      <div className={styles.previewSamples}>
        <div className={`${readerScopeClass} ${styles.readerPreviewCanvas}`} data-theme={previewMode}>
          <div className={styles.readerPreviewViewport}>
            <aside className={styles.readerPreviewSidebar}>
              <div className={styles.previewKicker}>Sidebar open</div>
              <PreviewSidebarChrome />
            </aside>
            <main className={styles.readerPreviewMain}>
              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Closed cards</div>
                <section className={feedStyles.groupSection} aria-labelledby="theme-preview-group">
                  <h2 id="theme-preview-group" className={feedStyles.groupHeading}>
                    Summer memories
                  </h2>
                </section>
                <div className={styles.readerPreviewFeedGrid}>
                  {previewCards.map((card) => (
                    <div key={`${card.type}-${card.title}`} className={styles.readerPreviewFeedCell}>
                      <V2ContentCard card={card} fullWidth />
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Opened cards</div>
                <div className={styles.readerPreviewOpenGrid}>
                  {[storyPreviewCard, galleryPreviewCard, questionPreviewCard].map((card) => (
                    <div key={`open-${card.docId}`} className={styles.readerPreviewDetailFrame}>
                      <div className={styles.previewKicker}>Open {card.type === 'qa' ? 'question' : card.type}</div>
                      <CardDetailPage
                        card={card}
                        childrenCards={card.type === 'story' ? previewChildCards : []}
                        suppressDiscovery
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Reader detail extras</div>
                <div className={styles.readerPreviewExtrasGrid}>
                  <div className={styles.readerPreviewSurface}>
                    <div className={styles.previewKicker}>Rich text body</div>
                    <TipTapRenderer content={previewStoryContent} />
                  </div>
                  <div className={styles.readerPreviewSurface}>
                    <div className={styles.previewKicker}>Child rail</div>
                    <ChildCardsRail cards={previewChildCards} />
                  </div>
                  <div className={styles.readerPreviewSurfaceWide}>
                    <div className={styles.previewKicker}>Discovery</div>
                    <PreviewDiscoverySection />
                  </div>
                </div>
              </section>

              <section className={styles.readerPreviewBlock}>
                <PreviewStatesStrip />
              </section>
            </main>
          </div>
        </div>
        <div className={`${adminScopeClass} ${styles.adminPreviewCanvas}`} data-theme={previewMode}>
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
