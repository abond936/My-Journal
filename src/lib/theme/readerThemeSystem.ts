import type {
  ReaderThemePresetId,
  ReaderThemeRecipes,
} from '@/lib/types/theme';

export interface ReaderThemeSummarySystem {
  presetId: ReaderThemePresetId | 'custom';
  notes: {
    intent: string;
    sourceOfTruth: string;
    componentLogicBoundary: string;
  };
  recipes: ReaderThemeRecipes;
}

export type ReaderThemeBindingKind =
  | 'typography'
  | 'surface'
  | 'control'
  | 'tag'
  | 'overlay'
  | 'iconography'
  | 'treatment';

export interface ReaderThemeComponentBinding {
  kind: ReaderThemeBindingKind;
  key: string;
}

export interface ReaderThemeComponentElement {
  id: string;
  label: string;
  description?: string;
  binding: ReaderThemeComponentBinding;
}

export interface ReaderThemeComponentVariant {
  id: string;
  label: string;
  description?: string;
  elements: ReaderThemeComponentElement[];
}

export interface ReaderThemeComponentSpec {
  id: string;
  label: string;
  description: string;
  variants: ReaderThemeComponentVariant[];
}

/**
 * Two-tier reader theme authoring model:
 * 1. Base tokens: the exact values already stored in Firestore/theme-data.
 * 2. Component recipes: how real app surfaces consume those values.
 */
export const CURRENT_READER_THEME_SYSTEM: ReaderThemeSummarySystem = {
  presetId: 'editorial',
  notes: {
    intent:
      'Use existing Firestore/theme-data primitives as the exact value layer, then map real reader components onto named recipes that can vary by component, element, and state.',
    sourceOfTruth:
      'Atomic values remain the existing theme document and Advanced-tab tokens. Component recipes decide which tokens a story card title, discovery rail title, lightbox caption, or active sidebar control should use.',
    componentLogicBoundary:
      'Components still decide when a variant applies, such as closed versus open, or full feed card versus discovery rail. Theme data defines the recipe for each named variant; component logic chooses when to render it.',
  },
  recipes: {
    typography: {
      title: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      storyTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      galleryTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      titleCompact: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      detailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      storyDetailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      galleryDetailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      subtitle: {
        family: 'font-family/sans',
        size: 'font-size/xl',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'literal/typography.textColors.text2',
        fontStyle: 'italic',
      },
      body: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'literal/typography.textColors.text1',
      },
      excerpt: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'literal/typography.textColors.text2',
      },
      meta: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'literal/typography.textColors.text2',
      },
      caption: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'literal/typography.textColors.text2',
      },
      quote: {
        family: 'font-family/serif',
        size: 'font-size/lg',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'literal/typography.textColors.text1',
        fontStyle: 'italic',
      },
      question: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      calloutTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'literal/typography.textColors.text1',
      },
      calloutBody: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'literal/typography.textColors.text1',
      },
      tagLabel: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/base',
        color: 'component/tag/textColor',
      },
    },
    surfaces: {
      page: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
      },
      chrome: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/md',
      },
      card: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'component/card/shadow',
        shadowHover: 'component/card/shadowHover',
        padding: 'component/card/padding',
      },
      detail: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      discovery: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/md',
      },
      mediaFrame: {
        background: 'layout/background2Color',
        border: 'layout/border1Color',
        radius: 'border/radius/lg',
      },
    },
    controls: {
      solid: {
        background: 'component/button/solid/backgroundColor',
        text: 'component/button/solid/textColor',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      filterChip: {
        background: 'component/button/solid/backgroundColor',
        text: 'component/button/solid/textColor',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      mediaControl: {
        background: 'layout/background2Color',
        text: 'component/button/solid/textColor',
        border: 'layout/border1Color',
        hoverBackground: 'layout/background1Color',
      },
      lightboxControl: {
        background: 'gradient/bottomOverlayStrong',
        text: 'component/button/solid/textColor',
        border: 'layout/border1Color',
      },
      link: {
        text: 'component/link/textColor',
        hoverBackground: 'literal/transparent',
        hoverText: 'component/link/textColorHover',
      },
      focusRing: {
        color: 'palette/3',
      },
    },
    tags: {
      who: {
        background: 'component/tag/backgrounds/who',
        text: 'component/tag/textColor',
        border: 'component/tag/backgrounds/who',
      },
      what: {
        background: 'component/tag/backgrounds/what',
        text: 'component/tag/textColor',
        border: 'component/tag/backgrounds/what',
      },
      when: {
        background: 'component/tag/backgrounds/when',
        text: 'component/tag/textColor',
        border: 'component/tag/backgrounds/when',
      },
      where: {
        background: 'component/tag/backgrounds/where',
        text: 'component/tag/textColor',
        border: 'component/tag/backgrounds/where',
      },
      muted: {
        background: 'literal/transparent',
        text: 'literal/typography.textColors.text2',
        border: 'layout/border1Color',
        hoverBackground: 'layout/background2Color',
      },
    },
    overlays: {
      card: {
        background: 'gradient/bottomOverlay',
        text: 'component/button/solid/textColor',
        border: 'layout/border1Color',
      },
      cardStrong: {
        background: 'gradient/bottomOverlayStrong',
        text: 'component/button/solid/textColor',
        border: 'layout/border1Color',
      },
      lightbox: {
        background: 'gradient/bottomOverlayStrong',
        text: 'component/button/solid/textColor',
        border: 'layout/border1Color',
      },
    },
    iconography: {
      chrome: 'literal/typography.textColors.text1',
      solid: 'component/button/solid/textColor',
      overlay: 'component/button/solid/textColor',
      accent: 'palette/3',
    },
    treatments: {
      quoteWatermarkOpacity: '0.16',
      questionWatermarkOpacity: '0.22',
      calloutWatermarkOpacity: '0.22',
    },
  },
};

export const CURRENT_READER_THEME_COMPONENTS: ReaderThemeComponentSpec[] = [
  {
    id: 'canvas',
    label: 'Canvas',
    description: 'The reader shell around the cards: page background, text, inline links, and focus treatment.',
    variants: [
      {
        id: 'reader',
        label: 'Reader shell',
        elements: [
          { id: 'pageSurface', label: 'Page surface', binding: { kind: 'surface', key: 'page' } },
          { id: 'bodyText', label: 'Body text', binding: { kind: 'typography', key: 'body' } },
          { id: 'metaText', label: 'Meta text', binding: { kind: 'typography', key: 'meta' } },
          { id: 'inlineLink', label: 'Inline link', binding: { kind: 'control', key: 'link' } },
          { id: 'focusRing', label: 'Focus ring', binding: { kind: 'control', key: 'focusRing' } },
        ],
      },
    ],
  },
  {
    id: 'storyCard',
    label: 'Story card',
    description: 'Story feed cards and the opened story surface.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'storyTitle' } },
          { id: 'excerpt', label: 'Excerpt', binding: { kind: 'typography', key: 'excerpt' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'card' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'detail' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'storyDetailTitle' } },
          { id: 'subtitle', label: 'Subtitle', binding: { kind: 'typography', key: 'subtitle' } },
          { id: 'body', label: 'Body', binding: { kind: 'typography', key: 'body' } },
          { id: 'caption', label: 'Figure caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'mediaFrame', label: 'Media frame', binding: { kind: 'surface', key: 'mediaFrame' } },
        ],
      },
      {
        id: 'discovery',
        label: 'Explore More',
        elements: [
          { id: 'surface', label: 'Rail card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'title', label: 'Compact title', binding: { kind: 'typography', key: 'titleCompact' } },
          { id: 'excerpt', label: 'Excerpt', binding: { kind: 'typography', key: 'excerpt' } },
          { id: 'meta', label: 'Meta', binding: { kind: 'typography', key: 'meta' } },
        ],
      },
    ],
  },
  {
    id: 'galleryCard',
    label: 'Gallery card',
    description: 'Gallery cards, opened gallery detail, and media controls.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'galleryTitle' } },
          { id: 'mediaFrame', label: 'Media frame', binding: { kind: 'surface', key: 'mediaFrame' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'cardStrong' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'detail' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'galleryDetailTitle' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'body', label: 'Body text', binding: { kind: 'typography', key: 'body' } },
          { id: 'lightboxControl', label: 'Lightbox control', binding: { kind: 'control', key: 'lightboxControl' } },
          { id: 'lightboxOverlay', label: 'Lightbox overlay', binding: { kind: 'overlay', key: 'lightbox' } },
        ],
      },
      {
        id: 'discovery',
        label: 'Explore More',
        elements: [
          { id: 'surface', label: 'Rail card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'title', label: 'Compact title', binding: { kind: 'typography', key: 'titleCompact' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
        ],
      },
    ],
  },
  {
    id: 'qaCard',
    label: 'Question card',
    description: 'Q&A cards where the question and answer can differ between closed and open views.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'question', label: 'Question', binding: { kind: 'typography', key: 'question' } },
          { id: 'excerpt', label: 'Answer preview', binding: { kind: 'typography', key: 'excerpt' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'detail' } },
          { id: 'question', label: 'Question', binding: { kind: 'typography', key: 'question' } },
          { id: 'answer', label: 'Answer body', binding: { kind: 'typography', key: 'body' } },
          { id: 'caption', label: 'Supporting caption', binding: { kind: 'typography', key: 'caption' } },
        ],
      },
      {
        id: 'discovery',
        label: 'Explore More',
        elements: [
          { id: 'surface', label: 'Rail card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'question', label: 'Compact question', binding: { kind: 'typography', key: 'titleCompact' } },
          { id: 'excerpt', label: 'Answer preview', binding: { kind: 'typography', key: 'excerpt' } },
        ],
      },
    ],
  },
  {
    id: 'quoteCard',
    label: 'Quote card',
    description: 'Quotes are currently closed-card only in the preview, but still need distinct text treatment.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'quote', label: 'Quote text', binding: { kind: 'typography', key: 'quote' } },
          { id: 'attribution', label: 'Attribution', binding: { kind: 'typography', key: 'caption' } },
          { id: 'watermark', label: 'Watermark opacity', binding: { kind: 'treatment', key: 'quoteWatermarkOpacity' } },
        ],
      },
    ],
  },
  {
    id: 'calloutCard',
    label: 'Callout card',
    description: 'Callouts have their own emphasis and watermark treatment in the feed.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'card' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'calloutTitle' } },
          { id: 'subtitle', label: 'Subtitle', binding: { kind: 'typography', key: 'subtitle' } },
          { id: 'excerpt', label: 'Excerpt', binding: { kind: 'typography', key: 'excerpt' } },
          { id: 'body', label: 'Body', binding: { kind: 'typography', key: 'calloutBody' } },
          { id: 'watermark', label: 'Watermark opacity', binding: { kind: 'treatment', key: 'calloutWatermarkOpacity' } },
        ],
      },
    ],
  },
  {
    id: 'sidebar',
    label: 'Sidebar and controls',
    description: 'Reader chrome, active controls, chips, and icon color.',
    variants: [
      {
        id: 'chrome',
        label: 'Reader chrome',
        elements: [
          { id: 'surface', label: 'Sidebar surface', binding: { kind: 'surface', key: 'chrome' } },
          { id: 'solidControl', label: 'Active tab / solid control', binding: { kind: 'control', key: 'solid' } },
          { id: 'filterChip', label: 'Filter chip', binding: { kind: 'control', key: 'filterChip' } },
          { id: 'icon', label: 'Chrome icon color', binding: { kind: 'iconography', key: 'chrome' } },
        ],
      },
    ],
  },
  {
    id: 'lightbox',
    label: 'Lightbox',
    description: 'Overlay scrim, caption text, and lightbox buttons.',
    variants: [
      {
        id: 'default',
        label: 'Default',
        elements: [
          { id: 'overlay', label: 'Overlay', binding: { kind: 'overlay', key: 'lightbox' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'control', label: 'Control', binding: { kind: 'control', key: 'lightboxControl' } },
          { id: 'icon', label: 'Overlay icon color', binding: { kind: 'iconography', key: 'overlay' } },
        ],
      },
    ],
  },
];

export const DEFAULT_READER_THEME_RECIPES: ReaderThemeRecipes = JSON.parse(
  JSON.stringify(CURRENT_READER_THEME_SYSTEM.recipes)
) as ReaderThemeRecipes;
