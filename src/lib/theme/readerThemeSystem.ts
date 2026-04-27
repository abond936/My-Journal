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
        color: 'semantic/reader/tonal-text-primary',
      },
      storyTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      storyOverlayTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      storyExcerpt: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      galleryTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      galleryOverlayTitle: {
        family: 'font-family/sans',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      galleryHeaderTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      titleCompact: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      detailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      storyDetailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      galleryDetailTitle: {
        family: 'font-family/sans',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      discoveryTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      discoveryMeta: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      railSectionTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      railCardTitle: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      subtitle: {
        family: 'font-family/sans',
        size: 'font-size/xl',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
        fontStyle: 'italic',
      },
      body: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
      },
      excerpt: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-secondary',
      },
      meta: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      caption: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      chromeTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      chromeLabel: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      chromeMeta: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      chromeHint: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      fieldControl: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      feedbackTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      feedbackMeta: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      feedbackHint: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      quote: {
        family: 'font-family/serif',
        size: 'font-size/lg',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
        fontStyle: 'italic',
      },
      question: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      questionOverlay: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      calloutTitle: {
        family: 'font-family/sans',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      calloutBody: {
        family: 'font-family/sans',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
      },
      tagLabel: {
        family: 'font-family/sans',
        size: 'font-size/xs',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/contrast-on-fill-text',
      },
    },
    surfaces: {
      canvasPage: {
        background: 'semantic/reader/canvas-surface',
        border: 'semantic/reader/canvas-border',
      },
      canvasSection: {
        background: 'semantic/reader/canvas-surface',
        border: 'semantic/reader/canvas-border',
        radius: 'border/radius/md',
      },
      chromeSidebar: {
        background: 'semantic/reader/chrome-surface',
        border: 'semantic/reader/chrome-border',
        radius: 'border/radius/md',
      },
      chromeToolbar: {
        background: 'semantic/reader/chrome-surface',
        border: 'semantic/reader/chrome-border',
        radius: 'border/radius/md',
      },
      chromeRail: {
        background: 'semantic/reader/chrome-surface',
        border: 'semantic/reader/chrome-border',
        radius: 'border/radius/md',
      },
      feedbackPanel: {
        background: 'semantic/reader/feedback-surface',
        border: 'semantic/reader/feedback-border',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      feedbackSuccessPanel: {
        background: 'state/success/background',
        border: 'state/success/border',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      feedbackWarningPanel: {
        background: 'state/warning/background',
        border: 'state/warning/border',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      feedbackErrorPanel: {
        background: 'state/error/background',
        border: 'state/error/border',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      feedbackInfoPanel: {
        background: 'state/info/background',
        border: 'state/info/border',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      storyCardClosed: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'component/card/shadow',
        shadowHover: 'component/card/shadowHover',
        padding: 'spacing/md',
      },
      qaCardClosed: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'component/card/shadow',
        shadowHover: 'component/card/shadowHover',
        padding: 'component/card/padding',
      },
      galleryCardClosed: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'component/card/shadow',
        shadowHover: 'component/card/shadowHover',
        padding: 'component/card/padding',
      },
      card: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'component/card/shadow',
        shadowHover: 'component/card/shadowHover',
        padding: 'component/card/padding',
      },
      canvasDetail: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      cardDiscovery: {
        background: 'semantic/reader/discovery-surface',
        border: 'semantic/reader/discovery-border',
        radius: 'border/radius/md',
      },
      canvasMediaFrame: {
        background: 'semantic/reader/media-frame-surface',
        border: 'semantic/reader/media-frame-border',
        radius: 'border/radius/lg',
      },
    },
    controls: {
      chromeActiveTab: {
        background: 'component/button/solid/backgroundColor',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      fieldControl: {
        background: 'semantic/reader/field-surface',
        text: 'component/input/textColor',
        border: 'semantic/reader/field-border',
        hoverBackground: 'layout/background2Color',
      },
      fieldControlStrong: {
        background: 'component/button/solid/backgroundColor',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      chromeFilterChip: {
        background: 'component/button/solid/backgroundColor',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      feedbackAction: {
        background: 'semantic/reader/field-surface',
        text: 'component/input/textColor',
        border: 'semantic/reader/field-border',
        hoverBackground: 'layout/background2Color',
      },
      mediaControl: {
        background: 'semantic/reader/media-control-surface',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'semantic/reader/media-control-border',
        hoverBackground: 'semantic/reader/chrome-surface',
      },
      lightboxControl: {
        background: 'semantic/reader/lightbox-control-surface',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/lightbox-control-border',
      },
      inlineLink: {
        text: 'semantic/reader/accent',
        hoverBackground: 'literal/transparent',
        hoverText: 'component/link/textColorHover',
      },
      focusRing: {
        color: 'semantic/reader/focus-ring',
      },
    },
    tags: {
      who: {
        background: 'component/tag/backgrounds/who',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/tag/backgrounds/who',
      },
      what: {
        background: 'component/tag/backgrounds/what',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/tag/backgrounds/what',
      },
      when: {
        background: 'component/tag/backgrounds/when',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/tag/backgrounds/when',
      },
      where: {
        background: 'component/tag/backgrounds/where',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/tag/backgrounds/where',
      },
      muted: {
        background: 'literal/transparent',
        text: 'semantic/reader/tonal-text-secondary',
        border: 'layout/border1Color',
        hoverBackground: 'layout/background2Color',
      },
    },
    overlays: {
      card: {
        background: 'semantic/reader/overlay-scrim',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/overlay-border',
      },
      cardStrong: {
        background: 'semantic/reader/overlay-scrim-strong',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/overlay-border',
      },
      lightbox: {
        background: 'semantic/reader/overlay-scrim-strong',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/overlay-border',
      },
    },
    iconography: {
      chrome: 'semantic/reader/tonal-text-primary',
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
          { id: 'pageSurface', label: 'Page surface', binding: { kind: 'surface', key: 'canvasPage' } },
          { id: 'bodyText', label: 'Body text', binding: { kind: 'typography', key: 'body' } },
          { id: 'metaText', label: 'Meta text', binding: { kind: 'typography', key: 'meta' } },
          { id: 'inlineLink', label: 'Inline link', binding: { kind: 'control', key: 'inlineLink' } },
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
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'storyCardClosed' } },
          { id: 'contentPadding', label: 'Content padding', binding: { kind: 'token', key: 'storyClosedPadding' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'storyTitle' } },
          { id: 'overlayTitle', label: 'Overlay title', binding: { kind: 'typography', key: 'storyOverlayTitle' } },
          { id: 'excerpt', label: 'Excerpt', binding: { kind: 'typography', key: 'storyExcerpt' } },
          { id: 'excerptLineHeight', label: 'Excerpt line height', binding: { kind: 'token', key: 'storyClosedExcerptLineHeight' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'card' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'canvasDetail' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'storyDetailTitle' } },
          { id: 'subtitle', label: 'Subtitle', binding: { kind: 'typography', key: 'subtitle' } },
          { id: 'body', label: 'Body', binding: { kind: 'typography', key: 'body' } },
          { id: 'caption', label: 'Figure caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'mediaFrame', label: 'Media frame', binding: { kind: 'surface', key: 'canvasMediaFrame' } },
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
    description: 'Gallery cards, opened gallery detail, inline gallery header, and lightbox/media controls.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'galleryCardClosed' } },
          { id: 'contentPadding', label: 'Content padding', binding: { kind: 'token', key: 'galleryClosedPadding' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'galleryTitle' } },
          { id: 'overlayTitle', label: 'Overlay title', binding: { kind: 'typography', key: 'galleryOverlayTitle' } },
          { id: 'mediaFrame', label: 'Media frame', binding: { kind: 'surface', key: 'canvasMediaFrame' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'cardStrong' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'canvasDetail' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'galleryDetailTitle' } },
          { id: 'headerTitle', label: 'Inline gallery header', binding: { kind: 'typography', key: 'galleryHeaderTitle' } },
          { id: 'headerMeta', label: 'Inline gallery count', binding: { kind: 'typography', key: 'discoveryMeta' } },
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
          { id: 'sectionTitle', label: 'Section title', binding: { kind: 'typography', key: 'discoveryTitle' } },
          { id: 'title', label: 'Compact title', binding: { kind: 'typography', key: 'titleCompact' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'meta', label: 'Group/meta text', binding: { kind: 'typography', key: 'discoveryMeta' } },
        ],
      },
    ],
  },
  {
    id: 'discoverySupport',
    label: 'Discovery and rails',
    description: 'Discovery section headers, child-card rail headers, and compact rail card titles.',
    variants: [
      {
        id: 'discovery',
        label: 'Discovery section',
        elements: [
          { id: 'sectionTitle', label: 'Section title', binding: { kind: 'typography', key: 'discoveryTitle' } },
          { id: 'meta', label: 'Group/meta text', binding: { kind: 'typography', key: 'discoveryMeta' } },
        ],
      },
      {
        id: 'childRail',
        label: 'Child-card rail',
        elements: [
          { id: 'sectionTitle', label: 'Rail section title', binding: { kind: 'typography', key: 'railSectionTitle' } },
          { id: 'countMeta', label: 'Rail count/meta', binding: { kind: 'typography', key: 'discoveryMeta' } },
          { id: 'cardTitle', label: 'Rail card title', binding: { kind: 'typography', key: 'railCardTitle' } },
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
          { id: 'surface', label: 'Card surface', binding: { kind: 'surface', key: 'qaCardClosed' } },
          { id: 'contentPadding', label: 'Content padding', binding: { kind: 'token', key: 'questionClosedPadding' } },
          { id: 'question', label: 'Question', binding: { kind: 'typography', key: 'question' } },
          { id: 'overlayQuestion', label: 'Overlay question', binding: { kind: 'typography', key: 'questionOverlay' } },
          { id: 'excerpt', label: 'Answer preview', binding: { kind: 'typography', key: 'excerpt' } },
        ],
      },
      {
        id: 'open',
        label: 'Open card',
        elements: [
          { id: 'surface', label: 'Detail surface', binding: { kind: 'surface', key: 'canvasDetail' } },
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
          { id: 'contentLineHeight', label: 'Content line spacing', binding: { kind: 'token', key: 'calloutContentLineHeight' } },
          { id: 'watermark', label: 'Watermark opacity', binding: { kind: 'treatment', key: 'calloutWatermarkOpacity' } },
        ],
      },
    ],
  },
  {
    id: 'chrome',
    label: 'Chrome',
    description: 'Reader chrome around the content: sidebar framing, active tabs, chips, links, and icon color.',
    variants: [
      {
        id: 'sidebar',
        label: 'Sidebar and navigation',
        elements: [
          { id: 'surface', label: 'Sidebar surface', binding: { kind: 'surface', key: 'chromeSidebar' } },
          { id: 'title', label: 'Sidebar title', binding: { kind: 'typography', key: 'chromeTitle' } },
          { id: 'label', label: 'Chrome label', binding: { kind: 'typography', key: 'chromeLabel' } },
          { id: 'meta', label: 'Chrome meta', binding: { kind: 'typography', key: 'chromeMeta' } },
          { id: 'hint', label: 'Chrome hint', binding: { kind: 'typography', key: 'chromeHint' } },
          { id: 'activeTab', label: 'Active tab', binding: { kind: 'control', key: 'chromeActiveTab' } },
          { id: 'filterChip', label: 'Filter chip', binding: { kind: 'control', key: 'chromeFilterChip' } },
          { id: 'inlineLink', label: 'Inline link', binding: { kind: 'control', key: 'inlineLink' } },
          { id: 'icon', label: 'Chrome icon color', binding: { kind: 'iconography', key: 'chrome' } },
        ],
      },
    ],
  },
  {
    id: 'field',
    label: 'Fields',
    description: 'Neutral and selected reader controls, labels, hints, and control text.',
    variants: [
      {
        id: 'controls',
        label: 'Controls and selectors',
        elements: [
          { id: 'label', label: 'Field label', binding: { kind: 'typography', key: 'chromeLabel' } },
          { id: 'meta', label: 'Field meta', binding: { kind: 'typography', key: 'chromeMeta' } },
          { id: 'hint', label: 'Field hint', binding: { kind: 'typography', key: 'chromeHint' } },
          { id: 'control', label: 'Neutral control', binding: { kind: 'control', key: 'fieldControl' } },
          { id: 'controlText', label: 'Control text', binding: { kind: 'typography', key: 'fieldControl' } },
          { id: 'controlStrong', label: 'Selected control', binding: { kind: 'control', key: 'fieldControlStrong' } },
        ],
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    description: 'Reader empty, loading, and error messaging plus action surfaces.',
    variants: [
      {
        id: 'states',
        label: 'States and notices',
        elements: [
          { id: 'surface', label: 'Feedback panel', binding: { kind: 'surface', key: 'feedbackPanel' } },
          { id: 'title', label: 'State title', binding: { kind: 'typography', key: 'feedbackTitle' } },
          { id: 'meta', label: 'State meta', binding: { kind: 'typography', key: 'feedbackMeta' } },
          { id: 'hint', label: 'State hint', binding: { kind: 'typography', key: 'feedbackHint' } },
          { id: 'action', label: 'State action', binding: { kind: 'control', key: 'feedbackAction' } },
        ],
      },
      {
        id: 'success',
        label: 'Success state',
        elements: [
          { id: 'surface', label: 'Success panel', binding: { kind: 'surface', key: 'feedbackSuccessPanel' } },
          { id: 'title', label: 'Success title', binding: { kind: 'typography', key: 'feedbackTitle' } },
          { id: 'meta', label: 'Success meta', binding: { kind: 'typography', key: 'feedbackMeta' } },
          { id: 'action', label: 'Success action', binding: { kind: 'control', key: 'feedbackAction' } },
        ],
      },
      {
        id: 'warning',
        label: 'Warning state',
        elements: [
          { id: 'surface', label: 'Warning panel', binding: { kind: 'surface', key: 'feedbackWarningPanel' } },
          { id: 'title', label: 'Warning title', binding: { kind: 'typography', key: 'feedbackTitle' } },
          { id: 'meta', label: 'Warning meta', binding: { kind: 'typography', key: 'feedbackMeta' } },
          { id: 'action', label: 'Warning action', binding: { kind: 'control', key: 'feedbackAction' } },
        ],
      },
      {
        id: 'error',
        label: 'Error state',
        elements: [
          { id: 'surface', label: 'Error panel', binding: { kind: 'surface', key: 'feedbackErrorPanel' } },
          { id: 'title', label: 'Error title', binding: { kind: 'typography', key: 'feedbackTitle' } },
          { id: 'meta', label: 'Error meta', binding: { kind: 'typography', key: 'feedbackMeta' } },
          { id: 'action', label: 'Error action', binding: { kind: 'control', key: 'feedbackAction' } },
        ],
      },
      {
        id: 'info',
        label: 'Info state',
        elements: [
          { id: 'surface', label: 'Info panel', binding: { kind: 'surface', key: 'feedbackInfoPanel' } },
          { id: 'title', label: 'Info title', binding: { kind: 'typography', key: 'feedbackTitle' } },
          { id: 'meta', label: 'Info meta', binding: { kind: 'typography', key: 'feedbackMeta' } },
          { id: 'action', label: 'Info action', binding: { kind: 'control', key: 'feedbackAction' } },
        ],
      },
    ],
  },
];

export const DEFAULT_READER_THEME_RECIPES: ReaderThemeRecipes = JSON.parse(
  JSON.stringify(CURRENT_READER_THEME_SYSTEM.recipes)
) as ReaderThemeRecipes;

const cloneReaderThemeRecipes = (recipes: ReaderThemeRecipes): ReaderThemeRecipes => (
  JSON.parse(JSON.stringify(recipes)) as ReaderThemeRecipes
);

type LegacyReaderThemeRecipes = Partial<{
  typography: Partial<Record<'supportTitle' | 'supportLabel' | 'supportMeta' | 'supportHint' | 'supportControl', ReaderThemeRecipes['typography'][keyof ReaderThemeRecipes['typography']]>>;
  surfaces: Partial<Record<'page' | 'chrome' | 'detail' | 'discovery' | 'mediaFrame', ReaderThemeRecipes['surfaces'][keyof ReaderThemeRecipes['surfaces']]>>;
  controls: Partial<Record<'solid' | 'supportControl' | 'supportControlStrong' | 'filterChip' | 'link', ReaderThemeRecipes['controls'][keyof ReaderThemeRecipes['controls']]>>;
}>;

export function normalizeReaderThemeRecipes(
  recipes?: Partial<ReaderThemeRecipes> | LegacyReaderThemeRecipes | null
): Partial<ReaderThemeRecipes> | undefined {
  if (!recipes) {
    return undefined;
  }

  const normalized = cloneReaderThemeRecipes(DEFAULT_READER_THEME_RECIPES);

  Object.assign(normalized.typography, recipes.typography);
  Object.assign(normalized.surfaces, recipes.surfaces);
  Object.assign(normalized.controls, recipes.controls);
  Object.assign(normalized.tags, recipes.tags);
  Object.assign(normalized.overlays, recipes.overlays);
  Object.assign(normalized.iconography, recipes.iconography);
  Object.assign(normalized.treatments, recipes.treatments);

  const legacyTypography = recipes.typography as LegacyReaderThemeRecipes['typography'] | undefined;
  if (legacyTypography?.supportTitle) {
    normalized.typography.chromeTitle = legacyTypography.supportTitle;
    normalized.typography.feedbackTitle = legacyTypography.supportTitle;
  }
  if (legacyTypography?.supportLabel) {
    normalized.typography.chromeLabel = legacyTypography.supportLabel;
  }
  if (legacyTypography?.supportMeta) {
    normalized.typography.chromeMeta = legacyTypography.supportMeta;
    normalized.typography.feedbackMeta = legacyTypography.supportMeta;
  }
  if (legacyTypography?.supportHint) {
    normalized.typography.chromeHint = legacyTypography.supportHint;
    normalized.typography.feedbackHint = legacyTypography.supportHint;
  }
  if (legacyTypography?.supportControl) {
    normalized.typography.fieldControl = legacyTypography.supportControl;
  }

  const legacySurfaces = recipes.surfaces as LegacyReaderThemeRecipes['surfaces'] | undefined;
  if (legacySurfaces?.page) {
    normalized.surfaces.canvasPage = legacySurfaces.page;
    normalized.surfaces.canvasSection = legacySurfaces.page;
  }
  if (legacySurfaces?.chrome) {
    normalized.surfaces.chromeSidebar = legacySurfaces.chrome;
    normalized.surfaces.chromeToolbar = legacySurfaces.chrome;
    normalized.surfaces.chromeRail = legacySurfaces.chrome;
  }
  if (legacySurfaces?.detail) {
    normalized.surfaces.canvasDetail = legacySurfaces.detail;
    normalized.surfaces.feedbackPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackSuccessPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackWarningPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackErrorPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackInfoPanel = legacySurfaces.detail;
  }
  if (legacySurfaces?.discovery) {
    normalized.surfaces.cardDiscovery = legacySurfaces.discovery;
  }
  if (legacySurfaces?.mediaFrame) {
    normalized.surfaces.canvasMediaFrame = legacySurfaces.mediaFrame;
  }

  const legacyControls = recipes.controls as LegacyReaderThemeRecipes['controls'] | undefined;
  if (legacyControls?.solid) {
    normalized.controls.chromeActiveTab = legacyControls.solid;
  }
  if (legacyControls?.supportControl) {
    normalized.controls.fieldControl = legacyControls.supportControl;
    normalized.controls.feedbackAction = legacyControls.supportControl;
  }
  if (legacyControls?.supportControlStrong) {
    normalized.controls.fieldControlStrong = legacyControls.supportControlStrong;
  }
  if (legacyControls?.filterChip) {
    normalized.controls.chromeFilterChip = legacyControls.filterChip;
  }
  if (legacyControls?.link) {
    normalized.controls.inlineLink = legacyControls.link;
  }

  return normalized;
}
