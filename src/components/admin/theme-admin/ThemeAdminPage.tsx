'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ThemeAdmin.module.css';
import {
  StructuredThemeData,
  BaseColor,
  ThemeColor,
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
type NavigatorSectionId = 'core' | 'cards' | 'systems';

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
type ValueDetailRow = {
  label: string;
  token: string;
  actual: string;
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

const getNestedValue = (value: unknown, path: string[]): string | null => {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : null;
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
  storyCard: 'Story Card',
  galleryCard: 'Gallery Card',
  qaCard: 'Question Card',
  discoverySupport: 'Discovery',
  quoteCard: 'Quote Card',
  calloutCard: 'Callout Card',
};

const COMPONENT_ORDER = [
  'canvas',
  'header',
  'chrome',
  'feedback',
  'field',
  'discoverySupport',
  'storyCard',
  'galleryCard',
  'qaCard',
  'quoteCard',
  'calloutCard',
] as const;

const CORE_READER_COMPONENT_IDS = ['canvas', 'header', 'chrome', 'feedback'] as const;
const READER_CONTROL_COMPONENT_IDS = ['field', 'discoverySupport'] as const;
const CARD_COMPONENT_IDS = ['storyCard', 'galleryCard', 'qaCard', 'quoteCard', 'calloutCard'] as const;

const LEFT_PANE_COMPONENT_DESCRIPTIONS: Record<string, string> = {
  canvas: 'Page background, text, links, and focus treatment.',
  header: 'Top app bar: background, border, height, text, and icon.',
  chrome: 'Reader navigation, filters, and sidebar chrome.',
  feedback: 'Reader notices, empty states, and feedback actions.',
  field: 'Shared field and selector styling used across reader controls.',
  discoverySupport: 'Shared discovery surface and supporting discovery content.',
  storyCard: 'Story card styling across closed, open, and discovery views.',
  galleryCard: 'Gallery card styling across closed, open, and discovery views.',
  qaCard: 'Question card styling across closed, open, and discovery views.',
  quoteCard: 'Quote card styling in the closed reader feed.',
  calloutCard: 'Callout card styling in the closed reader feed.',
};
const getNavigatorSectionForComponent = (componentId: string): NavigatorSectionId => {
  if (CORE_READER_COMPONENT_IDS.includes(componentId as (typeof CORE_READER_COMPONENT_IDS)[number])) return 'core';
  if (CARD_COMPONENT_IDS.includes(componentId as (typeof CARD_COMPONENT_IDS)[number])) return 'cards';
  return 'systems';
};

const BINDING_KIND_LABELS: Record<string, string> = {
  typography: 'Typography',
  surface: 'Surface',
  control: 'Control',
  tag: 'Tag',
  overlay: 'Overlay',
  iconography: 'Icon',
  treatment: 'Treatment',
  token: 'Component Value',
  layout: 'Layout',
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
  'field.controls.label': 'Shared Label Color',
  'field.controls.meta': 'Shared Meta Color',
  'field.controls.hint': 'Shared Hint Color',
  'field.controls.control': 'Neutral Control Surface',
  'field.controls.controlText': 'Shared Control Text',
  'field.controls.controlStrong': 'Selected Control Surface',
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
  'storyCard.closed.contentPadding': 'Card Padding',
  'storyCard.closed.title': 'Title',
  'storyCard.closed.overlayTitle': 'Overlay Title',
  'storyCard.closed.excerpt': 'Excerpt',
  'storyCard.closed.excerptLineHeight': 'Excerpt Line Spacing',
  'storyCard.discovery.title': 'Compact Title',
  'storyCard.discovery.excerpt': 'Excerpt',
  'storyCard.discovery.meta': 'Meta',
  'galleryCard.closed.surface': 'Surface',
  'galleryCard.closed.contentPadding': 'Card Padding',
  'galleryCard.closed.title': 'Title',
  'galleryCard.closed.overlayTitle': 'Overlay Title',
  'galleryCard.discovery.sectionTitle': 'Section Title',
  'galleryCard.discovery.title': 'Compact Title',
  'galleryCard.discovery.caption': 'Caption',
  'galleryCard.discovery.meta': 'Group/Meta Text',
  'qaCard.closed.surface': 'Surface',
  'qaCard.closed.contentPadding': 'Card Padding',
  'qaCard.closed.question': 'Question',
  'qaCard.closed.overlayQuestion': 'Overlay Question',
  'qaCard.closed.excerpt': 'Answer Preview',
  'qaCard.discovery.question': 'Compact Question',
  'qaCard.discovery.excerpt': 'Answer Preview',
  'discoverySupport.discovery.surface': 'Shared Surface',
  'discoverySupport.discovery.sectionTitle': 'Section Title',
  'discoverySupport.discovery.meta': 'Group/Meta Text',
  'discoverySupport.childRail.sectionTitle': 'Rail Section Title',
  'discoverySupport.childRail.countMeta': 'Rail Count/Meta',
  'discoverySupport.childRail.cardTitle': 'Rail Card Title',
  'calloutCard.closed.contentLineHeight': 'Body Line Spacing',
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
  'chrome.sidebar.activeTab': 'Shared control values',
  'chrome.sidebar.filterChip': 'Color values',
  'chrome.sidebar.inlineLink': 'Color values',
  'chrome.sidebar.icon': 'Color values',
  'chrome.sidebar.width': 'Width values',
  'field.controls.label': 'Shared typography values',
  'field.controls.meta': 'Shared typography values',
  'field.controls.hint': 'Shared typography values',
  'field.controls.control': 'Shared control values',
  'field.controls.controlText': 'Shared typography values',
  'field.controls.controlStrong': 'Shared control values',
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
  'storyCard.discovery.title': 'Typography values',
  'storyCard.discovery.excerpt': 'Typography values',
  'storyCard.discovery.meta': 'Typography values',
  'galleryCard.closed.surface': 'Color values',
  'galleryCard.closed.contentPadding': 'Padding values',
  'galleryCard.closed.title': 'Typography values',
  'galleryCard.closed.overlayTitle': 'Typography values',
  'galleryCard.discovery.sectionTitle': 'Typography values',
  'galleryCard.discovery.title': 'Typography values',
  'galleryCard.discovery.caption': 'Typography values',
  'galleryCard.discovery.meta': 'Typography values',
  'qaCard.closed.surface': 'Color values',
  'qaCard.closed.contentPadding': 'Padding values',
  'qaCard.closed.question': 'Typography values',
  'qaCard.closed.overlayQuestion': 'Typography values',
  'qaCard.closed.excerpt': 'Typography values',
  'qaCard.discovery.question': 'Typography values',
  'qaCard.discovery.excerpt': 'Typography values',
  'discoverySupport.discovery.surface': 'Color values',
  'discoverySupport.discovery.sectionTitle': 'Typography values',
  'discoverySupport.discovery.meta': 'Typography values',
  'discoverySupport.childRail.sectionTitle': 'Typography values',
  'discoverySupport.childRail.countMeta': 'Typography values',
  'discoverySupport.childRail.cardTitle': 'Typography values',
  'calloutCard.closed.contentLineHeight': 'Line spacing values',
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
  description: 'Top app header using local height, background, border, text, and icon values.',
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
          description: 'Header text color value for back links, title treatment, and menu links.',
          binding: { kind: 'token', key: 'headerTextColor' },
        },
        {
          id: 'iconColor',
          label: 'Header icon',
          description: 'Header icon color value for the hamburger and related header icons.',
          binding: { kind: 'token', key: 'headerIconColor' },
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
  'discoverySupport.discovery': 'Discovery / shared surface and headings',
  'discoverySupport.childRail': 'Discovery / supporting rail',
  'storyCard.closed': 'Story Card / closed state',
  'storyCard.open': 'Story Card / open state',
  'storyCard.discovery': 'Discovery / story content',
  'galleryCard.closed': 'Gallery Card / closed state',
  'galleryCard.open': 'Gallery Card / open state',
  'galleryCard.discovery': 'Discovery / gallery content',
  'qaCard.closed': 'Question Card / closed state',
  'qaCard.open': 'Question Card / open state',
  'qaCard.discovery': 'Discovery / question content',
  'quoteCard.closed': 'Quote Card / closed state',
  'calloutCard.closed': 'Callout Card / closed state',
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

// Main Theme Admin Component
export default function ThemeAdminPage() {
  const router = useRouter();
  const { applyDraftThemeCss, clearDraftThemeCss, hasDraftThemeCss, theme, toggleTheme } = useTheme();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [themeData, setThemeData] = useState<StructuredThemeData | null>(null);
  const [adminThemeData, setAdminThemeData] = useState<StructuredThemeData | null>(null);
  const [readerRecipes, setReaderRecipes] = useState<ReaderThemeRecipes>(DEFAULT_READER_THEME_RECIPES);
  const [selectedComponentId, setSelectedComponentId] = useState<string>(CORE_READER_COMPONENT_IDS[0]);
  const [selectedNavigatorSection, setSelectedNavigatorSection] = useState<NavigatorSectionId>('core');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('closed');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(DEFAULT_SELECTED_RECIPE);
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

  const coreReaderComponents = useMemo(() => CORE_READER_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);

  const readerControlComponents = useMemo(() => READER_CONTROL_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);

  const cardComponents = useMemo(() => CARD_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);
  const visibleNavigatorComponents = useMemo(() => {
    if (selectedNavigatorSection === 'core') return coreReaderComponents;
    if (selectedNavigatorSection === 'cards') return cardComponents;
    return readerControlComponents;
  }, [cardComponents, coreReaderComponents, readerControlComponents, selectedNavigatorSection]);

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

  const draftActive = isDraftDirty || hasDraftThemeCss;
  const activeThemeLabel = activePresetId === 'custom'
    ? 'Custom draft'
    : `${THEME_PRESET_META[activePresetId].label} draft`;
  const themeStatusDetail = draftActive
    ? 'Unsaved changes are applied to the live app in this session.'
    : 'No unsaved changes.';

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
      case 'headerTextColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Header text color</span>
              <input
                type="text"
                value={themeData.components?.header?.textColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'textColor', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a stored color value such as `color2-300` or another header text reference.
              </small>
            </label>
          </div>
        );
      case 'headerIconColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Header icon color</span>
              <input
                type="text"
                value={themeData.components?.header?.iconColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'iconColor', e.target.value)}
                className={styles.componentRecipeInput}
              />
              <small className={styles.fieldHint}>
                Use a stored color value such as `color2-300` or another header icon reference.
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
              <span>Card padding</span>
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
              <span>Excerpt line spacing</span>
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
              <span>Card padding</span>
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
              <span>Card padding</span>
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
                : key === 'headerTextColor'
                  ? (themeData?.components?.header?.textColor || 'Unset')
                  : key === 'headerIconColor'
                    ? (themeData?.components?.header?.iconColor || 'Unset')
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

  const resolveValueReference = (value: string): string => {
    if (!value) return 'Unset';
    if (value.startsWith('font-family/')) {
      const token = value.replace('font-family/', '') as keyof StructuredThemeData['typography']['fontFamilies'];
      return themeData?.typography?.fontFamilies?.[token] || 'Unavailable';
    }
    if (value.startsWith('font-size/')) {
      const token = value.replace('font-size/', '') as keyof StructuredThemeData['typography']['fontSizes'];
      return themeData?.typography?.fontSizes?.[token] || 'Unavailable';
    }
    if (value.startsWith('font-weight/')) {
      const token = value.replace('font-weight/', '') as keyof StructuredThemeData['typography']['fontWeights'];
      return themeData?.typography?.fontWeights?.[token] || 'Unavailable';
    }
    if (value.startsWith('line-height/')) {
      const token = value.replace('line-height/', '') as keyof StructuredThemeData['typography']['lineHeights'];
      return themeData?.typography?.lineHeights?.[token] || 'Unavailable';
    }
    if (value.startsWith('spacing/')) {
      const token = value.replace('spacing/', '') as keyof StructuredThemeData['spacing'];
      return themeData?.spacing?.[token] as string || 'Unavailable';
    }
    if (value.startsWith('border/radius/')) {
      const token = value.replace('border/radius/', '') as keyof StructuredThemeData['borders']['radius'];
      return themeData?.borders?.radius?.[token] || 'Unavailable';
    }
    if (value.startsWith('shadow/')) {
      const token = value.replace('shadow/', '') as keyof StructuredThemeData['shadows'];
      return themeData?.shadows?.[token] as string || 'Unavailable';
    }
    if (value.startsWith('layout/')) {
      const token = value.replace('layout/', '') as keyof StructuredThemeData['layout'];
      return themeData?.layout?.[token] as string || 'Unavailable';
    }
    if (value.startsWith('component/')) {
      const resolved = getNestedValue(themeData?.components, value.replace('component/', '').split('/'));
      return resolved || 'Unavailable';
    }
    if (value.startsWith('state/')) {
      const [, stateKey, stateField] = value.split('/');
      if (!stateKey || !stateField) return 'Unavailable';
      const fieldName = stateField === 'background' ? 'backgroundColor' : stateField === 'border' ? 'borderColor' : stateField;
      return getNestedValue(themeData?.states, [stateKey, fieldName]) || 'Unavailable';
    }
    if (value.startsWith('gradient/')) {
      const token = value.replace('gradient/', '') as keyof StructuredThemeData['gradients'];
      return themeData?.gradients?.[token] || 'Unavailable';
    }
    if (value.startsWith('palette/')) {
      const paletteId = Number(value.replace('palette/', ''));
      return themeData?.palette?.find((entry) => entry.id === paletteId)?.hex || 'Unavailable';
    }
    if (value.startsWith('theme-color/')) {
      const [, idText, variant] = value.split('/');
      const themeColor = themeData?.themeColors?.find((entry) => entry.id === Number(idText));
      if (!themeColor || (variant !== 'light' && variant !== 'dark')) return 'Unavailable';
      return themeColor[variant].hex;
    }
    if (value.startsWith('semantic/reader/')) {
      return 'Semantic reader alias';
    }
    if (value.startsWith('literal/')) {
      return value.replace('literal/', '');
    }
    return value;
  };

  const getBindingValueRows = (kind: string, key: string): ValueDetailRow[] => {
    switch (kind) {
      case 'typography': {
        const recipe = readerRecipes.typography[key as keyof ReaderThemeRecipes['typography']];
        if (!recipe) return [];
        return [
          { label: 'Family', token: recipe.family, actual: resolveValueReference(recipe.family) },
          { label: 'Size', token: recipe.size, actual: resolveValueReference(recipe.size) },
          { label: 'Weight', token: recipe.weight, actual: resolveValueReference(recipe.weight) },
          { label: 'Line height', token: recipe.lineHeight, actual: resolveValueReference(recipe.lineHeight) },
          { label: 'Color role', token: recipe.color, actual: resolveValueReference(recipe.color) },
        ];
      }
      case 'surface': {
        const recipe = readerRecipes.surfaces[key as keyof ReaderThemeRecipes['surfaces']];
        if (!recipe) return [];
        return [
          { label: 'Background', token: recipe.background, actual: resolveValueReference(recipe.background) },
          { label: 'Border', token: recipe.border, actual: resolveValueReference(recipe.border) },
          ...(recipe.radius ? [{ label: 'Radius', token: recipe.radius, actual: resolveValueReference(recipe.radius) }] : []),
          ...(recipe.shadow ? [{ label: 'Shadow', token: recipe.shadow, actual: resolveValueReference(recipe.shadow) }] : []),
          ...(recipe.shadowHover ? [{ label: 'Hover shadow', token: recipe.shadowHover, actual: resolveValueReference(recipe.shadowHover) }] : []),
          ...(recipe.padding ? [{ label: 'Padding', token: recipe.padding, actual: resolveValueReference(recipe.padding) }] : []),
        ];
      }
      case 'control': {
        const recipe = readerRecipes.controls[key as keyof ReaderThemeRecipes['controls']];
        if (!recipe) return [];
        if ('color' in recipe) {
          return [{ label: 'Color role', token: recipe.color, actual: resolveValueReference(recipe.color) }];
        }
        return [
          ...('background' in recipe ? [{ label: 'Background', token: recipe.background, actual: resolveValueReference(recipe.background) }] : []),
          ...('text' in recipe ? [{ label: 'Text', token: recipe.text, actual: resolveValueReference(recipe.text) }] : []),
          ...('border' in recipe ? [{ label: 'Border', token: recipe.border, actual: resolveValueReference(recipe.border) }] : []),
          ...('hoverBackground' in recipe && recipe.hoverBackground ? [{ label: 'Hover background', token: recipe.hoverBackground, actual: resolveValueReference(recipe.hoverBackground) }] : []),
          ...('hoverText' in recipe && recipe.hoverText ? [{ label: 'Hover text', token: recipe.hoverText, actual: resolveValueReference(recipe.hoverText) }] : []),
        ];
      }
      case 'tag': {
        const recipe = readerRecipes.tags[key as keyof ReaderThemeRecipes['tags']];
        if (!recipe) return [];
        return [
          { label: 'Background', token: recipe.background, actual: resolveValueReference(recipe.background) },
          { label: 'Text', token: recipe.text, actual: resolveValueReference(recipe.text) },
          { label: 'Border', token: recipe.border, actual: resolveValueReference(recipe.border) },
          ...(recipe.hoverBackground ? [{ label: 'Hover background', token: recipe.hoverBackground, actual: resolveValueReference(recipe.hoverBackground) }] : []),
        ];
      }
      case 'overlay': {
        const recipe = readerRecipes.overlays[key as keyof ReaderThemeRecipes['overlays']];
        if (!recipe) return [];
        return [
          { label: 'Background', token: recipe.background, actual: resolveValueReference(recipe.background) },
          { label: 'Text', token: recipe.text, actual: resolveValueReference(recipe.text) },
          ...(recipe.border ? [{ label: 'Border', token: recipe.border, actual: resolveValueReference(recipe.border) }] : []),
        ];
      }
      case 'iconography':
        return [{
          label: 'Color role',
          token: readerRecipes.iconography[key as keyof ReaderThemeRecipes['iconography']],
          actual: resolveValueReference(readerRecipes.iconography[key as keyof ReaderThemeRecipes['iconography']]),
        }];
      case 'treatment': {
        const value = readerRecipes.treatments[key as keyof ReaderThemeRecipes['treatments']];
        return [{ label: 'Value', token: value, actual: resolveValueReference(value) }];
      }
      case 'layout': {
        const value = themeData?.layout?.sidebarWidth || 'Unset';
        return [{ label: 'Width', token: value, actual: resolveValueReference(value) }];
      }
      case 'token': {
        const tokenValue = (
          key === 'headerBackgroundColor' ? themeData?.components?.header?.backgroundColor :
          key === 'headerBorderColor' ? themeData?.components?.header?.borderColor :
          key === 'headerHeight' ? themeData?.components?.header?.height :
          key === 'headerTextColor' ? themeData?.components?.header?.textColor :
          key === 'headerIconColor' ? themeData?.components?.header?.iconColor :
          key === 'fieldPadding' ? themeData?.components?.input?.padding :
          key === 'fieldBorderRadius' ? themeData?.components?.input?.borderRadius :
          key === 'storyClosedPadding' ? readerRecipes.surfaces.storyCardClosed.padding :
          key === 'storyClosedExcerptLineHeight' ? readerRecipes.typography.storyExcerpt.lineHeight :
          key === 'questionClosedPadding' ? readerRecipes.surfaces.qaCardClosed.padding :
          key === 'galleryClosedPadding' ? readerRecipes.surfaces.galleryCardClosed.padding :
          key === 'calloutContentLineHeight' ? readerRecipes.typography.calloutBody.lineHeight :
          'Unset'
        ) || 'Unset';
        return [{ label: 'Stored value', token: tokenValue, actual: resolveValueReference(tokenValue) }];
      }
      default:
        return [];
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
  const selectedAttributeLabel = selectedComponent && selectedVariant && selectedElement
    ? getAttributeLabel(selectedComponent.id, selectedVariant.id, selectedElement.id, selectedElement.label)
    : formatBindingKeyLabel(selectedKey);
  const selectedAttributeValueTypeLabel = selectedComponent && selectedVariant && selectedElement
    ? getAttributeValueTypeLabel(selectedComponent.id, selectedVariant.id, selectedElement.id, selectedElement.binding.kind)
    : formatBindingKindLabel(selectedKind);

  const workspaceColumns = `minmax(${MIN_SYSTEM_PANE_WIDTH}px, 1fr) minmax(${MIN_ADVANCED_PANE_WIDTH}px, 1fr)`;

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIntro}>
            <div className={styles.headerTitleRow}>
              <span className={styles.headerEyebrow}>Workspace</span>
              <div className={`${styles.draftStatus} ${draftActive ? styles.draftStatusActive : ''}`}>
                {draftActive ? 'Unsaved changes' : 'Saved'}
              </div>
            </div>
            <h1 className={styles.headerTitle}>Theme Management</h1>
            <p className={styles.headerSubtitle}>
              Shape the reader experience through presets, component attributes, and shared values.
            </p>
            <div className={styles.headerMeta}>
              <span><strong>Editing:</strong> {activeThemeLabel}</span>
              <span><strong>Mode:</strong> {theme === 'dark' ? 'Dark' : 'Light'}</span>
              <span>{themeStatusDetail}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
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
              Discard
            </button>
            <button
              type="button"
              disabled
              className={styles.secondaryActionButton}
              title="Save As will arrive in the next theme-management pass."
            >
              Save As
            </button>
            <button 
              onClick={saveTheme}
              disabled={saving || !THEME_SAVE_ENABLED || !isDraftDirty}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : THEME_SAVE_ENABLED ? 'Save' : 'Save Paused'}
            </button>
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
              <div>
                <h2 className={styles.architectureTitle}>Components</h2>
                <p className={styles.architectureText}>Choose the reader surfaces you want to shape, then edit their visible attributes.</p>
              </div>
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
                  <span>Further edits keep working in the current draft until you save or discard them.</span>
                </div>
              </section>
              <section className={styles.architectureCard}>
                <div className={styles.componentSelectorGroups}>
                  <section className={styles.componentSelectorGroup}>
                    <div className={styles.componentSelectorGroupHeader}>
                      <strong>Navigator</strong>
                    </div>
                    <div className={styles.navigatorSectionTabs}>
                      <button
                        type="button"
                        className={selectedNavigatorSection === 'core' ? styles.navigatorSectionTabActive : styles.navigatorSectionTab}
                        onClick={() => setSelectedNavigatorSection('core')}
                      >
                        Core Reader
                      </button>
                      <button
                        type="button"
                        className={selectedNavigatorSection === 'cards' ? styles.navigatorSectionTabActive : styles.navigatorSectionTab}
                        onClick={() => setSelectedNavigatorSection('cards')}
                      >
                        Cards
                      </button>
                      <button
                        type="button"
                        className={selectedNavigatorSection === 'systems' ? styles.navigatorSectionTabActive : styles.navigatorSectionTab}
                        onClick={() => setSelectedNavigatorSection('systems')}
                      >
                        Discovery & Controls
                      </button>
                    </div>
                    <div className={styles.componentSelectorCompactList}>
                      {visibleNavigatorComponents.map((component) => (
                        <button
                          key={component.id}
                          type="button"
                          className={component.id === selectedComponentId ? styles.componentSelectorActive : styles.componentSelectorButton}
                          onClick={() => {
                            setSelectedNavigatorSection(getNavigatorSectionForComponent(component.id));
                            setSelectedComponentId(component.id);
                            setSelectedVariantId(component.variants[0]?.id ?? '');
                          }}
                        >
                          <strong>{COMPONENT_TAB_LABELS[component.id] ?? component.label}</strong>
                        </button>
                      ))}
                    </div>
                    {selectedComponent ? (
                      <div className={styles.componentSelectorHint}>
                        {LEFT_PANE_COMPONENT_DESCRIPTIONS[selectedComponent.id] ?? selectedComponent.description}
                      </div>
                    ) : null}
                  </section>
                </div>
                <div className={styles.componentEditorPanel}>
                  <div className={styles.componentEditorHeader}>
                    <strong>{selectedComponent ? (COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label) : 'Component'}</strong>
                    <span>{selectedAttributeLabel}</span>
                  </div>
                  {selectedSurface ? (
                    <div className={styles.componentEditorMeta}>
                      <span className={styles.componentEditorSurface}>{selectedSurface}</span>
                      {selectedVariant ? <span>Variant: {selectedVariant.label}</span> : null}
                    </div>
                  ) : null}
                  {selectedComponent?.variants.length && selectedComponent.variants.length > 1 ? (
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
                  <div className={styles.componentAttributeTabs}>
                    {selectedVariantElements.map((element) => {
                      const attributeId = `${element.binding.kind}:${element.binding.key}`;
                      return (
                        <button
                          key={element.id}
                          type="button"
                          className={selectedRecipeId === attributeId ? styles.componentAttributeTabActive : styles.componentAttributeTab}
                          onClick={() => setSelectedRecipeId(attributeId)}
                        >
                          {selectedComponent && selectedVariant
                            ? getAttributeLabel(selectedComponent.id, selectedVariant.id, element.id, element.label)
                            : element.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedElement?.description ? (
                    <div className={styles.componentBehaviorNotes}>
                      <span>{selectedElement.description}</span>
                    </div>
                  ) : null}
                  <div className={styles.componentActiveEditor}>
                    <div className={styles.componentActiveEditorHeader}>
                      <strong>{selectedAttributeLabel}</strong>
                      <span>{selectedAttributeValueTypeLabel}</span>
                    </div>
                    {renderBindingEditor(selectedKind, selectedKey)}
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section className={`${styles.architectureWorkbench} ${styles.advancedPane}`}>
            <div className={styles.architectureHeader}>
              <div>
                <h2 className={styles.architectureTitle}>Values</h2>
                <p className={styles.architectureText}>See the named values behind the selected attribute.</p>
              </div>
            </div>
            <div className={`${styles.paneBody} ${styles.advancedPaneBody}`}>
              <section className={`${styles.section} ${styles.advancedSection}`}>
                <div className={styles.sectionHeader}>
                  <h2>{selectedAttributeLabel}</h2>
                </div>
                <div className={styles.contextValuePanel}>
                  <div className={styles.contextValueMeta}>
                    <span><strong>Component:</strong> {selectedComponent ? (COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label) : 'None selected'}</span>
                    {selectedVariant ? <span><strong>Variant:</strong> {selectedVariant.label}</span> : null}
                    <span><strong>Value Type:</strong> {selectedAttributeValueTypeLabel}</span>
                  </div>
                  {selectedElement?.description ? (
                    <p className={styles.contextValueNote}>{selectedElement.description}</p>
                  ) : null}
                  <div className={styles.contextValueSource}>
                    <strong>Uses</strong>
                    <div className={styles.componentRecipeSummary}>
                      {renderBindingSummary(selectedKind, selectedKey)}
                    </div>
                  </div>
                  <div className={styles.contextValueDetails}>
                    <strong>Actual Values</strong>
                    <div className={styles.valueDetailList}>
                      {getBindingValueRows(selectedKind, selectedKey).map((row) => (
                        <div key={`${row.label}:${row.token}`} className={styles.valueDetailRow}>
                          <span className={styles.valueDetailLabel}>{row.label}</span>
                          <code className={styles.valueDetailToken}>{formatTokenRef(row.token)}</code>
                          <code className={styles.valueDetailActual}>{row.actual}</code>
                        </div>
                      ))}
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

