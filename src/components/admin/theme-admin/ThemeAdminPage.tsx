'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ThemeAdmin.module.css';
import {
  StructuredThemeData,
  BaseColor,
  ThemeColor,
  hexToHsl,
  type ReaderThemeRecipes,
  type ReaderTypographyRoleRecipe,
  type ThemeRecipeTokenRef,
  type PersistedThemeDocumentData,
  type ResolvedScopedThemeDocumentData,
} from '@/lib/types/theme';
import {
  getAdminPresetSettings,
  getReaderPresetSettings,
  THEME_PRESET_META,
  type ThemeAdminPresetId,
  type ThemePresetId,
  type ThemeDocumentData,
} from '@/lib/theme/themePresets';
import {
  CURRENT_READER_THEME_COMPONENTS,
  DEFAULT_READER_THEME_RECIPES,
  normalizeReaderThemeRecipes,
} from '@/lib/theme/readerThemeSystem';
import { useTheme } from '@/components/providers/ThemeProvider';

type ApiErrorResponse = {
  message?: string;
  code?: string;
  error?: string;
};

type ThemeSaveApiResponse = {
  success: boolean;
  message: string;
  backupSaved?: boolean;
  backupError?: string;
};

type SaveNotice = {
  type: 'success' | 'error' | 'warning';
  message: string;
  detail?: string;
};

type ThemeRecord = Record<string, unknown>;
type TokenOptionGroup = {
  label: string;
  options: ThemeRecipeTokenRef[];
};
type ValueOptionKind = 'color' | 'length' | 'typography' | 'shadow' | 'padding' | 'radius' | 'lineHeight' | 'generic';
type DisplayElement = {
  id: string;
  label: string;
  description?: string;
  binding: {
    kind: string;
    key: string;
  };
};
type DisplayComponentVariant = {
  id: string;
  label: string;
  description?: string;
  elements: DisplayElement[];
};
type DisplayComponentSpec = {
  id: string;
  label: string;
  description: string;
  variants: DisplayComponentVariant[];
};

const THEME_SAVE_ENABLED = true;
const DEFAULT_SELECTED_RECIPE = 'typography:title';
const READER_PRESET_IDS: ThemePresetId[] = ['journal', 'editorial'];
const MIN_SYSTEM_PANE_WIDTH = 420;
const MIN_ADVANCED_PANE_WIDTH = 360;
const THEME_DRAFT_READER_SCOPE = '.themeDraftReaderScope';
const THEME_DRAFT_ADMIN_SCOPE = '.themeDraftAdminScope';
const DRAFT_CSS_DEBOUNCE_MS = 180;

const asThemeRecord = (value: unknown): ThemeRecord => (
  value && typeof value === 'object' ? value as ThemeRecord : {}
);

const formatRoleLabel = (value: string): string => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (char) => char.toUpperCase());

const humanizeTokenSegment = (value: string): string => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[-_.]/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const formatTokenRef = (value: ThemeRecipeTokenRef | string): string => {
  if (value.startsWith('semantic/reader/')) {
    return `Semantic / Reader / ${humanizeTokenSegment(value.replace('semantic/reader/', ''))}`;
  }

  return value
    .replace(/^literal\//, 'Literal / ')
    .split('/')
    .map(humanizeTokenSegment)
    .join(' / ');
};

const getTokenOptionGroupLabel = (value: ThemeRecipeTokenRef, kind: ValueOptionKind = 'generic'): string => {
  if (value.startsWith('semantic/reader/')) {
    return 'Semantic Values';
  }

  switch (kind) {
    case 'color':
      return value.startsWith('state/') ? 'State Values' : 'Color Values';
    case 'length':
      return 'Length Values';
    case 'padding':
      return 'Padding Values';
    case 'radius':
      return 'Radius Values';
    case 'lineHeight':
      return 'Line Spacing Values';
    case 'typography':
      return 'Typography Values';
    case 'shadow':
      return 'Shadow Values';
    default:
      if (value.startsWith('literal/')) {
        return 'Literal Values';
      }
      if (value.startsWith('component/')) {
        return 'Component Values';
      }
      if (value.startsWith('layout/')) {
        return 'Structure Values';
      }
      if (value.startsWith('palette/')) {
        return 'Palette Values';
      }
      if (value.startsWith('gradient/')) {
        return 'Gradient Values';
      }
      if (value.startsWith('font-family/')) {
        return 'Typography Values';
      }
      if (value.startsWith('font-size/')) {
        return 'Typography Values';
      }
      if (value.startsWith('font-weight/')) {
        return 'Typography Values';
      }
      if (value.startsWith('line-height/')) {
        return 'Typography Values';
      }
      if (value.startsWith('spacing/')) {
        return 'Length Values';
      }
      if (value.startsWith('shadow/')) {
        return 'Shadow Values';
      }
      if (value.startsWith('border/')) {
        return 'Length Values';
      }
      return 'Other Values';
  }
};

const groupTokenOptions = (options: ThemeRecipeTokenRef[], kind: ValueOptionKind = 'generic'): TokenOptionGroup[] => {
  const grouped = options.reduce<Map<string, ThemeRecipeTokenRef[]>>((acc, option) => {
    const label = getTokenOptionGroupLabel(option, kind);
    const existing = acc.get(label);
    if (existing) {
      existing.push(option);
    } else {
      acc.set(label, [option]);
    }
    return acc;
  }, new Map());

  return Array.from(grouped.entries()).map(([label, groupedOptions]) => ({
    label,
    options: groupedOptions,
  }));
};

const renderValueOptions = (options: ThemeRecipeTokenRef[], kind: ValueOptionKind = 'generic') => groupTokenOptions(options, kind).map((group) => (
  <optgroup key={group.label} label={group.label}>
    {group.options.map((option) => <option key={option} value={option}>{formatTokenRef(option)}</option>)}
  </optgroup>
));

const FIELD_HINTS = {
  tonalText: 'Use tonal text for ordinary reader copy that sits on normal surfaces.',
  contrastOnFill: 'Use contrast-on-fill when text sits on a strong filled control, chip, or selected state.',
  overlayContrast: 'Use overlay contrast when text must stay readable over media, scrims, or lightbox chrome.',
  accent: 'Use accent for links or intentional emphasis, not for default body copy.',
  focusRing: 'Focus ring should stay clearly visible against both quiet and strong surfaces.',
} as const;

const COMPONENT_TAB_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  header: 'Header',
  chrome: 'Sidebar',
  field: 'Field',
  feedback: 'Feedback Panel',
  storyCard: 'Story',
  galleryCard: 'Gallery',
  qaCard: 'Question',
  discoverySupport: 'Discovery',
  quoteCard: 'Quote',
  calloutCard: 'Callout',
};

const COMPONENT_ORDER = [
  'canvas',
  'header',
  'chrome',
  'field',
  'feedback',
  'storyCard',
  'galleryCard',
  'qaCard',
  'discoverySupport',
  'quoteCard',
  'calloutCard',
] as const;

const PRIMARY_COMPONENT_IDS = ['canvas', 'header', 'chrome', 'field', 'feedback'] as const;
const SECONDARY_COMPONENT_IDS = ['storyCard', 'galleryCard', 'qaCard', 'quoteCard', 'calloutCard', 'discoverySupport'] as const;

const PRIMARY_COMPONENT_DESCRIPTIONS: Record<string, string> = {
  canvas: 'App framing, ordinary text, links, and focus treatment.',
  header: 'Top app bar height, background, border, and borrowed chrome text/icon treatment.',
  chrome: 'Sidebar chrome, active controls, chips, and icons.',
  field: 'Neutral and selected controls, labels, and hints.',
  feedback: 'Neutral and stateful feedback surfaces and actions.',
};

const COMPONENT_BEHAVIOR_NOTES: Record<string, string> = {
  canvas: 'App-level framing, ordinary tonal copy, inline links, and focus behavior.',
  header: 'Top app header background, border, height, and current shared chrome text/icon treatment.',
  chrome: 'Navigation, filters, active tabs, and other structural reader chrome.',
  field: 'Neutral controls, selected field states, labels, and helper text.',
  feedback: 'Empty/loading messaging plus explicit success, warning, error, and info panels.',
  storyCard: 'Story feed cards and opened story detail surfaces.',
  galleryCard: 'Gallery cards, media framing, and lightbox-related jobs.',
  qaCard: 'Question/answer content hierarchy in feed and detail contexts.',
  quoteCard: 'Quote-specific typography and decorative treatment.',
  calloutCard: 'Emphasized callout messaging and watermark treatment.',
  discoverySupport: 'Section headers, child rails, and compact discovery context.',
};

const VARIANT_BEHAVIOR_NOTES: Record<string, string> = {
  reader: 'Reader shell behavior.',
  sidebar: 'Structural navigation and chrome behavior.',
  controls: 'Neutral and selected field/control behavior.',
  states: 'Neutral feedback surfaces for empty and loading contexts.',
  success: 'Positive confirmation state.',
  warning: 'Caution state.',
  error: 'Problem or failure state.',
  info: 'Informational state.',
  closed: 'Compact feed presentation.',
  open: 'Expanded detail presentation.',
  discovery: 'Discovery and related-content presentation.',
  childRail: 'Supporting rail context.',
};

const BINDING_KIND_LABELS: Record<string, string> = {
  typography: 'Typography',
  surface: 'Surface',
  control: 'Control',
  tag: 'Tag',
  overlay: 'Overlay',
  iconography: 'Icon',
  treatment: 'Treatment',
};

const BINDING_KEY_LABELS: Record<string, string> = {
  canvasPage: 'Canvas Page Surface',
  canvasSection: 'Canvas Section Surface',
  chromeSidebar: 'Chrome Sidebar Surface',
  chromeToolbar: 'Chrome Toolbar Surface',
  chromeRail: 'Chrome Rail Surface',
  feedbackPanel: 'Feedback Panel Surface',
  feedbackSuccessPanel: 'Success Panel Surface',
  feedbackWarningPanel: 'Warning Panel Surface',
  feedbackErrorPanel: 'Error Panel Surface',
  feedbackInfoPanel: 'Info Panel Surface',
  canvasDetail: 'Detail Surface',
  cardDiscovery: 'Discovery Surface',
  canvasMediaFrame: 'Media Frame Surface',
  chromeActiveTab: 'Active Tab Control',
  chromeFilterChip: 'Filter Chip Control',
  fieldControl: 'Field Control',
  fieldControlStrong: 'Selected Field Control',
  feedbackAction: 'Feedback Action',
  mediaControl: 'Media Control',
  lightboxControl: 'Lightbox Control',
  inlineLink: 'Inline Link',
  focusRing: 'Focus Ring',
  card: 'Card Scrim',
  cardStrong: 'Strong Card Scrim',
  lightbox: 'Lightbox Scrim',
  chromeTitle: 'Chrome Title',
  chromeLabel: 'Chrome Label',
  chromeMeta: 'Chrome Meta',
  chromeHint: 'Chrome Hint',
  feedbackTitle: 'Feedback Title',
  feedbackMeta: 'Feedback Meta',
  feedbackHint: 'Feedback Hint',
};

const formatBindingKindLabel = (value: string): string => BINDING_KIND_LABELS[value] ?? formatRoleLabel(value);
const formatBindingKeyLabel = (value: string): string => BINDING_KEY_LABELS[value] ?? formatRoleLabel(value);
const ATTRIBUTE_LABELS: Record<string, string> = {
  'canvas.reader.pageSurface': 'Background + Border',
  'canvas.reader.bodyText': 'Text',
  'canvas.reader.metaText': 'Muted Text',
  'canvas.reader.inlineLink': 'Link Color',
  'canvas.reader.focusRing': 'Focus Ring',
  'header.main.backgroundColor': 'Background Color',
  'header.main.textColor': 'Text Color',
  'header.main.iconColor': 'Icon Color',
  'header.main.borderColor': 'Border Color',
  'header.main.height': 'Height',
  'chrome.sidebar.surface': 'Background + Border',
  'chrome.sidebar.title': 'Title Color',
  'chrome.sidebar.label': 'Label Color',
  'chrome.sidebar.meta': 'Meta Color',
  'chrome.sidebar.hint': 'Hint Color',
  'chrome.sidebar.activeTab': 'Active Control',
  'chrome.sidebar.filterChip': 'Filter Chip',
  'chrome.sidebar.inlineLink': 'Link Color',
  'chrome.sidebar.icon': 'Icon Color',
  'field.controls.label': 'Label Color',
  'field.controls.meta': 'Meta Color',
  'field.controls.hint': 'Hint Color',
  'field.controls.control': 'Background + Border',
  'field.controls.controlText': 'Text Color',
  'field.controls.controlStrong': 'Selected Control',
  'field.controls.padding': 'Padding',
  'field.controls.borderRadius': 'Border Radius',
  'feedback.states.surface': 'Background + Border',
  'feedback.states.title': 'Title Color',
  'feedback.states.meta': 'Text Color',
  'feedback.states.hint': 'Hint Color',
  'feedback.states.action': 'Action',
  'feedback.success.surface': 'Success Background + Border',
  'feedback.success.title': 'Success Title Color',
  'feedback.success.meta': 'Success Text Color',
  'feedback.success.action': 'Success Action',
  'feedback.warning.surface': 'Warning Background + Border',
  'feedback.warning.title': 'Warning Title Color',
  'feedback.warning.meta': 'Warning Text Color',
  'feedback.warning.action': 'Warning Action',
  'feedback.error.surface': 'Error Background + Border',
  'feedback.error.title': 'Error Title Color',
  'feedback.error.meta': 'Error Text Color',
  'feedback.error.action': 'Error Action',
  'feedback.info.surface': 'Info Background + Border',
  'feedback.info.title': 'Info Title Color',
  'feedback.info.meta': 'Info Text Color',
  'feedback.info.action': 'Info Action',
  'storyCard.closed.surface': 'Surface',
  'storyCard.closed.contentPadding': 'Content Padding',
  'storyCard.closed.title': 'Title',
  'storyCard.closed.overlayTitle': 'Overlay Title',
  'storyCard.closed.excerpt': 'Excerpt',
  'storyCard.closed.excerptLineHeight': 'Excerpt Line Height',
  'galleryCard.closed.surface': 'Surface',
  'galleryCard.closed.contentPadding': 'Content Padding',
  'galleryCard.closed.title': 'Title',
  'galleryCard.closed.overlayTitle': 'Overlay Title',
  'qaCard.closed.surface': 'Surface',
  'qaCard.closed.contentPadding': 'Content Padding',
  'qaCard.closed.question': 'Question',
  'qaCard.closed.overlayQuestion': 'Overlay Question',
  'qaCard.closed.excerpt': 'Answer Preview',
};
const getAttributeLabel = (componentId: string, variantId: string, elementId: string, fallback: string): string => (
  ATTRIBUTE_LABELS[`${componentId}.${variantId}.${elementId}`] ?? fallback
);
const ATTRIBUTE_VALUE_TYPE_LABELS: Record<string, string> = {
  'canvas.reader.pageSurface': 'Color values',
  'canvas.reader.bodyText': 'Typography values',
  'canvas.reader.metaText': 'Typography values',
  'canvas.reader.inlineLink': 'Color values',
  'canvas.reader.focusRing': 'Color values',
  'header.main.backgroundColor': 'Color values',
  'header.main.textColor': 'Color values',
  'header.main.iconColor': 'Color values',
  'header.main.borderColor': 'Color values',
  'header.main.height': 'Height values',
  'chrome.sidebar.surface': 'Color values',
  'chrome.sidebar.title': 'Color values',
  'chrome.sidebar.label': 'Color values',
  'chrome.sidebar.meta': 'Color values',
  'chrome.sidebar.hint': 'Color values',
  'chrome.sidebar.activeTab': 'Color values',
  'chrome.sidebar.filterChip': 'Color values',
  'chrome.sidebar.inlineLink': 'Color values',
  'chrome.sidebar.icon': 'Color values',
  'chrome.sidebar.width': 'Width values',
  'field.controls.label': 'Color values',
  'field.controls.meta': 'Color values',
  'field.controls.hint': 'Color values',
  'field.controls.control': 'Color values',
  'field.controls.controlText': 'Typography values',
  'field.controls.controlStrong': 'Color values',
  'field.controls.padding': 'Padding values',
  'field.controls.borderRadius': 'Radius values',
  'feedback.states.surface': 'Color values',
  'feedback.states.title': 'Color values',
  'feedback.states.meta': 'Color values',
  'feedback.states.hint': 'Color values',
  'feedback.states.action': 'Color values',
  'feedback.success.surface': 'Color values',
  'feedback.success.title': 'Color values',
  'feedback.success.meta': 'Color values',
  'feedback.success.action': 'Color values',
  'feedback.warning.surface': 'Color values',
  'feedback.warning.title': 'Color values',
  'feedback.warning.meta': 'Color values',
  'feedback.warning.action': 'Color values',
  'feedback.error.surface': 'Color values',
  'feedback.error.title': 'Color values',
  'feedback.error.meta': 'Color values',
  'feedback.error.action': 'Color values',
  'feedback.info.surface': 'Color values',
  'feedback.info.title': 'Color values',
  'feedback.info.meta': 'Color values',
  'feedback.info.action': 'Color values',
  'storyCard.closed.surface': 'Color values',
  'storyCard.closed.contentPadding': 'Padding values',
  'storyCard.closed.title': 'Typography values',
  'storyCard.closed.overlayTitle': 'Typography values',
  'storyCard.closed.excerpt': 'Typography values',
  'storyCard.closed.excerptLineHeight': 'Line spacing values',
  'galleryCard.closed.surface': 'Color values',
  'galleryCard.closed.contentPadding': 'Padding values',
  'galleryCard.closed.title': 'Typography values',
  'galleryCard.closed.overlayTitle': 'Typography values',
  'qaCard.closed.surface': 'Color values',
  'qaCard.closed.contentPadding': 'Padding values',
  'qaCard.closed.question': 'Typography values',
  'qaCard.closed.overlayQuestion': 'Typography values',
  'qaCard.closed.excerpt': 'Typography values',
};
const getAttributeValueTypeLabel = (
  componentId: string,
  variantId: string,
  elementId: string,
  bindingKind: string
): string => ATTRIBUTE_VALUE_TYPE_LABELS[`${componentId}.${variantId}.${elementId}`]
  ?? (bindingKind === 'layout' ? 'Width values' : formatBindingKindLabel(bindingKind));

const HEADER_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'header',
  label: 'Header',
  description: 'Top app header using dedicated height/background/border values and current shared chrome text/icon styling.',
  variants: [
    {
      id: 'main',
      label: 'Main header',
      elements: [
        {
          id: 'backgroundColor',
          label: 'Header background',
          description: 'Header surface color value.',
          binding: { kind: 'token', key: 'headerBackgroundColor' },
        },
        {
          id: 'textColor',
          label: 'Header text',
          description: 'Header text currently follows shared chrome label styling.',
          binding: { kind: 'typography', key: 'chromeLabel' },
        },
        {
          id: 'iconColor',
          label: 'Header icon',
          description: 'Header icons currently follow shared chrome icon styling.',
          binding: { kind: 'iconography', key: 'chrome' },
        },
        {
          id: 'borderColor',
          label: 'Header border',
          description: 'Header bottom-border color value.',
          binding: { kind: 'token', key: 'headerBorderColor' },
        },
        {
          id: 'height',
          label: 'Header height',
          description: 'Overall header height value.',
          binding: { kind: 'token', key: 'headerHeight' },
        },
      ],
    },
  ],
};

const SURFACE_LABELS: Record<string, string> = {
  'canvas.reader': 'Reader shell / page background and global text',
  'chrome.sidebar': 'Reader chrome / sidebar and navigation',
  'field.controls': 'Reader fields / selectors and neutral controls',
  'feedback.states': 'Reader feedback / empty and loading states',
  'feedback.success': 'Reader feedback / success state',
  'feedback.warning': 'Reader feedback / warning state',
  'feedback.error': 'Reader feedback / error state',
  'feedback.info': 'Reader feedback / info state',
  'discoverySupport.discovery': 'Explore More / section heading and groups',
  'discoverySupport.childRail': 'Quote column / child rail',
  'storyCard.closed': 'Story column / closed card',
  'storyCard.open': 'Story column / open card detail',
  'storyCard.discovery': 'Explore More / compact story card',
  'galleryCard.closed': 'Gallery column / closed card',
  'galleryCard.open': 'Gallery column / open detail + gallery media state',
  'galleryCard.discovery': 'Explore More / compact gallery card',
  'qaCard.closed': 'Question column / closed card',
  'qaCard.open': 'Question column / open card detail',
  'qaCard.discovery': 'Explore More / compact question card',
  'quoteCard.closed': 'Quote column / closed card',
  'calloutCard.closed': 'Callout column / closed card',
};

const FONT_FAMILY_OPTIONS: ThemeRecipeTokenRef[] = [
  'font-family/sans',
  'font-family/serif',
  'font-family/handwriting',
];

const FONT_SIZE_OPTIONS: ThemeRecipeTokenRef[] = [
  'font-size/xs',
  'font-size/sm',
  'font-size/base',
  'font-size/lg',
  'font-size/xl',
  'font-size/2xl',
  'font-size/3xl',
  'font-size/4xl',
];

const FONT_WEIGHT_OPTIONS: ThemeRecipeTokenRef[] = [
  'font-weight/normal',
  'font-weight/medium',
  'font-weight/semibold',
  'font-weight/bold',
];

const LINE_HEIGHT_OPTIONS: ThemeRecipeTokenRef[] = [
  'line-height/base',
  'line-height/tight',
  'line-height/relaxed',
];

const COLOR_ROLE_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/tonal-text-primary',
  'semantic/reader/tonal-text-secondary',
  'semantic/reader/contrast-on-fill-text',
  'semantic/reader/overlay-contrast-text',
  'semantic/reader/accent',
  'literal/typography.textColors.text1',
  'literal/typography.textColors.text2',
  'component/tag/textColor',
  'component/link/textColor',
  'component/button/solid/textColor',
  'palette/3',
];

const SURFACE_BACKGROUND_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/canvas-surface',
  'semantic/reader/chrome-surface',
  'semantic/reader/field-surface',
  'semantic/reader/feedback-surface',
  'semantic/reader/media-frame-surface',
  'semantic/reader/discovery-surface',
  'state/success/background',
  'state/error/background',
  'state/warning/background',
  'state/info/background',
  'layout/background1Color',
  'layout/background2Color',
  'component/card/backgroundColor',
  'component/input/backgroundColor',
  'palette/3',
];

const SURFACE_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/canvas-border',
  'semantic/reader/chrome-border',
  'semantic/reader/field-border',
  'semantic/reader/feedback-border',
  'semantic/reader/media-frame-border',
  'semantic/reader/discovery-border',
  'state/success/border',
  'state/error/border',
  'state/warning/border',
  'state/info/border',
  'layout/border1Color',
  'layout/border2Color',
  'component/card/borderColor',
  'component/button/solid/borderColor',
  'component/input/borderColor',
];

const RADIUS_OPTIONS: ThemeRecipeTokenRef[] = [
  'border/radius/sm',
  'border/radius/md',
  'border/radius/lg',
  'border/radius/xl',
  'border/radius/full',
  'component/card/borderRadius',
];

const SHADOW_OPTIONS: ThemeRecipeTokenRef[] = [
  'shadow/sm',
  'shadow/md',
  'shadow/lg',
  'shadow/xl',
  'component/card/shadow',
  'component/card/shadowHover',
];

const PADDING_OPTIONS: ThemeRecipeTokenRef[] = [
  'spacing/sm',
  'spacing/md',
  'spacing/lg',
  'spacing/xl',
  'component/card/padding',
];

const CONTROL_BACKGROUND_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/field-surface',
  'semantic/reader/chrome-surface',
  'semantic/reader/media-control-surface',
  'semantic/reader/lightbox-control-surface',
  'semantic/reader/overlay-scrim',
  'semantic/reader/overlay-scrim-strong',
  'component/button/solid/backgroundColor',
  'component/button/solid/backgroundColorHover',
  'layout/background1Color',
  'layout/background2Color',
  'gradient/bottomOverlay',
  'gradient/bottomOverlayStrong',
  'literal/transparent',
];

const CONTROL_TEXT_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/contrast-on-fill-text',
  'semantic/reader/overlay-contrast-text',
  'semantic/reader/tonal-text-primary',
  'semantic/reader/tonal-text-secondary',
  'semantic/reader/accent',
  'component/button/solid/textColor',
  'component/link/textColor',
  'component/link/textColorHover',
  'literal/typography.textColors.text1',
  'literal/typography.textColors.text2',
];

const CONTROL_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/field-border',
  'semantic/reader/chrome-border',
  'semantic/reader/media-control-border',
  'semantic/reader/lightbox-control-border',
  'semantic/reader/overlay-border',
  'component/button/solid/borderColor',
  'layout/border1Color',
  'layout/border2Color',
  'component/card/borderColor',
];

const mergeReaderRecipes = (recipes?: Partial<ReaderThemeRecipes> | null): ReaderThemeRecipes => {
  const normalized = normalizeReaderThemeRecipes(recipes);
  return {
    ...DEFAULT_READER_THEME_RECIPES,
    ...normalized,
    typography: {
      ...DEFAULT_READER_THEME_RECIPES.typography,
      ...(normalized?.typography ?? {}),
    },
    surfaces: {
      ...DEFAULT_READER_THEME_RECIPES.surfaces,
      ...(normalized?.surfaces ?? {}),
    },
    controls: {
      ...DEFAULT_READER_THEME_RECIPES.controls,
      ...(normalized?.controls ?? {}),
    },
    tags: {
      ...DEFAULT_READER_THEME_RECIPES.tags,
      ...(normalized?.tags ?? {}),
    },
    overlays: {
      ...DEFAULT_READER_THEME_RECIPES.overlays,
      ...(normalized?.overlays ?? {}),
    },
    iconography: {
      ...DEFAULT_READER_THEME_RECIPES.iconography,
      ...(normalized?.iconography ?? {}),
    },
    treatments: {
      ...DEFAULT_READER_THEME_RECIPES.treatments,
      ...(normalized?.treatments ?? {}),
    },
  };
};

// Color Palette Editor Component
const PaletteColorEditor: React.FC<{
  color: BaseColor | ThemeColor;
  onColorChange: (id: number, field: keyof BaseColor | keyof ThemeColor, value: string, variant?: 'light' | 'dark') => void;
  onHslChange: (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => void;
  darkModeShift: number;
}> = ({ color, onColorChange, onHslChange, darkModeShift }) => {
  const [showHsl, setShowHsl] = useState(false);

  const isThemeColor = (color: BaseColor | ThemeColor): color is ThemeColor => {
    return 'light' in color && 'dark' in color;
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>, variant?: 'light' | 'dark') => {
    const newHex = e.target.value;
    
    if (isThemeColor(color)) {
      onColorChange(color.id, 'hex', newHex, variant);
      
      // For colors 1 and 2, also update HSL values when hex is valid
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
        const { h, s, l } = hexToHsl(newHex);
        onHslChange(color.id, `${h}`, `${s}%`, `${l}%`, variant);
      }
    } else {
      onColorChange(color.id, 'hex', newHex);
      
      // If it's a valid hex, auto-update HSL
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
        const { h, s, l } = hexToHsl(newHex);
        onHslChange(color.id, `${h}`, `${s}%`, `${l}%`);
      }
    }
  };
  
  const handleHslSliderChange = (component: 'h' | 's' | 'l', value: string, variant?: 'light' | 'dark') => {
    if (isThemeColor(color)) {
      const variantData = variant === 'light' ? color.light : color.dark;
      const newH = component === 'h' ? value : variantData.h;
      const newS = component === 's' ? `${value}%` : variantData.s;
      const newL = component === 'l' ? `${value}%` : variantData.l;
      onHslChange(color.id, newH, newS, newL, variant);
      
      // Convert HSL back to HEX and update
      const h = parseInt(newH, 10);
      const s = parseInt(newS, 10);
      const l = parseInt(newL, 10);
      const newHex = hslToHex(h, s, l);
      onColorChange(color.id, 'hex', newHex, variant);
    } else {
      const newH = component === 'h' ? value : color.h;
      const newS = component === 's' ? `${value}%` : color.s;
      const newL = component === 'l' ? `${value}%` : color.l;
      onHslChange(color.id, newH, newS, newL);
      
      // Convert HSL back to HEX and update
      const h = parseInt(newH, 10);
      const s = parseInt(newS, 10);
      const l = parseInt(newL, 10);
      const newHex = hslToHex(h, s, l);
      onColorChange(color.id, 'hex', newHex);
    }
  };

  if (isThemeColor(color)) {
    return (
      <div className={styles.colorEditor}>
        <div className={styles.paletteColorHeaderRow}>
          <div className={styles.paletteColorHeader}>{color.id}</div>
          <button
            type="button"
            className={styles.paletteHslToggle}
            onClick={() => setShowHsl((current) => !current)}
            aria-expanded={showHsl}
          >
            {showHsl ? 'Hide' : 'HSL'}
          </button>
        </div>
        <div className={styles.paletteVariantStack}>
          {(['light', 'dark'] as const).map((variant) => {
            const variantColor = color[variant];
            return (
              <div key={variant} className={styles.paletteVariantSection}>
                <div
                  className={styles.paletteSwatch}
                  style={{ backgroundColor: variantColor.hex }}
                  title={`${variant}: ${variantColor.hex}`}
                />
                <div className={styles.paletteValueGrid}>
                  <input
                    type="text"
                    value={variantColor.hex}
                    onChange={(e) => handleHexChange(e, variant)}
                    className={styles.paletteHexInput}
                    title={`${variant} HEX color value`}
                  />
                  {showHsl ? (
                    <div className={styles.paletteHslStack}>
                      <div className={styles.paletteHslValue}>
                        <label>H</label>
                        <input
                          type="number"
                          min="0"
                          max="360"
                          value={parseInt(variantColor.h, 10) || 0}
                          onChange={(e) => handleHslSliderChange('h', e.target.value, variant)}
                          className={styles.hslSpinner}
                        />
                      </div>
                      <div className={styles.paletteHslValue}>
                        <label>S</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={parseInt(variantColor.s, 10) || 0}
                          onChange={(e) => handleHslSliderChange('s', e.target.value, variant)}
                          className={styles.hslSpinner}
                        />
                      </div>
                      <div className={styles.paletteHslValue}>
                        <label>L</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={parseInt(variantColor.l, 10) || 0}
                          onChange={(e) => handleHslSliderChange('l', e.target.value, variant)}
                          className={styles.hslSpinner}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    const h = parseInt(color.h, 10);
    const s = parseInt(color.s, 10);
    const l = parseInt(color.l, 10);
    const darkL = Math.min(100, l + darkModeShift);

    return (
      <div className={styles.colorEditor}>
        <div className={styles.paletteColorHeaderRow}>
          <div className={styles.paletteColorHeader}>{color.id}</div>
          <button
            type="button"
            className={styles.paletteHslToggle}
            onClick={() => setShowHsl((current) => !current)}
            aria-expanded={showHsl}
          >
            {showHsl ? 'Hide' : 'HSL'}
          </button>
        </div>
        <div className={styles.paletteVariantStack}>
          <div className={styles.paletteVariantSection}>
            <div
              className={styles.paletteSwatch}
              style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
              title={`Light: ${color.hex}`}
            />
            <input
              type="text"
              value={color.hex}
              onChange={handleHexChange}
              className={styles.paletteHexInput}
              title="HEX color value"
            />
            {showHsl ? (
              <div className={styles.paletteHslStack}>
                <div className={styles.paletteHslValue}>
                  <label>H</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={isNaN(h) ? 0 : h}
                    onChange={(e) => handleHslSliderChange('h', e.target.value)}
                    className={styles.hslSpinner}
                  />
                </div>
                <div className={styles.paletteHslValue}>
                  <label>S</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={isNaN(s) ? 0 : s}
                    onChange={(e) => handleHslSliderChange('s', e.target.value)}
                    className={styles.hslSpinner}
                  />
                </div>
                <div className={styles.paletteHslValue}>
                  <label>L</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={isNaN(l) ? 0 : l}
                    onChange={(e) => handleHslSliderChange('l', e.target.value)}
                    className={styles.hslSpinner}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className={styles.paletteVariantSection}>
            <div
              className={styles.paletteSwatch}
              style={{ backgroundColor: `hsl(${h}, ${s}%, ${darkL}%)` }}
              title={`Dark: hsl(${h}, ${s}%, ${darkL}%)`}
            />
            <input
              type="text"
              value={hslToHex(h, s, darkL)}
              readOnly
              className={styles.paletteHexInput}
              title="Derived dark HEX color value"
            />
            {showHsl ? (
              <div className={styles.paletteHslStack}>
                <div className={styles.paletteHslValue}>
                  <label>H</label>
                  <input
                    type="number"
                    value={h}
                    readOnly
                    className={styles.hslSpinner}
                  />
                </div>
                <div className={styles.paletteHslValue}>
                  <label>S</label>
                  <input
                    type="number"
                    value={s}
                    readOnly
                    className={styles.hslSpinner}
                  />
                </div>
                <div className={styles.paletteHslValue}>
                  <label>L</label>
                  <input
                    type="number"
                    value={darkL}
                    readOnly
                    className={styles.hslSpinner}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
};

// Helper function to convert HSL to HEX
const hslToHex = (h: number, s: number, l: number): string => {
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lDecimal - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Token Input Component
const TokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
}> = ({ label, value, onChange, type = 'text' }) => (
  <div className={styles.tokenInput}>
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Font Size Token Input - Right-justified layout
const FontSizeTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Extended Token Input - Wider input for complex formulas
const ExtendedTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.extendedTokenInput}>
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Color Reference Input - Right-justified layout with validation and preview
const ColorReferenceInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: BaseColor[];
  themeColors?: ThemeColor[];
}> = ({ label, value, onChange, colors, themeColors = [] }) => {
  const [isValid, setIsValid] = useState(true);
  const [previewColor, setPreviewColor] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateAndPreview = useCallback((inputValue: string) => {
    if (!inputValue.trim()) {
      setIsValid(true);
      setPreviewColor('');
      setErrorMessage('');
      return;
    }

    // Parse input: "color1-100" or "color3"
    const colorMatch = inputValue.match(/^color(\d+)(?:-(\d+))?$/);
    if (!colorMatch) {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Invalid format. Use "color1-100" for theme colors or "color3" for palette colors');
      return;
    }

    const colorNum = parseInt(colorMatch[1], 10);
    const step = colorMatch[2];

    // Validate color number range
    if (colorNum < 1 || colorNum > 14) {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Color number must be between 1 and 14');
      return;
    }

    // Find the color - check themeColors first for colors 1-2, then palette for colors 3-14
    let color;
    if (colorNum === 1 || colorNum === 2) {
      color = themeColors.find(c => c.id === colorNum);
      if (!color) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} not found in theme colors`);
        return;
      }
    } else {
      color = colors.find(c => c.id === colorNum);
      if (!color) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} not found in palette`);
        return;
      }
    }

    // Validate format based on color type
    if (colorNum === 1 || colorNum === 2) {
      // Colors 1-2 need step specification
      if (!step) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} requires a step (e.g., "color${colorNum}-100")`);
        return;
      }
      
      const validSteps = ['100', '200', '300'];
      if (!validSteps.includes(step)) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Invalid step "${step}". Valid steps: ${validSteps.join(', ')}`);
        return;
      }

      // Generate preview color matching CSS generation logic (theme colors 1–2 store HSL under light/dark)
      const light = (color as ThemeColor).light;
      const h = parseInt(light.h, 10);
      const s = parseInt(String(light.s).replace('%', ''), 10);
      const stepValue = parseInt(step, 10);
      
      let baseLightness;
      if (colorNum === 1) {
        // Color1 (background): 100=100%, 200=95%, 300=90%
        baseLightness = Math.max(0, Math.min(100, 105 - (stepValue / 20)));
      } else {
        // Color2 (text): 100=20%, 200=15%, 300=10%
        baseLightness = Math.max(0, Math.min(100, 25 - (stepValue / 20)));
      }
      
      // Show light theme preview (for simplicity in admin interface)
      setPreviewColor(`hsl(${h}, ${s}%, ${baseLightness}%)`);
      setIsValid(true);
      setErrorMessage('');
    } else if (colorNum >= 3 && colorNum <= 14) {
      // Colors 3-14 should not have step specification
      if (step) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} should not have a step specification (use just "color${colorNum}")`);
        return;
      }

      // Generate preview color (base color)
      const h = parseInt(color.h, 10);
      const s = parseInt(color.s, 10);
      const l = parseInt(color.l, 10);
      setPreviewColor(`hsl(${h}, ${s}%, ${l}%)`);
      setIsValid(true);
      setErrorMessage('');
    } else {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Invalid color reference format');
    }
  }, [colors, themeColors]);

  React.useEffect(() => {
    validateAndPreview(value);
  }, [value, validateAndPreview]);

  return (
    <div className={styles.colorReferenceInput}>
      <div className={styles.colorInputRow}>
        <label>{label}</label>
        <div 
          className={styles.colorPreview}
          style={previewColor ? { backgroundColor: previewColor } : undefined}
          title={previewColor ? `Preview: ${previewColor}` : undefined}
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            validateAndPreview(e.target.value);
          }}
          className={`${styles.colorInput} ${!isValid ? styles.colorInputError : ''}`}
          placeholder="color1-100 or color3"
        />
      </div>
      {!isValid && (
        <span className={styles.colorError}>
          {errorMessage}
        </span>
      )}
    </div>
  );
};

// State Color Input - For states with color preview boxes
const StateColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: BaseColor[];
}> = ({ label, value, onChange, colors }) => {
  const [previewColor, setPreviewColor] = useState('');

  React.useEffect(() => {
    if (value && colors) {
      // Handle both old numeric format and new color format
      let colorNum;
      if (value.startsWith('color')) {
        colorNum = parseInt(value.replace('color', ''), 10);
      } else {
        colorNum = parseInt(value, 10);
      }
      
      const color = colors.find(c => c.id === colorNum);
      if (color) {
        const h = parseInt(color.h, 10);
        const s = parseInt(color.s, 10);
        const l = parseInt(color.l, 10);
        setPreviewColor(`hsl(${h}, ${s}%, ${l}%)`);
      } else {
        setPreviewColor('');
      }
    } else {
      setPreviewColor('');
    }
  }, [value, colors]);

  return (
    <div className={styles.colorReferenceInput}>
      <div className={styles.colorInputRow}>
        <label>{label}</label>
        <div 
          className={styles.colorPreview}
          style={previewColor ? { backgroundColor: previewColor } : undefined}
          title={previewColor ? `Preview: ${previewColor}` : undefined}
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorInput}
          placeholder="color11-color14"
        />
      </div>
    </div>
  );
};

// Font Weight Input - Right-justified layout for editable values
const FontWeightInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);



// Spacing Multiplier Input - Right-justified layout for multiplier values
const SpacingMultiplierInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="number"
      step="0.25"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Main Theme Admin Component
export default function ThemeAdminPage() {
  const router = useRouter();
  const { applyDraftThemeCss, clearDraftThemeCss, hasDraftThemeCss, theme, toggleTheme } = useTheme();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [themeData, setThemeData] = useState<StructuredThemeData | null>(null);
  const [adminThemeData, setAdminThemeData] = useState<StructuredThemeData | null>(null);
  const [readerRecipes, setReaderRecipes] = useState<ReaderThemeRecipes>(DEFAULT_READER_THEME_RECIPES);
  const [selectedComponentId, setSelectedComponentId] = useState<string>(PRIMARY_COMPONENT_IDS[0]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('closed');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(DEFAULT_SELECTED_RECIPE);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [isNarrowWorkspace, setIsNarrowWorkspace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const [darkModeShift, setDarkModeShift] = useState(5);
  const [adminDarkModeShift, setAdminDarkModeShift] = useState(5);
  const [activePresetId, setActivePresetId] = useState<ThemePresetId | 'custom'>('custom');
  const [activeAdminPresetId, setActiveAdminPresetId] = useState<ThemeAdminPresetId | 'custom'>('admin');
  const [savedThemeDocument, setSavedThemeDocument] = useState<PersistedThemeDocumentData | null>(null);

  const orderedReaderComponents: DisplayComponentSpec[] = COMPONENT_ORDER
    .map((id) => {
      if (id === 'header') {
        return HEADER_COMPONENT_SPEC;
      }
      return CURRENT_READER_THEME_COMPONENTS.find((component) => component.id === id) as DisplayComponentSpec | undefined;
    })
    .filter((component): component is DisplayComponentSpec => Boolean(component));

  const primaryReaderComponents = useMemo(() => PRIMARY_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);

  const secondaryReaderComponents = useMemo(() => SECONDARY_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);

  const applyReaderPreset = useCallback((presetId: ThemePresetId) => {
    const preset = getReaderPresetSettings(presetId);
    setThemeData(preset.data);
    setDarkModeShift(preset.darkModeShift);
    setReaderRecipes(mergeReaderRecipes(preset.recipes));
    setActivePresetId(presetId);
    setSaveNotice({
      type: 'warning',
      message: `${THEME_PRESET_META[presetId].label} preset applied to the working draft.`,
      detail: 'Save to keep this preset direction as the new live theme, or continue editing before saving.',
    });
  }, []);

  useEffect(() => {
    const selectedComponent = orderedReaderComponents.find((component) => component.id === selectedComponentId);
    const fallbackVariantId = selectedComponent?.variants[0]?.id ?? '';
    if (!selectedComponent) return;
    if (!selectedComponent.variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(fallbackVariantId);
    }
  }, [orderedReaderComponents, selectedComponentId, selectedVariantId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncWorkspaceMode = () => setIsNarrowWorkspace(window.innerWidth <= 960);
    syncWorkspaceMode();
    window.addEventListener('resize', syncWorkspaceMode);
    return () => window.removeEventListener('resize', syncWorkspaceMode);
  }, []);

  const applyThemeDocument = useCallback((document: PersistedThemeDocumentData) => {
    setThemeData(document.reader.data);
    setDarkModeShift(document.reader.darkModeShift || 5);
    setReaderRecipes(mergeReaderRecipes(document.reader.recipes));
    setActivePresetId(
      document.reader.activePresetId === 'journal' || document.reader.activePresetId === 'editorial'
        ? document.reader.activePresetId
        : 'custom'
    );
    setAdminThemeData(document.admin.data);
    setAdminDarkModeShift(document.admin.darkModeShift || 5);
    setActiveAdminPresetId(document.admin.activePresetId === 'admin' ? document.admin.activePresetId : 'custom');
  }, []);

  useEffect(() => {
    const fetchThemeData = async () => {
      try {
        const response = await fetch('/api/theme');
        const data = await response.json();
        if (!response.ok) {
          const err = data as ApiErrorResponse;
          throw new Error(err.message || err.error || 'Failed to fetch theme data.');
        }
        const adminPreset = getAdminPresetSettings('admin');

        if ((data as ResolvedScopedThemeDocumentData)?.version === 2) {
          const scoped = data as ResolvedScopedThemeDocumentData;
          const persistedDocument: PersistedThemeDocumentData = {
            version: 2,
            reader: {
              data: scoped.reader.data,
              darkModeShift: scoped.reader.darkModeShift || 5,
              activePresetId: scoped.reader.activePresetId,
              ...(scoped.reader.recipes ? { recipes: scoped.reader.recipes } : {}),
            },
            admin: {
              data: scoped.admin.data,
              darkModeShift: scoped.admin.darkModeShift || 5,
              activePresetId: scoped.admin.activePresetId,
              ...(scoped.admin.recipes ? { recipes: scoped.admin.recipes } : {}),
            },
          };
          setSavedThemeDocument(persistedDocument);
          applyThemeDocument(persistedDocument);
        } else {
          const legacyTheme = data as ThemeDocumentData;
          const ap = legacyTheme.activePresetId;
          const persistedDocument: PersistedThemeDocumentData = {
            version: 2,
            reader: {
              data: legacyTheme,
              darkModeShift: legacyTheme.darkModeShift || 5,
              activePresetId: ap === 'journal' || ap === 'editorial' ? ap : 'custom',
              recipes: mergeReaderRecipes(),
            },
            admin: {
              data: adminPreset.data,
              darkModeShift: adminPreset.darkModeShift,
              activePresetId: adminPreset.activePresetId === 'admin' ? adminPreset.activePresetId : 'admin',
            },
          };
          setSavedThemeDocument(persistedDocument);
          applyThemeDocument(persistedDocument);
        }
      } catch (error) {
        console.error('Failed to fetch theme data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThemeData();
  }, [applyThemeDocument]);

  const handleColorChange = (id: number, field: keyof BaseColor | keyof ThemeColor, value: string, variant?: 'light' | 'dark') => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => {
      const newData = { ...prev! };
      
      // Handle theme colors (1 and 2)
      if (id === 1 || id === 2) {
        const themeColor = newData.themeColors.find(color => color.id === id);
        if (themeColor && variant) {
          if (field === 'hex') {
            themeColor[variant].hex = value;
          } else if (field === 'name') {
            themeColor.name = value;
          }
        }
      } else {
        // Handle regular palette colors (3-14)
        newData.palette = newData.palette.map(color =>
          color.id === id ? { ...color, [field]: value } : color
        );
      }
      
      return newData;
    });
  };

  const handleHslChange = (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => {
      const newData = { ...prev! };
      
      // Handle theme colors (1 and 2)
      if (id === 1 || id === 2) {
        const themeColor = newData.themeColors.find(color => color.id === id);
        if (themeColor && variant) {
          themeColor[variant].h = h;
          themeColor[variant].s = s;
          themeColor[variant].l = l;
        }
      } else {
        // Handle regular palette colors (3-14)
        newData.palette = newData.palette.map(color =>
          color.id === id ? { ...color, h, s, l } : color
        );
      }
      
      return newData;
    });
  };

  const handleTokenChange = (section: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [key]: value
      }
    }));
  };

  const handleNestedTokenChange = (section: string, subsection: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [subsection]: {
          ...asThemeRecord(asThemeRecord(prev![section as keyof StructuredThemeData])[subsection]),
          [key]: value
        }
      }
    }));
  };

  const handleDeepNestedTokenChange = (section: string, subsection: string, subsubsection: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [subsection]: {
          ...asThemeRecord(asThemeRecord(prev![section as keyof StructuredThemeData])[subsection]),
          [subsubsection]: {
            ...asThemeRecord(
              asThemeRecord(asThemeRecord(prev![section as keyof StructuredThemeData])[subsection])[subsubsection]
            ),
            [key]: value
          }
        }
      }
    }));
  };

  const validateThemeData = (data: StructuredThemeData): string[] => {
    const errors: string[] = [];
    
    console.log('Validating theme data:', data);
    
    // Helper function to validate color references recursively
    const validateColorReferences = (obj: unknown, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string') {
          // Only check strings that look like color references (start with "color")
          if (value.match(/^color\d+(-\d+)?$/)) {
            console.log(`Checking color reference at ${currentPath}:`, value);
            if (!isValidColorReference(value, data.palette, data.themeColors || [])) {
              errors.push(`Invalid color reference at ${currentPath}: ${value}`);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          validateColorReferences(value, currentPath);
        }
      }
    };
    
    // Validate all color references in the theme data
    validateColorReferences(data);
    
    return errors;
  };

  const isValidColorReference = (reference: string, palette: BaseColor[], themeColors: ThemeColor[]): boolean => {
    if (!reference.trim()) return true; // Empty is valid
    
    // Check for theme color format: "color1-200", "color2-100", etc.
    const themeColorMatch = reference.match(/^color(\d+)-(\d+)$/);
    if (themeColorMatch) {
      const colorNum = parseInt(themeColorMatch[1], 10);
      const step = themeColorMatch[2];
      
      // Validate color number range
      if (colorNum < 1 || colorNum > 14) return false;
      
      // For colors 1 and 2, check themeColors array
      if (colorNum === 1 || colorNum === 2) {
        const color = themeColors.find(c => c.id === colorNum);
        if (!color) return false;
        
        // Validate step for colors 1 and 2 (3-shade system)
        const validSteps = ['100', '200', '300'];
        return validSteps.includes(step);
      } else {
        // Colors 3-14 should not have step specification
        return false;
      }
    }
    
    // Check for palette color format: "color3", "color4", etc. (colors 3-14)
    const paletteColorMatch = reference.match(/^color(\d+)$/);
    if (paletteColorMatch) {
      const colorNum = parseInt(paletteColorMatch[1], 10);
      
      // Only colors 3-14 can use this format
      if (colorNum < 3 || colorNum > 14) return false;
      
      // Find the color in palette array
      const color = palette.find(c => c.id === colorNum);
      return !!color;
    }
    
    return false;
  };

  const saveTheme = async () => {
    if (!themeData || !adminThemeData) return;

    if (!THEME_SAVE_ENABLED) {
      setSaveNotice({
        type: 'warning',
        message: 'Theme saving is paused.',
        detail: 'This page is a preview lab until the semantic theme model is ready.',
      });
      return;
    }
    
    // Validate theme data before saving
    const validationErrors = [
      ...validateThemeData(themeData).map((error) => `Reader: ${error}`),
      ...validateThemeData(adminThemeData).map((error) => `Admin: ${error}`),
    ];
    if (validationErrors.length > 0) {
      setSaveNotice({
        type: 'warning',
        message: 'Cannot save theme until validation errors are resolved.',
        detail: validationErrors.join(' '),
      });
      return;
    }
    
    setSaving(true);
    setSaveNotice(null);
    try {
      const dataToSave: PersistedThemeDocumentData = {
        version: 2,
        reader: {
          data: themeData,
          darkModeShift,
          activePresetId,
          recipes: readerRecipes,
        },
        admin: {
          data: adminThemeData,
          darkModeShift: adminDarkModeShift,
          activePresetId: activeAdminPresetId,
        },
      };
      
      const response = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (response.ok) {
        const result = (await response.json().catch(() => ({
          success: true,
          message: 'Theme saved successfully.',
        }))) as ThemeSaveApiResponse;
        setSavedThemeDocument(dataToSave);
        router.refresh();
        setSaveNotice({
          type: result.backupSaved === false ? 'warning' : 'success',
          message: result.message || 'Theme saved successfully.',
          detail:
            result.backupSaved === false
              ? result.backupError || 'Firestore was updated, but the theme-data.json backup could not be written.'
              : 'Reader and Admin theme settings were persisted.',
        });
      } else {
        const err = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        setSaveNotice({
          type: 'error',
          message: 'Failed to save theme.',
          detail: err.message || err.error || 'Request failed.',
        });
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveNotice({
        type: 'error',
        message: 'Failed to save theme.',
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = useCallback(() => {
    if (!savedThemeDocument) return;
    applyThemeDocument(savedThemeDocument);
    clearDraftThemeCss();
    setSaveNotice({
      type: 'warning',
      message: 'Draft theme discarded.',
      detail: 'Theme Management has been restored to the last saved reader and admin theme settings.',
    });
  }, [applyThemeDocument, clearDraftThemeCss, savedThemeDocument]);

  const currentDraftDocument = useMemo<PersistedThemeDocumentData | null>(() => {
    if (!themeData || !adminThemeData) return null;

    return {
      version: 2,
      reader: {
        data: themeData,
        darkModeShift,
        activePresetId,
        recipes: readerRecipes,
      },
      admin: {
        data: adminThemeData,
        darkModeShift: adminDarkModeShift,
        activePresetId: activeAdminPresetId,
      },
    };
  }, [
    activeAdminPresetId,
    activePresetId,
    adminDarkModeShift,
    adminThemeData,
    darkModeShift,
    readerRecipes,
    themeData,
  ]);

  const isDraftDirty = useMemo(() => {
    if (!currentDraftDocument || !savedThemeDocument) return false;
    return JSON.stringify(currentDraftDocument) !== JSON.stringify(savedThemeDocument);
  }, [currentDraftDocument, savedThemeDocument]);

  const formatReaderPresetLabel = useCallback((presetId: ThemePresetId | 'custom') => (
    presetId === 'custom' ? 'Custom' : THEME_PRESET_META[presetId].label
  ), []);

  const savedReaderPresetLabel = useMemo(() => {
    if (!savedThemeDocument) return 'Loading';
    const savedPresetId = savedThemeDocument.reader.activePresetId;
    return formatReaderPresetLabel(
      savedPresetId === 'journal' || savedPresetId === 'editorial' ? savedPresetId : 'custom'
    );
  }, [formatReaderPresetLabel, savedThemeDocument]);

  const currentDraftPresetLabel = useMemo(
    () => formatReaderPresetLabel(activePresetId),
    [activePresetId, formatReaderPresetLabel]
  );

  const draftStatusLabel = isDraftDirty || hasDraftThemeCss ? 'Unsaved draft' : 'Saved state';
  const draftStatusDetail = isDraftDirty || hasDraftThemeCss
    ? 'Live draft is applied to the app right now.'
    : 'The saved reader theme is currently applied.';
  const saveTargetDetail = isDraftDirty || hasDraftThemeCss
    ? 'Save will replace the current active reader theme with this draft.'
    : 'There is nothing new to save right now.';

  useEffect(() => {
    if (!currentDraftDocument || loading) return;

    if (!isDraftDirty) {
      clearDraftThemeCss();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch('/api/theme/draft-css', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              ...currentDraftDocument,
              readerScopeSelector: THEME_DRAFT_READER_SCOPE,
              adminScopeSelector: THEME_DRAFT_ADMIN_SCOPE,
            }),
          });
          const data = await response.json();

          if (!response.ok) {
            const err = data as ApiErrorResponse;
            throw new Error(err.message || err.error || 'Failed to build draft theme CSS.');
          }

          if (!controller.signal.aborted && typeof data.css === 'string') {
            applyDraftThemeCss(data.css);
          }
        } catch (error) {
          if ((error as Error)?.name === 'AbortError') return;
          console.error('Failed to build draft theme CSS:', error);
          if (!controller.signal.aborted) {
            setSaveNotice({
              type: 'warning',
              message: 'Live draft update failed.',
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })();
    }, DRAFT_CSS_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [applyDraftThemeCss, clearDraftThemeCss, currentDraftDocument, isDraftDirty, loading]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div>Loading theme data...</div>
      </div>
    );
  }

  if (!themeData || !adminThemeData) {
    return (
      <div className={styles.centered}>
        <div>Failed to load theme data</div>
      </div>
    );
  }

  const updateTypographyRecipe = <K extends keyof ReaderThemeRecipes['typography']>(
    role: K,
    field: keyof ReaderTypographyRoleRecipe,
    value: ReaderTypographyRoleRecipe[keyof ReaderTypographyRoleRecipe]
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [role]: {
          ...prev.typography[role],
          [field]: value,
        },
      },
    }));
  };

  const updateSurfaceRecipe = <K extends keyof ReaderThemeRecipes['surfaces']>(
    role: K,
    field: keyof ReaderThemeRecipes['surfaces'][K],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      surfaces: {
        ...prev.surfaces,
        [role]: {
          ...prev.surfaces[role],
          [field]: value,
        },
      },
    }));
  };

  const updateControlRecipe = <
    K extends Exclude<keyof ReaderThemeRecipes['controls'], 'focusRing' | 'link'>
  >(
    role: K,
    field: keyof ReaderThemeRecipes['controls'][K],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      controls: {
        ...prev.controls,
        [role]: {
          ...prev.controls[role],
          [field]: value,
        },
      },
    }));
  };

  const updateLinkRecipe = (
    field: keyof ReaderThemeRecipes['controls']['inlineLink'],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      controls: {
        ...prev.controls,
        inlineLink: {
          ...prev.controls.inlineLink,
          [field]: value,
        },
      },
    }));
  };

  const updateFocusRingRecipe = (value: ThemeRecipeTokenRef) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      controls: {
        ...prev.controls,
        focusRing: {
          color: value,
        },
      },
    }));
  };

  const updateTagRecipe = <K extends keyof ReaderThemeRecipes['tags']>(
    role: K,
    field: keyof ReaderThemeRecipes['tags'][K],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      tags: {
        ...prev.tags,
        [role]: {
          ...prev.tags[role],
          [field]: value,
        },
      },
    }));
  };

  const updateOverlayRecipe = <K extends keyof ReaderThemeRecipes['overlays']>(
    role: K,
    field: keyof ReaderThemeRecipes['overlays'][K],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      overlays: {
        ...prev.overlays,
        [role]: {
          ...prev.overlays[role],
          [field]: value,
        },
      },
    }));
  };

  const updateIconographyRecipe = (
    role: keyof ReaderThemeRecipes['iconography'],
    value: ThemeRecipeTokenRef
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      iconography: {
        ...prev.iconography,
        [role]: value,
      },
    }));
  };

  const updateTreatmentRecipe = (
    role: keyof ReaderThemeRecipes['treatments'],
    value: string
  ) => {
    setActivePresetId('custom');
    setReaderRecipes((prev) => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [role]: value,
      },
    }));
  };

  const renderTypographyEditor = (role: keyof ReaderThemeRecipes['typography']) => {
    const recipe = readerRecipes.typography[role];
    const colorHint = role === 'storyOverlayTitle'
      ? FIELD_HINTS.overlayContrast
      : `${FIELD_HINTS.tonalText} ${FIELD_HINTS.accent}`;
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Family</span>
          <select value={recipe.family} onChange={(e) => updateTypographyRecipe(role, 'family', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(FONT_FAMILY_OPTIONS, 'typography')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Size</span>
          <select value={recipe.size} onChange={(e) => updateTypographyRecipe(role, 'size', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(FONT_SIZE_OPTIONS, 'typography')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Weight</span>
          <select value={recipe.weight} onChange={(e) => updateTypographyRecipe(role, 'weight', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(FONT_WEIGHT_OPTIONS, 'typography')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Line height</span>
          <select value={recipe.lineHeight} onChange={(e) => updateTypographyRecipe(role, 'lineHeight', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Color</span>
          <select value={recipe.color} onChange={(e) => updateTypographyRecipe(role, 'color', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(COLOR_ROLE_OPTIONS, 'color')}
          </select>
          <small className={styles.fieldHint}>
            {colorHint}
          </small>
        </label>
        <label className={styles.architectureField}>
          <span>Style</span>
          <select value={recipe.fontStyle ?? 'normal'} onChange={(e) => updateTypographyRecipe(role, 'fontStyle', e.target.value as 'normal' | 'italic')}>
            <option value="normal">normal</option>
            <option value="italic">italic</option>
          </select>
        </label>
      </div>
    );
  };

  const renderSurfaceEditor = (role: keyof ReaderThemeRecipes['surfaces']) => {
    const recipe = readerRecipes.surfaces[role];
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateSurfaceRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(SURFACE_BACKGROUND_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateSurfaceRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(SURFACE_BORDER_OPTIONS, 'color')}
          </select>
        </label>
        {recipe.radius ? (
          <label className={styles.architectureField}>
            <span>Radius</span>
            <select value={recipe.radius} onChange={(e) => updateSurfaceRecipe(role, 'radius', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(RADIUS_OPTIONS, 'radius')}
            </select>
          </label>
        ) : null}
        {recipe.shadow ? (
          <label className={styles.architectureField}>
            <span>Shadow</span>
            <select value={recipe.shadow} onChange={(e) => updateSurfaceRecipe(role, 'shadow', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(SHADOW_OPTIONS, 'shadow')}
            </select>
          </label>
        ) : null}
        {recipe.shadowHover ? (
          <label className={styles.architectureField}>
            <span>Hover shadow</span>
            <select value={recipe.shadowHover} onChange={(e) => updateSurfaceRecipe(role, 'shadowHover', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(SHADOW_OPTIONS, 'shadow')}
            </select>
          </label>
        ) : null}
        {recipe.padding ? (
          <label className={styles.architectureField}>
            <span>Padding</span>
            <select value={recipe.padding} onChange={(e) => updateSurfaceRecipe(role, 'padding', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(PADDING_OPTIONS, 'padding')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderControlEditor = (role: keyof ReaderThemeRecipes['controls']) => {
    if (role === 'focusRing') {
      return (
        <div className={styles.componentRecipeEditor}>
          <label className={styles.architectureField}>
            <span>Color</span>
            <select value={readerRecipes.controls.focusRing.color} onChange={(e) => updateFocusRingRecipe(e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(COLOR_ROLE_OPTIONS, 'color')}
            </select>
            <small className={styles.fieldHint}>{FIELD_HINTS.focusRing}</small>
          </label>
        </div>
      );
    }

    if (role === 'inlineLink') {
      const recipe = readerRecipes.controls.inlineLink;
      return (
        <div className={styles.componentRecipeEditor}>
          <label className={styles.architectureField}>
            <span>Text</span>
            <select value={recipe.text} onChange={(e) => updateLinkRecipe('text', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
            </select>
            <small className={styles.fieldHint}>
              {FIELD_HINTS.tonalText} {FIELD_HINTS.accent}
            </small>
          </label>
          <label className={styles.architectureField}>
            <span>Hover text</span>
            <select value={recipe.hoverText ?? CONTROL_TEXT_OPTIONS[0]} onChange={(e) => updateLinkRecipe('hoverText', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
            </select>
            <small className={styles.fieldHint}>
              Keep hover text in the same class family unless the hover background changes the contrast context.
            </small>
          </label>
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground ?? CONTROL_BACKGROUND_OPTIONS[0]} onChange={(e) => updateLinkRecipe('hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
            </select>
          </label>
        </div>
      );
    }

    const recipe = readerRecipes.controls[role];
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateControlRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateControlRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
          </select>
          <small className={styles.fieldHint}>{FIELD_HINTS.contrastOnFill}</small>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateControlRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_BORDER_OPTIONS, 'color')}
          </select>
        </label>
        {recipe.hoverBackground ? (
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground} onChange={(e) => updateControlRecipe(role, 'hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderTagEditor = (role: keyof ReaderThemeRecipes['tags']) => {
    const recipe = readerRecipes.tags[role];
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateTagRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateTagRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
          </select>
          <small className={styles.fieldHint}>
            Tags usually want contrast-on-fill if they read as pills, or tonal text if they sit quietly on the page.
          </small>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateTagRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_BORDER_OPTIONS, 'color')}
          </select>
        </label>
        {recipe.hoverBackground ? (
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground} onChange={(e) => updateTagRecipe(role, 'hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderOverlayEditor = (role: keyof ReaderThemeRecipes['overlays']) => {
    const recipe = readerRecipes.overlays[role];
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateOverlayRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_BACKGROUND_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateOverlayRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
          </select>
          <small className={styles.fieldHint}>{FIELD_HINTS.overlayContrast}</small>
        </label>
        {recipe.border ? (
          <label className={styles.architectureField}>
            <span>Border</span>
            <select value={recipe.border} onChange={(e) => updateOverlayRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
              {renderValueOptions(CONTROL_BORDER_OPTIONS, 'color')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderIconographyEditor = (role: keyof ReaderThemeRecipes['iconography']) => (
    <div className={styles.componentRecipeEditor}>
      <label className={styles.architectureField}>
        <span>Color</span>
        <select value={readerRecipes.iconography[role]} onChange={(e) => updateIconographyRecipe(role, e.target.value as ThemeRecipeTokenRef)}>
          {renderValueOptions(COLOR_ROLE_OPTIONS, 'color')}
        </select>
        <small className={styles.fieldHint}>
          Match icon color to its surface context: tonal for ordinary chrome, contrast-on-fill for strong controls, overlay contrast for media chrome.
        </small>
      </label>
    </div>
  );

  const renderTreatmentEditor = (role: keyof ReaderThemeRecipes['treatments']) => (
    <div className={styles.componentRecipeEditor}>
      <label className={styles.architectureField}>
        <span>Value</span>
        <input
          type="text"
          value={readerRecipes.treatments[role]}
          onChange={(e) => updateTreatmentRecipe(role, e.target.value)}
          className={styles.componentRecipeInput}
        />
      </label>
    </div>
  );

  const renderLayoutEditor = (key: string) => {
    if (!themeData || key !== 'sidebarWidth') {
      return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }

    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Width</span>
          <input
            type="text"
            value={themeData.layout?.sidebarWidth || ''}
            onChange={(e) => handleTokenChange('layout', 'sidebarWidth', e.target.value)}
            className={styles.componentRecipeInput}
          />
          <small className={styles.fieldHint}>
            Use a length value like `320px`, `22rem`, or another token-backed width value when available.
          </small>
        </label>
      </div>
    );
  };

  const renderTokenValueEditor = (key: string) => {
    if (!themeData) {
      return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }

    switch (key) {
      case 'headerBackgroundColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background color</span>
              <input
                type="text"
                value={themeData.components?.header?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'backgroundColor', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a stored color value such as `color1-100` or another header surface reference.
              </small>
            </label>
          </div>
        );
      case 'headerBorderColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border color</span>
              <input
                type="text"
                value={themeData.components?.header?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'borderColor', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a stored color value such as `border1` or another header border reference.
              </small>
            </label>
          </div>
        );
      case 'headerHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Height</span>
              <input
                type="text"
                value={themeData.components?.header?.height || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'height', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a length value like `60px`, `4rem`, or another stored header height value.
              </small>
            </label>
          </div>
        );
      case 'fieldPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Padding</span>
              <input
                type="text"
                value={themeData.components?.input?.padding || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'padding', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a length value like `8px`, `0.75rem`, or a token-backed spacing value if available.
              </small>
            </label>
          </div>
        );
      case 'fieldBorderRadius':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border radius</span>
              <input
                type="text"
                value={themeData.components?.input?.borderRadius || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'borderRadius', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a length value like `8px`, `0.5rem`, or a radius token value.
              </small>
            </label>
          </div>
        );
      case 'storyClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Content padding</span>
              <select
                value={readerRecipes.surfaces.storyCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('storyCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
              <small className={styles.fieldHint}>
                This controls the inset around the closed story title and excerpt without changing other cards.
              </small>
            </label>
          </div>
        );
      case 'storyClosedExcerptLineHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Excerpt line height</span>
              <select
                value={readerRecipes.typography.storyExcerpt.lineHeight}
                onChange={(e) => updateTypographyRecipe('storyExcerpt', 'lineHeight', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
              </select>
              <small className={styles.fieldHint}>
                This tightens or loosens the excerpt text rhythm on closed story cards only.
              </small>
            </label>
          </div>
        );
      case 'questionClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Content padding</span>
              <select
                value={readerRecipes.surfaces.qaCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('qaCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
              <small className={styles.fieldHint}>
                This controls the inset around the covered closed question card title without changing other cards.
              </small>
            </label>
          </div>
        );
      case 'galleryClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Content padding</span>
              <select
                value={readerRecipes.surfaces.galleryCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('galleryCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
              <small className={styles.fieldHint}>
                This controls the inset around the closed gallery card title without changing other cards.
              </small>
            </label>
          </div>
        );
      case 'calloutContentLineHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Content line spacing</span>
              <select
                value={readerRecipes.typography.calloutBody.lineHeight}
                onChange={(e) => updateTypographyRecipe('calloutBody', 'lineHeight', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
              </select>
              <small className={styles.fieldHint}>
                This controls the line spacing for the callout body content only.
              </small>
            </label>
          </div>
        );
      default:
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }
  };

  const renderBindingEditor = (kind: string, key: string) => {
    switch (kind) {
      case 'typography':
        return renderTypographyEditor(key as keyof ReaderThemeRecipes['typography']);
      case 'surface':
        return renderSurfaceEditor(key as keyof ReaderThemeRecipes['surfaces']);
      case 'control':
        return renderControlEditor(key as keyof ReaderThemeRecipes['controls']);
      case 'tag':
        return renderTagEditor(key as keyof ReaderThemeRecipes['tags']);
      case 'overlay':
        return renderOverlayEditor(key as keyof ReaderThemeRecipes['overlays']);
      case 'iconography':
        return renderIconographyEditor(key as keyof ReaderThemeRecipes['iconography']);
      case 'treatment':
        return renderTreatmentEditor(key as keyof ReaderThemeRecipes['treatments']);
      case 'layout':
        return renderLayoutEditor(key);
      case 'token':
        return renderTokenValueEditor(key);
      default:
        return null;
    }
  };

  const renderBindingSummary = (kind: string, key: string) => {
    switch (kind) {
      case 'typography': {
        const recipe = readerRecipes.typography[key as keyof ReaderThemeRecipes['typography']];
        if (!recipe) return <span className={styles.architectureEmptyState}>Unavailable</span>;
        return (
          <div className={styles.architectureRecipe}>
            <code>{formatTokenRef(recipe.family)}</code>
            <code>{formatTokenRef(recipe.size)}</code>
            <code>{formatTokenRef(recipe.weight)}</code>
            <code>{formatTokenRef(recipe.lineHeight)}</code>
            <code>{formatTokenRef(recipe.color)}</code>
            {recipe.fontStyle ? <code>{recipe.fontStyle}</code> : null}
          </div>
        );
      }
      case 'surface': {
        const recipe = readerRecipes.surfaces[key as keyof ReaderThemeRecipes['surfaces']];
        if (!recipe) return <span className={styles.architectureEmptyState}>Unavailable</span>;
        return (
          <div className={styles.architectureRecipe}>
            <code>{formatTokenRef(recipe.background)}</code>
            <code>{formatTokenRef(recipe.border)}</code>
            {recipe.radius ? <code>{formatTokenRef(recipe.radius)}</code> : null}
            {recipe.shadow ? <code>{formatTokenRef(recipe.shadow)}</code> : null}
            {recipe.shadowHover ? <code>{formatTokenRef(recipe.shadowHover)}</code> : null}
            {recipe.padding ? <code>{formatTokenRef(recipe.padding)}</code> : null}
          </div>
        );
      }
      case 'control': {
        const recipe = readerRecipes.controls[key as keyof ReaderThemeRecipes['controls']];
        if (!recipe) return <span className={styles.architectureEmptyState}>Unavailable</span>;
        if ('color' in recipe) {
          return (
            <div className={styles.architectureRecipe}>
              <code>{formatTokenRef(recipe.color)}</code>
            </div>
          );
        }
        return (
          <div className={styles.architectureRecipe}>
            {'background' in recipe ? <code>{formatTokenRef(recipe.background)}</code> : null}
            {'text' in recipe ? <code>{formatTokenRef(recipe.text)}</code> : null}
            {'border' in recipe ? <code>{formatTokenRef(recipe.border)}</code> : null}
            {'hoverBackground' in recipe && recipe.hoverBackground ? <code>{formatTokenRef(recipe.hoverBackground)}</code> : null}
            {'hoverText' in recipe && recipe.hoverText ? <code>{formatTokenRef(recipe.hoverText)}</code> : null}
          </div>
        );
      }
      case 'tag': {
        const recipe = readerRecipes.tags[key as keyof ReaderThemeRecipes['tags']];
        if (!recipe) return <span className={styles.architectureEmptyState}>Unavailable</span>;
        return (
          <div className={styles.architectureRecipe}>
            <code>{formatTokenRef(recipe.background)}</code>
            <code>{formatTokenRef(recipe.text)}</code>
            <code>{formatTokenRef(recipe.border)}</code>
            {recipe.hoverBackground ? <code>{formatTokenRef(recipe.hoverBackground)}</code> : null}
          </div>
        );
      }
      case 'overlay': {
        const recipe = readerRecipes.overlays[key as keyof ReaderThemeRecipes['overlays']];
        if (!recipe) return <span className={styles.architectureEmptyState}>Unavailable</span>;
        return (
          <div className={styles.architectureRecipe}>
            <code>{formatTokenRef(recipe.background)}</code>
            <code>{formatTokenRef(recipe.text)}</code>
            {recipe.border ? <code>{formatTokenRef(recipe.border)}</code> : null}
          </div>
        );
      }
      case 'iconography':
        return (
          <div className={styles.architectureRecipe}>
            <code>{formatTokenRef(readerRecipes.iconography[key as keyof ReaderThemeRecipes['iconography']])}</code>
          </div>
        );
      case 'treatment':
        return (
          <div className={styles.architectureRecipe}>
            <code>{readerRecipes.treatments[key as keyof ReaderThemeRecipes['treatments']]}</code>
          </div>
        );
      case 'layout':
        return (
          <div className={styles.architectureRecipe}>
            <code>{themeData?.layout?.sidebarWidth || 'Unset'}</code>
          </div>
        );
      case 'token':
        return (
          <div className={styles.architectureRecipe}>
            <code>
              {key === 'headerBackgroundColor'
                ? (themeData?.components?.header?.backgroundColor || 'Unset')
                : key === 'headerBorderColor'
                  ? (themeData?.components?.header?.borderColor || 'Unset')
                  : key === 'headerHeight'
                    ? (themeData?.components?.header?.height || 'Unset')
                : key === 'fieldPadding'
                ? (themeData?.components?.input?.padding || 'Unset')
                : key === 'fieldBorderRadius'
                  ? (themeData?.components?.input?.borderRadius || 'Unset')
                  : key === 'storyClosedPadding'
                    ? (readerRecipes.surfaces.storyCardClosed.padding || 'Unset')
                    : key === 'storyClosedExcerptLineHeight'
                      ? (readerRecipes.typography.storyExcerpt.lineHeight || 'Unset')
                      : key === 'questionClosedPadding'
                        ? (readerRecipes.surfaces.qaCardClosed.padding || 'Unset')
                        : key === 'galleryClosedPadding'
                          ? (readerRecipes.surfaces.galleryCardClosed.padding || 'Unset')
                        : key === 'calloutContentLineHeight'
                          ? (readerRecipes.typography.calloutBody.lineHeight || 'Unset')
                  : 'Unset'}
            </code>
          </div>
        );
      default:
        return null;
    }
  };

  const [selectedKind, selectedKey] = selectedRecipeId.split(':') as [string, string];
  const selectedComponent = orderedReaderComponents.find((component) => component.id === selectedComponentId)
    ?? orderedReaderComponents[0];
  const selectedVariant = selectedComponent?.variants.find((variant) => variant.id === selectedVariantId)
    ?? selectedComponent?.variants[0];
  const selectedVariantElements: DisplayElement[] = (() => {
    if (!selectedComponent || !selectedVariant) return [];

    const baseElements: DisplayElement[] = selectedVariant.elements.map((element) => ({
      id: element.id,
      label: element.label,
      description: element.description,
      binding: {
        kind: element.binding.kind,
        key: element.binding.key,
      },
    }));

    if (selectedComponent.id === 'chrome' && selectedVariant.id === 'sidebar') {
      return [
        ...baseElements,
        {
          id: 'width',
          label: 'Sidebar width',
          description: 'The desktop sidebar width for reader chrome.',
          binding: {
            kind: 'layout',
            key: 'sidebarWidth',
          },
        },
      ];
    }

    if (selectedComponent.id === 'field' && selectedVariant.id === 'controls') {
      return [
        ...baseElements,
        {
          id: 'padding',
          label: 'Field padding',
          description: 'Shared padding for neutral field-style controls.',
          binding: {
            kind: 'token',
            key: 'fieldPadding',
          },
        },
        {
          id: 'borderRadius',
          label: 'Field border radius',
          description: 'Shared corner radius for neutral field-style controls.',
          binding: {
            kind: 'token',
            key: 'fieldBorderRadius',
          },
        },
      ];
    }

    return baseElements;
  })();
  const selectedElement = selectedVariantElements.find((element) => `${element.binding.kind}:${element.binding.key}` === selectedRecipeId)
    ?? selectedVariantElements[0];
  const selectedSurface = selectedComponent && selectedVariant
    ? SURFACE_LABELS[`${selectedComponent.id}.${selectedVariant.id}`]
    : null;
  const selectedComponentBehaviorNote = selectedComponent ? COMPONENT_BEHAVIOR_NOTES[selectedComponent.id] : null;
  const selectedVariantBehaviorNote = selectedVariant ? VARIANT_BEHAVIOR_NOTES[selectedVariant.id] : null;
  const isPrimarySelectedComponent = selectedComponent ? PRIMARY_COMPONENT_IDS.includes(selectedComponent.id as (typeof PRIMARY_COMPONENT_IDS)[number]) : false;
  const selectedAttributeLabel = selectedComponent && selectedVariant && selectedElement
    ? getAttributeLabel(selectedComponent.id, selectedVariant.id, selectedElement.id, selectedElement.label)
    : formatBindingKeyLabel(selectedKey);

  const workspaceColumns = `minmax(${MIN_SYSTEM_PANE_WIDTH}px, 1fr) minmax(${MIN_ADVANCED_PANE_WIDTH}px, 1fr)`;

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerActions}>
            <div className={`${styles.draftStatus} ${isDraftDirty || hasDraftThemeCss ? styles.draftStatusActive : ''}`}>
              {isDraftDirty || hasDraftThemeCss ? 'Draft active in app' : 'Saved theme live'}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.secondaryActionButton}
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            <button
              type="button"
              onClick={discardDraft}
              disabled={!isDraftDirty}
              className={styles.secondaryActionButton}
            >
              Discard Draft
            </button>
            <button 
              onClick={saveTheme}
              disabled={saving || !THEME_SAVE_ENABLED}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : THEME_SAVE_ENABLED ? 'Save Theme' : 'Save Paused'}
            </button>
          </div>
        </div>
        <div className={styles.workspaceStateBar} role="status" aria-live="polite">
          <div className={styles.workspaceStateItem}>
            <span className={styles.workspaceStateLabel}>Mode</span>
            <strong className={styles.workspaceStateValue}>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
            <span className={styles.workspaceStateDetail}>You are previewing the live app in this mode.</span>
          </div>
          <div className={styles.workspaceStateItem}>
            <span className={styles.workspaceStateLabel}>Started From</span>
            <strong className={styles.workspaceStateValue}>{savedReaderPresetLabel}</strong>
            <span className={styles.workspaceStateDetail}>This is the saved reader theme currently on record.</span>
          </div>
          <div className={styles.workspaceStateItem}>
            <span className={styles.workspaceStateLabel}>Current Draft</span>
            <strong className={styles.workspaceStateValue}>{currentDraftPresetLabel}</strong>
            <span className={styles.workspaceStateDetail}>Recipe or token edits move the draft to Custom.</span>
          </div>
          <div className={styles.workspaceStateItem}>
            <span className={styles.workspaceStateLabel}>{draftStatusLabel}</span>
            <strong className={styles.workspaceStateValue}>{isDraftDirty || hasDraftThemeCss ? 'Not Saved Yet' : 'Up To Date'}</strong>
            <span className={styles.workspaceStateDetail}>{draftStatusDetail}</span>
          </div>
          <div className={styles.workspaceStateItem}>
            <span className={styles.workspaceStateLabel}>Save Target</span>
            <strong className={styles.workspaceStateValue}>Active Reader Theme</strong>
            <span className={styles.workspaceStateDetail}>{saveTargetDetail}</span>
          </div>
        </div>
        {saveNotice ? (
          <div
            className={`${styles.saveNotice} ${
              saveNotice.type === 'success'
                ? styles.saveNoticeSuccess
                : saveNotice.type === 'warning'
                  ? styles.saveNoticeWarning
                  : styles.saveNoticeError
            }`}
            role={saveNotice.type === 'error' || saveNotice.type === 'warning' ? 'alert' : 'status'}
            aria-live={saveNotice.type === 'success' ? 'polite' : 'assertive'}
          >
            <strong>{saveNotice.message}</strong>
            {saveNotice.detail ? <span>{saveNotice.detail}</span> : null}
          </div>
        ) : null}
      </div>

      <main className={styles.mainContent}>
        <div
          ref={workspaceRef}
          className={styles.themeWorkspaceGrid}
          style={isNarrowWorkspace ? undefined : { gridTemplateColumns: workspaceColumns }}
        >
          <section className={`${styles.architectureWorkbench} ${styles.systemPane}`}>
            <div className={styles.architectureHeader}>
              <h2 className={styles.architectureTitle}>Theme</h2>
            </div>
            <div className={styles.paneBody}>
              <section className={styles.architectureCard}>
                <div className={styles.presetGrid}>
                  {READER_PRESET_IDS.map((presetId) => {
                    const presetMeta = THEME_PRESET_META[presetId];
                    const isActive = activePresetId === presetId;
                    return (
                      <article
                        key={presetId}
                        className={`${styles.presetCard} ${isActive ? styles.presetCardActive : ''}`}
                      >
                        <h3 className={styles.presetCardTitle}>{presetMeta.label}</h3>
                        <p className={styles.presetCardText}>{presetMeta.description}</p>
                        <button
                          type="button"
                          className={styles.presetApplyButton}
                          onClick={() => applyReaderPreset(presetId)}
                          disabled={isActive}
                        >
                          {isActive ? 'Applied to Draft' : 'Apply to Draft'}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <div className={styles.presetStatus}>
                  <strong>{activePresetId === 'custom' ? 'Custom' : THEME_PRESET_META[activePresetId].label}</strong>
                  <span>Recipe or token edits after preset application move the working draft back to Custom.</span>
                </div>
              </section>
              <section className={styles.architectureCard}>
                <div className={styles.componentSelectorGroups}>
                  <section className={styles.componentSelectorGroup}>
                    <div className={styles.componentSelectorGroupHeader}>
                      <strong>Components</strong>
                      <span>Start with the main app pieces. These are the first workbench components in the new model.</span>
                    </div>
                    <div className={styles.componentSelectorColumn}>
                      {primaryReaderComponents.map((component) => (
                        <button
                          key={component.id}
                          type="button"
                          className={component.id === selectedComponentId ? styles.componentSelectorActive : styles.componentSelectorButton}
                          onClick={() => {
                            setSelectedComponentId(component.id);
                            setSelectedVariantId(component.variants[0]?.id ?? '');
                          }}
                        >
                          <strong>{COMPONENT_TAB_LABELS[component.id] ?? component.label}</strong>
                          <span>{PRIMARY_COMPONENT_DESCRIPTIONS[component.id] ?? component.description}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  {secondaryReaderComponents.length ? (
                    <section className={styles.componentSelectorGroup}>
                      <div className={styles.componentSelectorGroupHeader}>
                        <strong>Later Wave</strong>
                        <span>These components remain available, but the current refactor is centered on the first four above.</span>
                      </div>
                      <div className={styles.componentSelectorRow}>
                        {secondaryReaderComponents.map((component) => (
                          <button
                            key={component.id}
                            type="button"
                            className={component.id === selectedComponentId ? styles.componentSelectorActive : styles.componentSelectorButton}
                            onClick={() => {
                              setSelectedComponentId(component.id);
                              setSelectedVariantId(component.variants[0]?.id ?? '');
                            }}
                          >
                            {COMPONENT_TAB_LABELS[component.id] ?? component.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
                <div className={styles.componentEditorPanel}>
                  <div className={styles.componentEditorHeader}>
                    <strong>Attribute editor</strong>
                    <span>{selectedAttributeLabel}</span>
                  </div>
                  {selectedComponentBehaviorNote || selectedVariantBehaviorNote ? (
                    <div className={styles.componentBehaviorNotes}>
                      {selectedComponentBehaviorNote ? (
                        <span><strong>Component:</strong> {selectedComponentBehaviorNote}</span>
                      ) : null}
                      {selectedVariantBehaviorNote ? (
                        <span><strong>Variant:</strong> {selectedVariantBehaviorNote}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedSurface ? (
                    <div className={styles.componentEditorMeta}>
                      <span className={styles.componentEditorSurface}>Surface: {selectedSurface}</span>
                      {selectedVariant ? <span>Variant: {selectedVariant.label}</span> : null}
                    </div>
                  ) : null}
                  <div className={styles.componentEditorActions}>
                    <button
                      type="button"
                      className={styles.componentRecipeToggle}
                      onClick={() => setShowRecipeEditor((prev) => !prev)}
                    >
                      {showRecipeEditor ? 'Hide value selectors' : 'Show value selectors'}
                    </button>
                  </div>
                  <div className={styles.componentRecipeSummary}>
                    {renderBindingSummary(selectedKind, selectedKey)}
                  </div>
                  {showRecipeEditor ? renderBindingEditor(selectedKind, selectedKey) : null}
                </div>
                <div className={styles.componentInventory}>
                  {selectedComponent ? (
                    <section key={selectedComponent.id} className={styles.componentSection}>
                      <div className={styles.componentSectionHeader}>
                        <div>
                          <h4 className={styles.componentTitle}>{COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label}</h4>
                          <p className={styles.componentDescription}>{selectedComponent.description}</p>
                        </div>
                      </div>

                      {selectedComponent.variants.length > 1 ? (
                        <div className={styles.componentVariantTabs}>
                          {selectedComponent.variants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              className={variant.id === selectedVariant?.id ? styles.componentVariantTabActive : styles.componentVariantTab}
                              onClick={() => setSelectedVariantId(variant.id)}
                            >
                              {variant.label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {selectedVariant ? (
                        <div key={selectedVariant.id} className={styles.componentVariantCard}>
                          <div className={styles.componentVariantHeader}>
                            <strong>{isPrimarySelectedComponent ? `${COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label} Attributes` : selectedVariant.label}</strong>
                            {selectedVariant.description ? <span>{selectedVariant.description}</span> : null}
                            {selectedComponent.variants.length > 1 && selectedVariantBehaviorNote ? <span>{selectedVariantBehaviorNote}</span> : null}
                          </div>
                          {isPrimarySelectedComponent ? (
                            <div className={styles.componentAttributeGrid}>
                              {selectedVariantElements.map((element) => (
                                <article
                                  key={element.id}
                                  className={`${styles.componentAttributeCard} ${
                                    selectedRecipeId === `${element.binding.kind}:${element.binding.key}` ? styles.componentAttributeCardSelected : ''
                                  }`}
                                >
                                  <div className={styles.componentAttributeHeader}>
                                    <strong>
                                      {getAttributeLabel(selectedComponent.id, selectedVariant.id, element.id, element.label)}
                                    </strong>
                                    <span>{getAttributeValueTypeLabel(selectedComponent.id, selectedVariant.id, element.id, element.binding.kind)}</span>
                                  </div>
                                  {element.description ? (
                                    <p className={styles.componentAttributeNote}>{element.description}</p>
                                  ) : null}
                                  <div className={styles.componentAttributeSummary}>
                                    {renderBindingSummary(element.binding.kind, element.binding.key)}
                                  </div>
                                  <div className={styles.componentAttributeActions}>
                                    <button
                                      type="button"
                                      className={styles.componentBindingButton}
                                      onClick={() => {
                                        setSelectedRecipeId(`${element.binding.kind}:${element.binding.key}`);
                                        setShowRecipeEditor(true);
                                      }}
                                    >
                                      Edit Attribute
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.componentTableWrap}>
                              <table className={styles.componentTable}>
                                <thead>
                                  <tr>
                                    <th>Attribute</th>
                                    <th>Value Source</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedVariantElements.map((element) => (
                                    <tr
                                      key={element.id}
                                      className={selectedRecipeId === `${element.binding.kind}:${element.binding.key}` ? styles.componentRowSelected : undefined}
                                    >
                                      <td>
                                        <div className={styles.componentElementLabel}>
                                          {getAttributeLabel(selectedComponent.id, selectedVariant.id, element.id, element.label)}
                                        </div>
                                        {element.description ? (
                                          <div className={styles.componentElementNote}>{element.description}</div>
                                        ) : null}
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className={styles.componentBindingButton}
                                          onClick={() => {
                                            setSelectedRecipeId(`${element.binding.kind}:${element.binding.key}`);
                                            setShowRecipeEditor(true);
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <span className={styles.componentBindingLabel}>
                                          {formatBindingKindLabel(element.binding.kind)} / {formatBindingKeyLabel(element.binding.key)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </section>
            </div>
          </section>

          <section className={`${styles.architectureWorkbench} ${styles.advancedPane}`}>
            <div className={styles.architectureHeader}>
              <div>
                <h2 className={styles.architectureTitle}>Values</h2>
              </div>
            </div>
            <div className={`${styles.paneBody} ${styles.advancedPaneBody}`}>
        <section className={`${styles.section} ${styles.advancedSection}`}>
            <div className={styles.sectionHeader}>
              <h2>Colors</h2>
              <div className={styles.paletteControls}>
                <div className={styles.lightDarkVariation}>
                  <label>Dark Mode Shift:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={darkModeShift}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setDarkModeShift(parseInt(e.target.value, 10));
                  }}
                  className={styles.variationInput}
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <div className={styles.paletteMatrix}>
            <div className={styles.paletteRowLabels} aria-hidden="true">
              <div className={styles.paletteRowLabelSpacer} />
              <div className={styles.paletteRowLabelVariants}>
                <div className={styles.paletteRowLabelSection}>
                  <div className={styles.paletteRowLabelSwatch}>Light</div>
                  <div className={styles.paletteRowLabelValueSpacer} />
                </div>
                <div className={styles.paletteRowLabelSection}>
                  <div className={styles.paletteRowLabelSwatch}>Dark</div>
                  <div className={styles.paletteRowLabelValueSpacer} />
                </div>
              </div>
            </div>
            <div className={styles.paletteGrid}>
              {/* Render theme colors (1 and 2) first */}
              {themeData.themeColors?.map((color) => (
                <PaletteColorEditor
                  key={color.id}
                  color={color}
                  onColorChange={handleColorChange}
                  onHslChange={handleHslChange}
                  darkModeShift={darkModeShift}
                />
              ))}
              {/* Render regular palette colors (3-14) - filter out colors 1 and 2 */}
              {themeData.palette.filter(color => color.id > 2).map((color) => (
                <PaletteColorEditor
                  key={color.id}
                  color={color}
                  onColorChange={handleColorChange}
                  onHslChange={handleHslChange}
                  darkModeShift={darkModeShift}
                />
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.advancedSection}`}>
          <h2>Typography & Metrics</h2>
          <div className={styles.tokenGrid4Column}>
            {/* Column 1: Typography */}
            <div className={styles.tokenCategory}>
              <h3>Typography</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Font Families</h4>
                <TokenInput 
                  label="Sans" 
                  value={themeData.typography?.fontFamilies?.sans || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'sans', v)} 
                />
                <TokenInput 
                  label="Serif" 
                  value={themeData.typography?.fontFamilies?.serif || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'serif', v)} 
                />
                <TokenInput 
                  label="Handwriting" 
                  value={themeData.typography?.fontFamilies?.handwriting || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'handwriting', v)} 
                />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Text Colors</h4>
                <ColorReferenceInput label="Primary Text" value={themeData.typography?.textColors?.text1 || ''} onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text1', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Muted Text" value={themeData.typography?.textColors?.text2 || ''} onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text2', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Font Sizes</h4>
                <FontSizeTokenInput label="XS" value={themeData.typography?.fontSizes?.xs || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xs', v)} />
                <FontSizeTokenInput label="SM" value={themeData.typography?.fontSizes?.sm || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'sm', v)} />
                <FontSizeTokenInput label="Base" value={themeData.typography?.fontSizes?.base || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'base', v)} />
                <FontSizeTokenInput label="LG" value={themeData.typography?.fontSizes?.lg || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.typography?.fontSizes?.xl || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xl', v)} />
                <FontSizeTokenInput label="2XL" value={themeData.typography?.fontSizes?.['2xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '2xl', v)} />
                <FontSizeTokenInput label="3XL" value={themeData.typography?.fontSizes?.['3xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '3xl', v)} />
                <FontSizeTokenInput label="4XL" value={themeData.typography?.fontSizes?.['4xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '4xl', v)} />
                <FontSizeTokenInput label="5XL" value={themeData.typography?.fontSizes?.['5xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '5xl', v)} />
                <FontSizeTokenInput label="6XL" value={themeData.typography?.fontSizes?.['6xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '6xl', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Font Weights</h4>
                <FontWeightInput label="Normal" value={themeData.typography?.fontWeights?.normal || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'normal', v)} />
                <FontWeightInput label="Medium" value={themeData.typography?.fontWeights?.medium || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'medium', v)} />
                <FontWeightInput label="Semibold" value={themeData.typography?.fontWeights?.semibold || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'semibold', v)} />
                <FontWeightInput label="Bold" value={themeData.typography?.fontWeights?.bold || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'bold', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Line Heights</h4>
                <FontSizeTokenInput label="Base" value={themeData.typography?.lineHeights?.base || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'base', v)} />
                <FontSizeTokenInput label="Tight" value={themeData.typography?.lineHeights?.tight || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'tight', v)} />
                <FontSizeTokenInput label="Relaxed" value={themeData.typography?.lineHeights?.relaxed || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'relaxed', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Fluid Sizes</h4>
                <ExtendedTokenInput label="Fld1" value={themeData.typography?.fluidFontSizes?.size1 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size1', v)} />
                <ExtendedTokenInput label="Fld2" value={themeData.typography?.fluidFontSizes?.size2 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size2', v)} />
                <ExtendedTokenInput label="Fld3" value={themeData.typography?.fluidFontSizes?.size3 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size3', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Breakpoints</h4>
                <FontSizeTokenInput label="SM" value={themeData.layout?.breakpoints?.sm || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={themeData.layout?.breakpoints?.md || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'md', v)} />
                <FontSizeTokenInput label="LG" value={themeData.layout?.breakpoints?.lg || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.layout?.breakpoints?.xl || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'xl', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Z-Index</h4>
                <FontSizeTokenInput label="Default" value={themeData.zIndex?.default || ''} onChange={(v) => handleTokenChange('zIndex', 'default', v)} />
                <FontSizeTokenInput label="Content" value={themeData.zIndex?.content || ''} onChange={(v) => handleTokenChange('zIndex', 'content', v)} />
                <FontSizeTokenInput label="Sticky" value={themeData.zIndex?.sticky || ''} onChange={(v) => handleTokenChange('zIndex', 'sticky', v)} />
                <FontSizeTokenInput label="Modal Backdrop" value={themeData.zIndex?.modalBackdrop || ''} onChange={(v) => handleTokenChange('zIndex', 'modalBackdrop', v)} />
                <FontSizeTokenInput label="Sidebar" value={themeData.zIndex?.sidebar || ''} onChange={(v) => handleTokenChange('zIndex', 'sidebar', v)} />
                <FontSizeTokenInput label="Header" value={themeData.zIndex?.header || ''} onChange={(v) => handleTokenChange('zIndex', 'header', v)} />
                <FontSizeTokenInput label="Modal" value={themeData.zIndex?.modal || ''} onChange={(v) => handleTokenChange('zIndex', 'modal', v)} />
                <FontSizeTokenInput label="Tooltip" value={themeData.zIndex?.tooltip || ''} onChange={(v) => handleTokenChange('zIndex', 'tooltip', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Gradients</h4>
                <ExtendedTokenInput label="Bottom Overlay" value={themeData.gradients?.bottomOverlay || ''} onChange={(v) => handleTokenChange('gradients', 'bottomOverlay', v)} />
                <ExtendedTokenInput label="Bottom Overlay Strong" value={themeData.gradients?.bottomOverlayStrong || ''} onChange={(v) => handleTokenChange('gradients', 'bottomOverlayStrong', v)} />
              </div>
            </div>

            {/* Column 2: Spacing & Borders */}
            <div className={styles.tokenCategory}>
              <h3>Spacing, Borders & Radius</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Base Spacing Unit</h4>
                <FontSizeTokenInput 
                  label="Unit" 
                  value={themeData.spacing?.unit || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'unit', v)} 
                />
              </div>
              
              <div className={styles.tokenSubsection}>
                <h4>Spacing Steps</h4>
                <SpacingMultiplierInput 
                  label="XS" 
                  value={themeData.spacing?.xsMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'xsMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="SM" 
                  value={themeData.spacing?.smMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'smMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="MD" 
                  value={themeData.spacing?.mdMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'mdMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="LG" 
                  value={themeData.spacing?.lgMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'lgMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="XL" 
                  value={themeData.spacing?.xlMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="2XL" 
                  value={themeData.spacing?.['2xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '2xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="3XL" 
                  value={themeData.spacing?.['3xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '3xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="4XL" 
                  value={themeData.spacing?.['4xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '4xlMultiplier', v)} 
                />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Fluid Spacing Steps</h4>
                <ExtendedTokenInput label="Step 1" value={themeData.spacing?.fluidSpacing?.spacing1 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing1', v)} />
                <ExtendedTokenInput label="Step 2" value={themeData.spacing?.fluidSpacing?.spacing2 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing2', v)} />
                <ExtendedTokenInput label="Step 3" value={themeData.spacing?.fluidSpacing?.spacing3 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing3', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Colors</h4>
                <ColorReferenceInput label="Border Tone 1" value={themeData.borders?.colors?.border1 || ''} onChange={(v) => handleNestedTokenChange('borders', 'colors', 'border1', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Tone 2" value={themeData.borders?.colors?.border2 || ''} onChange={(v) => handleNestedTokenChange('borders', 'colors', 'border2', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Widths</h4>
                <FontSizeTokenInput label="Thin" value={themeData.borders?.widths?.thin || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thin', v)} />
                <FontSizeTokenInput label="Medium" value={themeData.borders?.widths?.medium || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'medium', v)} />
                <FontSizeTokenInput label="Thick" value={themeData.borders?.widths?.thick || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thick', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Radius</h4>
                <FontSizeTokenInput label="SM" value={themeData.borders?.radius?.sm || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={themeData.borders?.radius?.md || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'md', v)} />
                <FontSizeTokenInput label="LG" value={themeData.borders?.radius?.lg || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.borders?.radius?.xl || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'xl', v)} />
                <FontSizeTokenInput label="Full" value={themeData.borders?.radius?.full || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'full', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Box Shadows</h4>
                <FontSizeTokenInput label="Strength (Light)" value={themeData.shadows?.strength || ''} onChange={(v) => handleTokenChange('shadows', 'strength', v)} />
                <FontSizeTokenInput label="Strength (Dark)" value={themeData.shadows?.strengthDark || ''} onChange={(v) => handleTokenChange('shadows', 'strengthDark', v)} />
                <ExtendedTokenInput label="Color" value={themeData.shadows?.color || ''} onChange={(v) => handleTokenChange('shadows', 'color', v)} />
                <ExtendedTokenInput label="SM" value={themeData.shadows?.sm || ''} onChange={(v) => handleTokenChange('shadows', 'sm', v)} />
                <ExtendedTokenInput label="MD" value={themeData.shadows?.md || ''} onChange={(v) => handleTokenChange('shadows', 'md', v)} />
                <ExtendedTokenInput label="LG" value={themeData.shadows?.lg || ''} onChange={(v) => handleTokenChange('shadows', 'lg', v)} />
                <ExtendedTokenInput label="XL" value={themeData.shadows?.xl || ''} onChange={(v) => handleTokenChange('shadows', 'xl', v)} />
              </div>

            </div>

            {/* Column 3: Layout */}
            <div className={styles.tokenCategory}>
              <h3>Sizing & Structure</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Global Surfaces & Sizes</h4>
                <FontSizeTokenInput label="Container Max Width" value={themeData.layout?.containerMaxWidth || ''} onChange={(v) => handleTokenChange('layout', 'containerMaxWidth', v)} />
                <ExtendedTokenInput label="Body Font Family" value={themeData.layout?.bodyFontFamily || ''} onChange={(v) => handleTokenChange('layout', 'bodyFontFamily', v)} />
                <ColorReferenceInput label="Body Background" value={themeData.layout?.bodyBackgroundColor || 'color1-100'} onChange={(v) => handleTokenChange('layout', 'bodyBackgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Surface Tone 1" value={themeData.layout?.background1Color || ''} onChange={(v) => handleTokenChange('layout', 'background1Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Surface Tone 2" value={themeData.layout?.background2Color || ''} onChange={(v) => handleTokenChange('layout', 'background2Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Layout Border Tone 1" value={themeData.layout?.border1Color || ''} onChange={(v) => handleTokenChange('layout', 'border1Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Layout Border Tone 2" value={themeData.layout?.border2Color || ''} onChange={(v) => handleTokenChange('layout', 'border2Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Sidebar Width" value={themeData.layout?.sidebarWidth || ''} onChange={(v) => handleTokenChange('layout', 'sidebarWidth', v)} />
                <FontSizeTokenInput label="Sidebar Width Mobile" value={themeData.layout?.sidebarWidthMobile || ''} onChange={(v) => handleTokenChange('layout', 'sidebarWidthMobile', v)} />
                <FontSizeTokenInput label="Logo Max Height" value={themeData.layout?.logoMaxHeight || ''} onChange={(v) => handleTokenChange('layout', 'logoMaxHeight', v)} />
                <FontSizeTokenInput label="Spinner Size" value={themeData.layout?.spinnerSize || ''} onChange={(v) => handleTokenChange('layout', 'spinnerSize', v)} />
                <FontSizeTokenInput label="Form Min Width" value={themeData.layout?.formMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'formMinWidth', v)} />
                <FontSizeTokenInput label="Button Min Width" value={themeData.layout?.buttonMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'buttonMinWidth', v)} />
                <FontSizeTokenInput label="Icon Min Width" value={themeData.layout?.iconMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'iconMinWidth', v)} />
                <FontSizeTokenInput label="Transition Short" value={themeData.layout?.transitionShort || ''} onChange={(v) => handleTokenChange('layout', 'transitionShort', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Header Primitives</h4>
                <FontSizeTokenInput label="Height" value={themeData.components?.header?.height || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'height', v)} />
                <ColorReferenceInput label="Background" value={themeData.components?.header?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Color" value={themeData.components?.header?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.header?.borderWidth || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'borderWidth', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Field Primitives</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.input?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Color" value={themeData.components?.input?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Focus" value={themeData.components?.input?.borderColorFocus || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderColorFocus', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text Color" value={themeData.components?.input?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.input?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderRadius', v)} />
                <FontSizeTokenInput label="Padding" value={themeData.components?.input?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'padding', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Card Primitives</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.card?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Padding" value={themeData.components?.card?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'padding', v)} />
                                  <ColorReferenceInput label="Border Color" value={themeData.components?.card?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.card?.borderWidth || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderWidth', v)} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.card?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderRadius', v)} />
                <ExtendedTokenInput label="Shadow" value={themeData.components?.card?.shadow || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'shadow', v)} />
                <ExtendedTokenInput label="Shadow Hover" value={themeData.components?.card?.shadowHover || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'shadowHover', v)} />
              </div>

            </div>

            {/* Column 4: Components */}
            <div className={styles.tokenCategory}>
              <h3>Shared Component Values</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Link Values</h4>
                <ColorReferenceInput label="Text Color" value={themeData.components?.link?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text Color Hover" value={themeData.components?.link?.textColorHover || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'textColorHover', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Decoration Hover" value={themeData.components?.link?.decorationHover || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'decorationHover', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Tag Values</h4>
                <FontSizeTokenInput label="Padding" value={themeData.components?.tag?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'padding', v)} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.tag?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'borderRadius', v)} />
                <FontWeightInput label="Font Weight" value={themeData.components?.tag?.fontWeight || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'fontWeight', v)} />
                <FontSizeTokenInput label="Font Size" value={themeData.components?.tag?.fontSize || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'fontSize', v)} />
                <TokenInput label="Font Family" value={themeData.components?.tag?.fontFamily || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'fontFamily', v)} />
                <ColorReferenceInput label="Text Color" value={themeData.components?.tag?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Tag Backgrounds</h4>
                <ColorReferenceInput label="Who BG" value={themeData.components?.tag?.backgrounds?.who || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'who', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="What BG" value={themeData.components?.tag?.backgrounds?.what || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'what', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="When BG" value={themeData.components?.tag?.backgrounds?.when || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'when', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Where BG" value={themeData.components?.tag?.backgrounds?.where || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'where', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>State Surfaces</h4>
                <p style={{fontSize: '12px', color: 'var(--text2-color)', marginBottom: '8px'}}>Enter color number (11-14) for each state</p>
                <StateColorInput label="Success BG" value={themeData.states?.success?.backgroundColor || '11'} onChange={(v) => handleNestedTokenChange('states', 'success', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Success Border" value={themeData.states?.success?.borderColor || '11'} onChange={(v) => handleNestedTokenChange('states', 'success', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Error BG" value={themeData.states?.error?.backgroundColor || '12'} onChange={(v) => handleNestedTokenChange('states', 'error', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Error Border" value={themeData.states?.error?.borderColor || '12'} onChange={(v) => handleNestedTokenChange('states', 'error', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Warning BG" value={themeData.states?.warning?.backgroundColor || '13'} onChange={(v) => handleNestedTokenChange('states', 'warning', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Warning Border" value={themeData.states?.warning?.borderColor || '13'} onChange={(v) => handleNestedTokenChange('states', 'warning', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Info BG" value={themeData.states?.info?.backgroundColor || '14'} onChange={(v) => handleNestedTokenChange('states', 'info', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Info Border" value={themeData.states?.info?.borderColor || '14'} onChange={(v) => handleNestedTokenChange('states', 'info', 'borderColor', v)} colors={themeData.palette} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Solid Button Values</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.button?.solid?.backgroundColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Background Hover" value={themeData.components?.button?.solid?.backgroundColorHover || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'backgroundColorHover', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border" value={themeData.components?.button?.solid?.borderColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text" value={themeData.components?.button?.solid?.textColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Outline Button Values</h4>
                <ColorReferenceInput label="Border" value={themeData.components?.button?.outline?.borderColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text" value={themeData.components?.button?.outline?.textColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.button?.outline?.borderWidth || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'borderWidth', v)} />
              </div>
            </div>
          </div>
        </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
