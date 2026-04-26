'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { ReaderThemeRecipes, ScopedThemeDocumentData, StructuredThemeData } from '@/lib/types/theme';
import type { ThemePresetId } from '@/lib/theme/themePresets';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import JournalImage from '@/components/common/JournalImage';
import CardDetailPage from '@/app/view/[id]/CardDetailPage';
import V2ContentCard from '@/components/view/V2ContentCard';
import ChildCardsRail from '@/components/view/ChildCardsRail';
import TagTree from '@/components/common/TagTree';
import TagSelector from '@/components/common/TagSelector';
import SearchBar from '@/components/common/SearchBar';
import PhotoPicker from '@/components/common/PhotoPicker';
import ImageToolbar from '@/components/common/ImageToolbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CURRENT_READER_THEME_COMPONENTS } from '@/lib/theme/readerThemeSystem';
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

type PreviewCoverageEntry = {
  surface: string;
  note?: string;
};

const PREVIEW_SCOPE = 'themeAdminReaderPreview';
const ADMIN_PREVIEW_SCOPE = 'themeAdminAdminPreview';

const PREVIEW_DEBOUNCE_MS = 280;
const PREVIEW_COVERAGE_BY_VARIANT: Record<string, PreviewCoverageEntry> = {
  'canvas.reader': {
    surface: 'Reader shell canvas, inline link sample, and focus-state sample',
    note: 'Covers page surface, body/meta text, inline links, and focus treatment in the scoped reader canvas.',
  },
  'storyCard.closed': {
    surface: 'Story column -> Closed card',
  },
  'storyCard.open': {
    surface: 'Story column -> Open card detail',
    note: 'Includes story detail title, subtitle, body, figure frame, and caption roles.',
  },
  'storyCard.discovery': {
    surface: 'Explore More section -> Compact story card',
    note: 'Small discovery cards are rendered inside the Explore More section.',
  },
  'galleryCard.closed': {
    surface: 'Gallery column -> Closed card',
  },
  'galleryCard.open': {
    surface: 'Gallery column -> Open card detail + inline gallery header',
    note: 'The lightbox control and overlay roles are previewed in the adjacent Gallery lightbox state sample.',
  },
  'galleryCard.discovery': {
    surface: 'Explore More section -> Compact gallery card',
    note: 'The discovery section also previews gallery discovery heading/meta roles.',
  },
  'discoverySupport.discovery': {
    surface: 'Explore More section sample',
    note: 'Exercises discovery section title plus group/meta text around compact rail cards.',
  },
  'discoverySupport.childRail': {
    surface: 'Quote column -> Child rail sample',
    note: 'Shows rail title, count/meta, and compact child-card title wiring.',
  },
  'qaCard.closed': {
    surface: 'Question column -> Closed card',
  },
  'qaCard.open': {
    surface: 'Question column -> Open card detail',
  },
  'qaCard.discovery': {
    surface: 'Explore More section -> Compact Q&A card',
  },
  'quoteCard.closed': {
    surface: 'Quote column -> Closed card',
  },
  'calloutCard.closed': {
    surface: 'Callout column -> Closed card',
  },
  'sidebar.chrome': {
    surface: 'Sidebar open sample',
    note: 'Includes sidebar surface, support typography, filter chips, active tabs, icon color, and neutral controls.',
  },
  'supportUi.tooling': {
    surface: 'Support UI state sample',
    note: 'Uses SearchBar, PhotoPicker, TagSelector, ImageToolbar, and explicit neutral/selected control buttons.',
  },
  'supportUi.states': {
    surface: 'Feed empty + Discovery loading/error state samples',
    note: 'Classifies the reader feedback states under the shared support family instead of leaving them as unowned preview-only surfaces.',
  },
};

const COMPONENT_OWNED_PREVIEW_BEHAVIORS = [
  'Feed/grid layout, card width, and responsive column count',
  'Breakpoint-triggered drawer behavior and sidebar placement',
  'Image aspect ratios, crop behavior, and media sizing math',
  'Hit-target sizing, pointer affordance, and disabled interaction behavior',
  'Animation timing, gesture behavior, and non-token layout offsets',
];

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

const previewDiscoveryRelated: Card[] = [storyPreviewCard, galleryPreviewCard, questionPreviewCard];
const previewDiscoveryRandom: Card[] = [quotePreviewCard, galleryPreviewCard];

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

const previewSupportStrongControlStyle = {
  backgroundColor: 'var(--reader-support-control-strong-background-color)',
  color: 'var(--reader-support-control-strong-text-color)',
  borderColor: 'var(--reader-support-control-strong-border-color)',
} as const;

const previewToolbarEditor = {
  getAttributes: () => ({
    'data-size': 'medium',
    'data-alignment': 'center',
    'data-wrap': 'off',
  }),
} as unknown as Editor;

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
              <div className={styles.readerPreviewRoleBadge}>Uses Title Small</div>
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
              <div className={styles.readerPreviewRoleBadge}>Uses Title Small</div>
              <V2ContentCard card={card} size="small" fullWidth />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewFeedEmptyState() {
  return (
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
  );
}

function PreviewDiscoveryLoadingState() {
  return (
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
  );
}

function PreviewDiscoveryErrorState() {
  return (
    <div className={styles.readerPreviewStateCard}>
      <div className={styles.previewKicker}>Discovery error</div>
      <section className={discoveryStyles.discoverySection}>
        <h2 className={discoveryStyles.discoveryTitle}>Explore More</h2>
        <div className={discoveryStyles.errorContainer} role="alert">
          <p>Unable to load suggestions. Try again in a moment.</p>
        </div>
      </section>
    </div>
  );
}

function PreviewGalleryLightboxState() {
  return (
    <div className={styles.readerPreviewStateCard}>
      <div className={styles.previewKicker}>Gallery media state</div>
      <div className={styles.readerPreviewRoleBadge}>Inline gallery header + lightbox controls</div>
      <div className={styles.readerPreviewColumnSurface}>
        <div className={galleryStyles.galleryHeader}>
          <h3 className={galleryStyles.galleryTitle}>Birthday gallery</h3>
          <span className={galleryStyles.imageCount}>8 images</span>
        </div>
      </div>
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
  );
}

function PreviewFocusState() {
  return (
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
  );
}

function PreviewSupportUiState() {
  return (
    <div className={styles.readerPreviewStateCard}>
      <div className={styles.previewKicker}>Support UI</div>
      <div className={styles.readerPreviewControlStack}>
        <div className={styles.readerPreviewRoleBadge}>Support title / label / hint</div>
        <div className={styles.readerPreviewColumnSurface}>
          <h3 className={styles.readerPreviewSupportHeading}>Utility surfaces</h3>
          <p className={styles.readerPreviewSupportHint}>
            These controls should preview the shared support family rather than borrowing from discovery or content roles.
          </p>
          <SearchBar />
        </div>

        <div className={styles.readerPreviewRoleBadge}>Support control / active control</div>
        <div className={styles.readerPreviewColumnSurface}>
          <PhotoPicker onSelect={() => {}} buttonText="Choose cover image" />
        </div>

        <div className={styles.readerPreviewRoleBadge}>Support meta / hint / control</div>
        <div className={styles.readerPreviewColumnSurface}>
          <TagSelector
            tree={previewTagTree as unknown as Array<{
              docId: string;
              name: string;
              description?: string;
              children: Array<unknown>;
            }>}
            selectedTags={['tag-family']}
            onTagsChange={() => {}}
          />
        </div>

        <div className={styles.readerPreviewRoleBadge}>Support label / meta / control states</div>
        <div className={styles.readerPreviewColumnSurface}>
          <ImageToolbar
            editor={previewToolbarEditor}
            onAction={() => {}}
            targetLabel="Lake preview"
            currentSize="medium"
            currentAlignment="center"
            currentWrap="off"
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
            <button
              type="button"
              className={styles.adminPreviewSecondaryBtn}
              style={{
                fontFamily: 'var(--reader-support-control-font-family)',
                fontSize: 'var(--reader-support-control-font-size)',
                fontWeight: 'var(--reader-support-control-font-weight)',
                lineHeight: 'var(--reader-support-control-line-height)',
                backgroundColor: 'var(--reader-support-control-background-color)',
                color: 'var(--reader-support-control-text-color)',
                borderColor: 'var(--reader-support-control-border-color)',
              }}
            >
              Neutral control
            </button>
            <button
              type="button"
              className={styles.adminPreviewSecondaryBtn}
              style={{
                ...previewSupportStrongControlStyle,
                fontFamily: 'var(--reader-support-control-font-family)',
                fontSize: 'var(--reader-support-control-font-size)',
                fontWeight: 'var(--reader-support-control-font-weight)',
                lineHeight: 'var(--reader-support-control-line-height)',
              }}
            >
              Selected control
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCoverageLedger() {
  return (
    <section className={styles.readerPreviewCoverage}>
      <div className={styles.previewKicker}>Preview coverage</div>
      <div className={styles.readerPreviewCoverageIntro}>
        Every reader-theme component variant below has a named preview surface. Anything not listed here should stay component-owned rather than silently borrowing the nearest role.
      </div>
      <div className={styles.readerPreviewCoverageGrid}>
        {CURRENT_READER_THEME_COMPONENTS.map((component) => (
          <article key={component.id} className={styles.readerPreviewCoverageCard}>
            <h3 className={styles.readerPreviewCoverageTitle}>{component.label}</h3>
            <p className={styles.readerPreviewCoverageText}>{component.description}</p>
            <div className={styles.readerPreviewCoverageVariants}>
              {component.variants.map((variant) => {
                const coverage = PREVIEW_COVERAGE_BY_VARIANT[`${component.id}.${variant.id}`];
                return (
                  <div key={variant.id} className={styles.readerPreviewCoverageVariant}>
                    <div className={styles.readerPreviewCoverageVariantHeader}>
                      <strong>{variant.label}</strong>
                      <span className={styles.readerPreviewCoverageStatus}>Previewed</span>
                    </div>
                    <p className={styles.readerPreviewCoverageSurface}>{coverage?.surface ?? 'Preview surface not mapped'}</p>
                    {coverage?.note ? (
                      <p className={styles.readerPreviewCoverageNote}>{coverage.note}</p>
                    ) : null}
                    <div className={styles.readerPreviewCoverageElements}>
                      {variant.elements.map((element) => (
                        <span key={element.id} className={styles.readerPreviewCoverageElement}>
                          {element.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <div className={styles.readerPreviewCoverageFooter}>
        <strong>Component-owned, not themed:</strong>
        <ul className={styles.readerPreviewCoverageList}>
          {COMPONENT_OWNED_PREVIEW_BEHAVIORS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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
  readerRecipes,
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
  readerRecipes?: ReaderThemeRecipes;
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
      const previewDocument: ScopedThemeDocumentData = {
        version: 2,
        reader: {
          data: themeData,
          darkModeShift,
          activePresetId,
          recipes: readerRecipes,
        },
        admin: {
          data: adminThemeData ?? themeData,
          darkModeShift: adminDarkModeShift,
          activePresetId: 'admin',
        },
      };
      return JSON.stringify(previewDocument);
    } catch {
      return '';
    }
  }, [themeData, darkModeShift, activePresetId, readerRecipes, adminThemeData, adminDarkModeShift]);

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
          const body = JSON.parse(previewBodyJson) as ScopedThemeDocumentData;
          const previewRes = await fetch('/api/theme/preview-css', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              ...body,
              readerScopeSelector: `.${readerScopeClass}`,
              adminScopeSelector: `.${adminScopeClass}`,
            }),
          });
          const previewData = await previewRes.json();
          if (
            !ctrl.signal.aborted &&
            previewRes.ok &&
            typeof previewData.css === 'string'
          ) {
            setScopedCss(previewData.css);
            setPreviewCssError(null);
          } else if (!ctrl.signal.aborted) {
            const err = previewData as ApiErrorResponse;
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
      <PreviewCoverageLedger />
      <div className={styles.previewSamples}>
        <div className={`${readerScopeClass} ${styles.readerPreviewCanvas}`} data-theme={previewMode}>
          <div className={styles.readerPreviewViewport}>
            <aside className={styles.readerPreviewSidebar}>
              <div className={styles.previewKicker}>Sidebar open</div>
              <PreviewSidebarChrome />
            </aside>
            <main className={styles.readerPreviewMain}>
              <section className={styles.readerPreviewBlock}>
                <div className={styles.previewKicker}>Reader cards</div>
                <div className={styles.readerPreviewCardColumns}>
                  {previewCards.map((card) => (
                    <div key={`${card.type}-${card.title}`} className={styles.readerPreviewCardColumn}>
                      <div className={styles.previewKicker}>{card.type === 'qa' ? 'Question' : card.type}</div>
                      <div className={styles.readerPreviewFeedCell}>
                        <div className={styles.readerPreviewRoleBadge}>Closed card</div>
                        <V2ContentCard card={card} fullWidth />
                      </div>

                      {card.docId === storyPreviewCard.docId ? (
                        <>
                          <div className={styles.readerPreviewDetailFrame}>
                            <div className={styles.readerPreviewRoleBadge}>Open card</div>
                            <div className={styles.readerPreviewDetailFill}>
                              <CardDetailPage
                                card={card}
                                childrenCards={[]}
                                suppressDiscovery
                                previewFullWidth
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      {card.docId === galleryPreviewCard.docId ? (
                        <>
                          <div className={styles.readerPreviewDetailFrame}>
                            <div className={styles.readerPreviewRoleBadge}>Open card</div>
                            <div className={styles.readerPreviewDetailFill}>
                              <CardDetailPage
                                card={card}
                                childrenCards={[]}
                                suppressDiscovery
                                previewFullWidth
                              />
                            </div>
                          </div>
                          <PreviewGalleryLightboxState />
                        </>
                      ) : null}

                      {card.docId === questionPreviewCard.docId ? (
                        <>
                          <div className={styles.readerPreviewDetailFrame}>
                            <div className={styles.readerPreviewRoleBadge}>Open card</div>
                            <div className={styles.readerPreviewDetailFill}>
                              <CardDetailPage
                                card={card}
                                childrenCards={[]}
                                suppressDiscovery
                                previewFullWidth
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      {card.docId === quotePreviewCard.docId ? (
                        <>
                          <div className={styles.readerPreviewColumnSurface}>
                            <div className={styles.readerPreviewRoleBadge}>Child rail</div>
                            <ChildCardsRail cards={previewChildCards} title="Child cards" />
                          </div>
                          <div className={styles.readerPreviewRoleBadge}>Support states</div>
                          <PreviewFeedEmptyState />
                          <PreviewDiscoveryLoadingState />
                          <PreviewDiscoveryErrorState />
                          <PreviewFocusState />
                          <PreviewSupportUiState />
                        </>
                      ) : null}

                      {card.docId === calloutPreviewCard.docId ? (
                        <div className={styles.readerPreviewColumnSurface}>
                          <div className={styles.readerPreviewRoleBadge}>Explore More</div>
                          <PreviewDiscoverySection />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
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
