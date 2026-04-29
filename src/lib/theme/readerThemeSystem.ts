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
  | 'treatment'
  | 'token'
  | 'sharedSurface'
  | 'feedbackStates';

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
        family: 'font-family/sans1',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      storyTitle: {
        family: 'font-family/sans1',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      storyOverlayTitle: {
        family: 'font-family/sans1',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      storyExcerpt: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      galleryTitle: {
        family: 'font-family/sans1',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      galleryOverlayTitle: {
        family: 'font-family/sans1',
        size: 'font-size/base',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      galleryHeaderTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      titleCompact: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      detailTitle: {
        family: 'font-family/sans1',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      storyDetailTitle: {
        family: 'font-family/sans1',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      galleryDetailTitle: {
        family: 'font-family/sans1',
        size: 'font-size/3xl',
        weight: 'font-weight/bold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      discoveryTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      discoveryMeta: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      railSectionTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      railCardTitle: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      subtitle: {
        family: 'font-family/sans1',
        size: 'font-size/xl',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
        fontStyle: 'italic',
      },
      body: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
      },
      excerpt: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-secondary',
      },
      meta: {
        family: 'font-family/sans1',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      caption: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      chromeText: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      chromeMeta: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      supportTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      supportLabel: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      supportMeta: {
        family: 'font-family/sans1',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      supportHint: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      supportControlText: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-primary',
      },
      feedbackTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      feedbackMeta: {
        family: 'font-family/sans1',
        size: 'font-size/xs',
        weight: 'font-weight/medium',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      feedbackHint: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/base',
        color: 'semantic/reader/tonal-text-secondary',
      },
      quote: {
        family: 'font-family/serif1',
        size: 'font-size/lg',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
        fontStyle: 'italic',
      },
      question: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      questionOverlay: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/overlay-contrast-text',
      },
      calloutTitle: {
        family: 'font-family/sans1',
        size: 'font-size/lg',
        weight: 'font-weight/semibold',
        lineHeight: 'line-height/tight',
        color: 'semantic/reader/tonal-text-primary',
      },
      calloutBody: {
        family: 'font-family/sans1',
        size: 'font-size/sm',
        weight: 'font-weight/normal',
        lineHeight: 'line-height/relaxed',
        color: 'semantic/reader/tonal-text-primary',
      },
      tagLabel: {
        family: 'font-family/sans1',
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
        background: 'shared/card/background',
        border: 'shared/card/border',
        radius: 'shared/card/radius',
        shadow: 'shared/card/shadow',
        shadowHover: 'shared/card/shadowHover',
        padding: 'spacing/md',
      },
      qaCardClosed: {
        background: 'shared/card/background',
        border: 'shared/card/border',
        radius: 'shared/card/radius',
        shadow: 'shared/card/shadow',
        shadowHover: 'shared/card/shadowHover',
        padding: 'component/card/padding',
      },
      galleryCardClosed: {
        background: 'shared/card/background',
        border: 'shared/card/border',
        radius: 'shared/card/radius',
        shadow: 'shared/card/shadow',
        shadowHover: 'shared/card/shadowHover',
        padding: 'component/card/padding',
      },
      quoteCardClosed: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/lg',
        shadow: 'shadow/sm',
        padding: 'spacing/xl',
      },
      calloutCardClosed: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/lg',
        shadow: 'shadow/md',
        padding: 'spacing/xl',
      },
      card: {
        background: 'component/card/backgroundColor',
        border: 'component/card/borderColor',
        radius: 'component/card/borderRadius',
        shadow: 'shadow/sm',
        shadowHover: 'shadow/md',
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
      windowSurface: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/md',
      },
      windowFrame: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/md',
      },
      windowElevation: {
        background: 'layout/background1Color',
        border: 'layout/border1Color',
        radius: 'border/radius/md',
        shadow: 'shadow/lg',
      },
    },
    controls: {
      chromeActiveTab: {
        background: 'component/button/solid/backgroundColor',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      supportControl: {
        background: 'semantic/reader/field-surface',
        text: 'component/input/textColor',
        border: 'semantic/reader/field-border',
        hoverBackground: 'layout/background2Color',
      },
      supportControlStrong: {
        background: 'component/button/solid/backgroundColor',
        text: 'semantic/reader/contrast-on-fill-text',
        border: 'component/button/solid/borderColor',
        hoverBackground: 'component/button/solid/backgroundColorHover',
      },
      supportChip: {
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
      coveredFade: {
        background: 'semantic/reader/covered-fade',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/overlay-border',
      },
      galleryOverlay: {
        background: 'semantic/reader/overlay-scrim-strong',
        text: 'semantic/reader/overlay-contrast-text',
        border: 'semantic/reader/overlay-border',
      },
      lightboxBackdrop: {
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
      calloutBodyListLineHeight: 'line-height/relaxed',
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
          { id: 'surface', label: 'Background', binding: { kind: 'surface', key: 'storyCardClosed' } },
          { id: 'contentPadding', label: 'Card padding', binding: { kind: 'token', key: 'storyClosedPadding' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'storyTitle' } },
          { id: 'overlayTitle', label: 'Overlay title', binding: { kind: 'typography', key: 'storyOverlayTitle' } },
          { id: 'excerpt', label: 'Excerpt', binding: { kind: 'typography', key: 'storyExcerpt' } },
          { id: 'excerptLineHeight', label: 'Excerpt line spacing', binding: { kind: 'token', key: 'storyClosedExcerptLineHeight' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'coveredFade' } },
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
        label: 'Discovery content',
        elements: [
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
    description: 'Gallery cards, opened gallery detail, and inline gallery header content.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Background', binding: { kind: 'surface', key: 'galleryCardClosed' } },
          { id: 'contentPadding', label: 'Card padding', binding: { kind: 'token', key: 'galleryClosedPadding' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'galleryTitle' } },
          { id: 'overlayTitle', label: 'Overlay title', binding: { kind: 'typography', key: 'galleryOverlayTitle' } },
          { id: 'mediaFrame', label: 'Media frame', binding: { kind: 'surface', key: 'canvasMediaFrame' } },
          { id: 'imageOverlay', label: 'Image overlay', binding: { kind: 'overlay', key: 'galleryOverlay' } },
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
        ],
      },
      {
        id: 'discovery',
        label: 'Discovery content',
        elements: [
          { id: 'sectionTitle', label: 'Section title', binding: { kind: 'typography', key: 'discoveryTitle' } },
          { id: 'title', label: 'Compact title', binding: { kind: 'typography', key: 'titleCompact' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
          { id: 'meta', label: 'Group/meta text', binding: { kind: 'typography', key: 'discoveryMeta' } },
        ],
      },
    ],
  },
  {
    id: 'lightbox',
    label: 'Lightbox',
    description: 'Fullscreen gallery media backdrop and controls that must remain visually distinct from card overlays.',
    variants: [
      {
        id: 'fullscreen',
        label: 'Fullscreen media',
        elements: [
          { id: 'control', label: 'Lightbox control', binding: { kind: 'control', key: 'lightboxControl' } },
          { id: 'backdrop', label: 'Lightbox backdrop', binding: { kind: 'overlay', key: 'lightboxBackdrop' } },
          { id: 'caption', label: 'Caption', binding: { kind: 'typography', key: 'caption' } },
        ],
      },
    ],
  },
  {
    id: 'discoverySupport',
    label: 'Discovery',
    description: 'Shared discovery surface, section headers, and supporting rail context for supported discovery types.',
    variants: [
      {
        id: 'discovery',
        label: 'Shared surface',
        elements: [
          { id: 'surface', label: 'Discovery surface', binding: { kind: 'surface', key: 'cardDiscovery' } },
          { id: 'sectionTitle', label: 'Section title', binding: { kind: 'typography', key: 'discoveryTitle' } },
          { id: 'meta', label: 'Group/meta text', binding: { kind: 'typography', key: 'discoveryMeta' } },
        ],
      },
      {
        id: 'childRail',
        label: 'Supporting rail',
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
    description: 'Question cards where the question and answer can differ between closed and open views.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Background', binding: { kind: 'surface', key: 'qaCardClosed' } },
          { id: 'contentPadding', label: 'Card padding', binding: { kind: 'token', key: 'questionClosedPadding' } },
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
        label: 'Discovery content',
        elements: [
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
          { id: 'surface', label: 'Background', binding: { kind: 'surface', key: 'quoteCardClosed' } },
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
    description: 'Callouts are closed feed tiles that use title plus body only, with their own emphasis and watermark treatment.',
    variants: [
      {
        id: 'closed',
        label: 'Closed card',
        elements: [
          { id: 'surface', label: 'Background', binding: { kind: 'surface', key: 'calloutCardClosed' } },
          { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'calloutTitle' } },
          { id: 'body', label: 'Body', binding: { kind: 'typography', key: 'calloutBody' } },
          { id: 'bulletLineHeight', label: 'Bullet line height', binding: { kind: 'token', key: 'calloutBulletLineHeight' } },
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
          { id: 'text', label: 'Sidebar text', binding: { kind: 'typography', key: 'chromeText' } },
          { id: 'meta', label: 'Sidebar meta', binding: { kind: 'typography', key: 'chromeMeta' } },
          { id: 'activeTab', label: 'Active tab', binding: { kind: 'control', key: 'chromeActiveTab' } },
          { id: 'inlineLink', label: 'Inline link', binding: { kind: 'control', key: 'inlineLink' } },
          { id: 'icon', label: 'Chrome icon color', binding: { kind: 'iconography', key: 'chrome' } },
        ],
      },
    ],
  },
  {
    id: 'field',
    label: 'Fields',
    description: 'Neutral and selected reader controls, plus the shared label, meta, hint, and control-text roles they use.',
    variants: [
      {
        id: 'controls',
        label: 'Controls and selectors',
        elements: [
          { id: 'title', label: 'Support title', description: 'Shared support title role reused by empty states, helper panels, and nearby chrome.', binding: { kind: 'typography', key: 'supportTitle' } },
          { id: 'label', label: 'Support label', description: 'Shared label role reused by reader fields and support chrome.', binding: { kind: 'typography', key: 'supportLabel' } },
          { id: 'meta', label: 'Support meta', description: 'Shared meta role reused by reader fields and support chrome.', binding: { kind: 'typography', key: 'supportMeta' } },
          { id: 'hint', label: 'Support hint', description: 'Shared hint role reused by reader fields and support chrome.', binding: { kind: 'typography', key: 'supportHint' } },
          { id: 'control', label: 'Neutral control surface', description: 'Shared background and border for neutral field-style controls.', binding: { kind: 'control', key: 'supportControl' } },
          { id: 'controlText', label: 'Shared control text', description: 'Shared text role used across neutral field-style controls.', binding: { kind: 'typography', key: 'supportControlText' } },
          { id: 'controlStrong', label: 'Selected control surface', description: 'Shared background and border for selected field-style controls.', binding: { kind: 'control', key: 'supportControlStrong' } },
          { id: 'chip', label: 'Support chip', description: 'Shared chip treatment used for filter chips and similar support controls.', binding: { kind: 'control', key: 'supportChip' } },
        ],
      },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    description: 'Floating reader windows and dialog shells that should read clearly above the page.',
    variants: [
      {
        id: 'floating',
        label: 'Floating',
        elements: [
          { id: 'surface', label: 'Window surface', binding: { kind: 'surface', key: 'windowSurface' } },
          { id: 'frame', label: 'Window frame', binding: { kind: 'surface', key: 'windowFrame' } },
          { id: 'elevation', label: 'Window elevation', binding: { kind: 'surface', key: 'windowElevation' } },
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
  typography: Partial<Record<'supportTitle' | 'supportLabel' | 'supportMeta' | 'supportHint' | 'supportControl' | 'chromeTitle' | 'chromeLabel' | 'chromeMeta' | 'chromeHint' | 'fieldControl', ReaderThemeRecipes['typography'][keyof ReaderThemeRecipes['typography']]>>;
  surfaces: Partial<Record<'page' | 'chrome' | 'detail' | 'discovery' | 'mediaFrame' | 'windowPanel', ReaderThemeRecipes['surfaces'][keyof ReaderThemeRecipes['surfaces']]>>;
  controls: Partial<Record<'solid' | 'supportControl' | 'supportControlStrong' | 'filterChip' | 'link' | 'fieldControl' | 'fieldControlStrong' | 'chromeFilterChip', ReaderThemeRecipes['controls'][keyof ReaderThemeRecipes['controls']]>>;
  overlays: Partial<Record<'card' | 'cardStrong' | 'lightbox', ReaderThemeRecipes['overlays'][keyof ReaderThemeRecipes['overlays']]>>;
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

  const incomingTypography = recipes.typography as Record<string, unknown> | undefined;
  const incomingSurfaces = recipes.surfaces as Record<string, unknown> | undefined;
  const incomingControls = recipes.controls as Record<string, unknown> | undefined;
  const incomingOverlays = recipes.overlays as Record<string, unknown> | undefined;

  const legacyTypography = recipes.typography as LegacyReaderThemeRecipes['typography'] | undefined;
  if (legacyTypography?.supportTitle && !incomingTypography?.supportTitle) {
    normalized.typography.supportTitle = legacyTypography.supportTitle;
    normalized.typography.feedbackTitle = legacyTypography.supportTitle;
  }
  if (legacyTypography?.chromeTitle && !incomingTypography?.supportTitle) {
    normalized.typography.supportTitle = legacyTypography.chromeTitle;
  }
  if (legacyTypography?.supportLabel && !incomingTypography?.supportLabel) {
    normalized.typography.supportLabel = legacyTypography.supportLabel;
  }
  if (legacyTypography?.chromeLabel && !incomingTypography?.chromeText) {
    normalized.typography.chromeText = legacyTypography.chromeLabel;
  }
  if (legacyTypography?.chromeLabel && !incomingTypography?.supportLabel && !incomingTypography?.chromeText) {
    normalized.typography.supportLabel = legacyTypography.chromeLabel;
  }
  if (legacyTypography?.supportMeta && !incomingTypography?.supportMeta) {
    normalized.typography.supportMeta = legacyTypography.supportMeta;
    normalized.typography.feedbackMeta = legacyTypography.supportMeta;
  }
  if (legacyTypography?.chromeMeta && !incomingTypography?.chromeMeta) {
    normalized.typography.chromeMeta = legacyTypography.chromeMeta;
  }
  if (legacyTypography?.chromeMeta && !incomingTypography?.supportMeta && !incomingTypography?.chromeMeta) {
    normalized.typography.supportMeta = legacyTypography.chromeMeta;
  }
  if (legacyTypography?.supportHint && !incomingTypography?.supportHint) {
    normalized.typography.supportHint = legacyTypography.supportHint;
    normalized.typography.feedbackHint = legacyTypography.supportHint;
  }
  if (legacyTypography?.chromeHint && !incomingTypography?.supportHint) {
    normalized.typography.supportHint = legacyTypography.chromeHint;
  }
  if (legacyTypography?.supportControl && !incomingTypography?.supportControlText) {
    normalized.typography.supportControlText = legacyTypography.supportControl;
  }
  if (legacyTypography?.fieldControl && !incomingTypography?.supportControlText) {
    normalized.typography.supportControlText = legacyTypography.fieldControl;
  }

  const legacySurfaces = recipes.surfaces as LegacyReaderThemeRecipes['surfaces'] | undefined;
  if (legacySurfaces?.page && !incomingSurfaces?.canvasPage) {
    normalized.surfaces.canvasPage = legacySurfaces.page;
    normalized.surfaces.canvasSection = legacySurfaces.page;
  }
  if (legacySurfaces?.chrome && !incomingSurfaces?.chromeSidebar) {
    normalized.surfaces.chromeSidebar = legacySurfaces.chrome;
    normalized.surfaces.chromeToolbar = legacySurfaces.chrome;
    normalized.surfaces.chromeRail = legacySurfaces.chrome;
  }
  if (legacySurfaces?.detail && !incomingSurfaces?.canvasDetail) {
    normalized.surfaces.canvasDetail = legacySurfaces.detail;
    normalized.surfaces.feedbackPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackSuccessPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackWarningPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackErrorPanel = legacySurfaces.detail;
    normalized.surfaces.feedbackInfoPanel = legacySurfaces.detail;
  }
  if (legacySurfaces?.discovery && !incomingSurfaces?.cardDiscovery) {
    normalized.surfaces.cardDiscovery = legacySurfaces.discovery;
  }
  if (legacySurfaces?.mediaFrame && !incomingSurfaces?.canvasMediaFrame) {
    normalized.surfaces.canvasMediaFrame = legacySurfaces.mediaFrame;
  }
  if (legacySurfaces?.windowPanel) {
    if (!incomingSurfaces?.windowSurface) {
      normalized.surfaces.windowSurface = legacySurfaces.windowPanel;
    }
    if (!incomingSurfaces?.windowFrame) {
      normalized.surfaces.windowFrame = legacySurfaces.windowPanel;
    }
    if (!incomingSurfaces?.windowElevation) {
      normalized.surfaces.windowElevation = legacySurfaces.windowPanel;
    }
  }

  const legacyControls = recipes.controls as LegacyReaderThemeRecipes['controls'] | undefined;
  if (legacyControls?.solid && !incomingControls?.chromeActiveTab) {
    normalized.controls.chromeActiveTab = legacyControls.solid;
  }
  if (legacyControls?.supportControl && !incomingControls?.supportControl) {
    normalized.controls.supportControl = legacyControls.supportControl;
    if (!incomingControls?.feedbackAction) {
      normalized.controls.feedbackAction = legacyControls.supportControl;
    }
  }
  if (legacyControls?.fieldControl && !incomingControls?.supportControl) {
    normalized.controls.supportControl = legacyControls.fieldControl;
  }
  if (legacyControls?.supportControlStrong && !incomingControls?.supportControlStrong) {
    normalized.controls.supportControlStrong = legacyControls.supportControlStrong;
  }
  if (legacyControls?.fieldControlStrong && !incomingControls?.supportControlStrong) {
    normalized.controls.supportControlStrong = legacyControls.fieldControlStrong;
  }
  if (legacyControls?.filterChip && !incomingControls?.supportChip) {
    normalized.controls.supportChip = legacyControls.filterChip;
  }
  if (legacyControls?.chromeFilterChip && !incomingControls?.supportChip) {
    normalized.controls.supportChip = legacyControls.chromeFilterChip;
  }
  if (legacyControls?.link && !incomingControls?.inlineLink) {
    normalized.controls.inlineLink = legacyControls.link;
  }

  const legacyOverlays = recipes.overlays as LegacyReaderThemeRecipes['overlays'] | undefined;
  if (legacyOverlays?.card && !incomingOverlays?.coveredFade) {
    normalized.overlays.coveredFade = legacyOverlays.card;
  }
  if (legacyOverlays?.cardStrong && !incomingOverlays?.galleryOverlay) {
    normalized.overlays.galleryOverlay = legacyOverlays.cardStrong;
  }
  if (legacyOverlays?.cardStrong && !incomingOverlays?.lightboxBackdrop) {
    normalized.overlays.lightboxBackdrop = legacyOverlays.cardStrong;
  }
  if (legacyOverlays?.lightbox && !incomingOverlays?.lightboxBackdrop) {
    normalized.overlays.lightboxBackdrop = legacyOverlays.lightbox;
  }

  return normalized;
}
