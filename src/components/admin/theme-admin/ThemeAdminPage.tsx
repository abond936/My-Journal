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
type NavigatorSectionId = 'core' | 'cards';

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
const DEFAULT_SELECTED_RECIPE = 'surface:canvasPage';
const READER_PRESET_IDS: ThemePresetId[] = ['journal', 'editorial'];
const MIN_SYSTEM_PANE_WIDTH = 256;
const MIN_ADVANCED_PANE_WIDTH = 460;
const THEME_DRAFT_READER_SCOPE = '.themeDraftReaderScope';
const THEME_DRAFT_ADMIN_SCOPE = '.themeDraftAdminScope';
const DRAFT_CSS_DEBOUNCE_MS = 180;

const asThemeRecord = (value: unknown): ThemeRecord => (
  value && typeof value === 'object' ? value as ThemeRecord : {}
);

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

const formatEditorOptionLabel = (value: ThemeRecipeTokenRef | string): string => {
  const colorAliasLabels: Record<string, string> = {
    'layout/bodyBackgroundColor': 'Color 1-100',
    'layout/background1Color': 'Color 1-100',
    'layout/background2Color': 'Color 1-200',
    'layout/border1Color': 'Color 1-200',
    'layout/border2Color': 'Color 1-300',
    'literal/typography.textColors.text1': 'Color 2-300',
    'literal/typography.textColors.text2': 'Color 2-100',
    'semantic/reader/tonal-text-primary': 'Color 2-300',
    'semantic/reader/tonal-text-secondary': 'Color 2-100',
    'semantic/reader/contrast-on-fill-text': 'Color 2-300',
    'semantic/reader/overlay-contrast-text': 'Color 2-300',
    'state/success/background': 'Color 11',
    'state/success/border': 'Color 11',
    'state/error/background': 'Color 12',
    'state/error/border': 'Color 12',
    'state/warning/background': 'Color 13',
    'state/warning/border': 'Color 13',
    'state/info/background': 'Color 14',
    'state/info/border': 'Color 14',
  };

  if (value in colorAliasLabels) return colorAliasLabels[value];
  if (value.startsWith('font-family/')) return value.replace('font-family/', '').replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
  if (value.startsWith('font-size/')) return humanizeTokenSegment(value.replace('font-size/', ''));
  if (value.startsWith('font-weight/')) return humanizeTokenSegment(value.replace('font-weight/', ''));
  if (value.startsWith('line-height/')) return humanizeTokenSegment(value.replace('line-height/', ''));
  if (value.startsWith('spacing/')) return `Spacing ${humanizeTokenSegment(value.replace('spacing/', ''))}`;
  if (value.startsWith('border/radius/')) return `Radius ${humanizeTokenSegment(value.replace('border/radius/', ''))}`;
  if (value.startsWith('shadow/')) return `Shadow ${humanizeTokenSegment(value.replace('shadow/', ''))}`;
  if (value.startsWith('palette/')) return `Color ${value.replace('palette/', '')}`;
  if (value.startsWith('semantic/reader/')) return humanizeTokenSegment(value.replace('semantic/reader/', ''));
  if (value.startsWith('layout/')) return humanizeTokenSegment(value.replace('layout/', ''));
  if (value.startsWith('component/')) return humanizeTokenSegment(value.replace('component/', ''));
  if (value.startsWith('literal/')) return humanizeTokenSegment(value.replace('literal/', ''));
  if (value.startsWith('state/')) return humanizeTokenSegment(value.replace('state/', ''));
  return formatTokenRef(value);
};

const renderEditorValueOptions = (options: ThemeRecipeTokenRef[], kind: ValueOptionKind = 'generic') => groupTokenOptions(options, kind).map((group) => (
  <optgroup key={group.label} label={group.label}>
    {group.options.map((option) => <option key={option} value={option}>{formatEditorOptionLabel(option)}</option>)}
  </optgroup>
));

const hslToHex = (h: number, s: number, l: number): string => {
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lDecimal - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

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

  const rr = Math.round((r + m) * 255);
  const gg = Math.round((g + m) * 255);
  const bb = Math.round((b + m) * 255);

  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
};

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

const PaletteColorEditor: React.FC<{
  color: BaseColor | ThemeColor;
  onColorChange: (id: number, field: keyof BaseColor | keyof ThemeColor, value: string, variant?: 'light' | 'dark') => void;
  onHslChange: (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => void;
}> = ({ color, onColorChange, onHslChange }) => {
  const isThemeColor = (candidate: BaseColor | ThemeColor): candidate is ThemeColor => 'light' in candidate && 'dark' in candidate;
  const colorLabel = `Color ${color.id}`;
  const colorName = color.name ? humanizeTokenSegment(color.name) : '';

  const renderVariantEditor = (
    variantLabel: string | null,
    hex: string,
    h: string,
    s: string,
    l: string,
    variant?: 'light' | 'dark',
    showHex: boolean = true,
  ) => (
    <div className={styles.paletteVariantCard}>
      {variantLabel ? <div className={styles.paletteVariantLabel}>{variantLabel}</div> : null}
      <div className={styles.paletteVariantSection}>
        <div className={styles.paletteSwatch} style={{ backgroundColor: hex }} title={`${variantLabel ?? 'Base'}: ${hex}`} />
        <div className={styles.paletteValueGrid}>
          {showHex ? (
            <div className={styles.paletteSingleValueRow}>
              <input
                className={styles.paletteHexInput}
                type="text"
                value={hex}
                readOnly
                aria-label={`${variantLabel ?? 'Base'} hex`}
              />
            </div>
          ) : null}
          <div className={styles.paletteHslRow}>
            <div className={styles.paletteHslStack}>
              <div className={styles.paletteHslValue}>
                <label>H</label>
                <input
                  className={styles.hslSpinner}
                  type="number"
                  value={parseInt(h, 10)}
                  onChange={(e) => {
                    const nextH = e.target.value;
                    onHslChange(color.id, nextH, s, l, variant);
                    onColorChange(color.id, 'hex', hslToHex(parseInt(nextH || '0', 10), parseInt(String(s).replace('%', '') || '0', 10), parseInt(String(l).replace('%', '') || '0', 10)), variant);
                  }}
                />
              </div>
              <div className={styles.paletteHslValue}>
                <label>S</label>
                <input
                  className={styles.hslSpinner}
                  type="number"
                  value={parseInt(String(s).replace('%', ''), 10)}
                  onChange={(e) => {
                    const nextS = `${e.target.value}%`;
                    onHslChange(color.id, h, nextS, l, variant);
                    onColorChange(color.id, 'hex', hslToHex(parseInt(h || '0', 10), parseInt(e.target.value || '0', 10), parseInt(String(l).replace('%', '') || '0', 10)), variant);
                  }}
                />
              </div>
              <div className={styles.paletteHslValue}>
                <label>L</label>
                <input
                  className={styles.hslSpinner}
                  type="number"
                  value={parseInt(String(l).replace('%', ''), 10)}
                  onChange={(e) => {
                    const nextL = `${e.target.value}%`;
                    onHslChange(color.id, h, s, nextL, variant);
                    onColorChange(color.id, 'hex', hslToHex(parseInt(h || '0', 10), parseInt(String(s).replace('%', '') || '0', 10), parseInt(e.target.value || '0', 10)), variant);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isThemeColor(color)) {
    return (
      <div className={styles.colorEditor}>
        <div className={styles.paletteColorHeaderBlock}>
          <span className={styles.paletteColorHeader}>{colorLabel}</span>
          <span className={styles.paletteColorSubhead}>{colorName}</span>
          <div className={styles.paletteHeaderHexStack}>
            <input
              className={styles.paletteHeaderHexInput}
              type="text"
              value={color.light.hex}
              readOnly
              aria-label="Light hex"
            />
            <input
              className={styles.paletteHeaderHexInput}
              type="text"
              value={color.dark.hex}
              readOnly
              aria-label="Dark hex"
            />
          </div>
        </div>
        <div className={styles.paletteVariantPair}>
          {renderVariantEditor('Light', color.light.hex, color.light.h, color.light.s, color.light.l, 'light', false)}
          {renderVariantEditor('Dark', color.dark.hex, color.dark.h, color.dark.s, color.dark.l, 'dark', false)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.colorEditor}>
      <div className={styles.paletteColorHeaderBlock}>
        <span className={styles.paletteColorHeader}>{colorLabel}</span>
        <span className={styles.paletteColorSubhead}>{colorName}</span>
        <input
          className={styles.paletteHeaderHexInput}
          type="text"
          value={color.hex}
          readOnly
          aria-label={`Palette ${color.id} hex`}
        />
      </div>
      <div className={styles.paletteVariantSingle}>
        {renderVariantEditor(null, color.hex, color.h, `${color.s}%`.replace('%%', '%'), `${color.l}%`.replace('%%', '%'), undefined, false)}
      </div>
    </div>
  );
};

const COMPONENT_TAB_LABELS: Record<string, string> = {
  canvas: 'Foundation',
  chrome: 'Chrome',
  field: 'Controls',
  feedback: 'Feedback',
  cardGeneral: 'General',
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
  'feedback',
  'field',
  'cardGeneral',
  'storyCard',
  'galleryCard',
  'qaCard',
  'quoteCard',
  'calloutCard',
  'discoverySupport',
] as const;

const CORE_READER_COMPONENT_IDS = ['canvas', 'chrome', 'field', 'feedback'] as const;
const CARD_COMPONENT_IDS = ['cardGeneral', 'storyCard', 'galleryCard', 'qaCard', 'quoteCard', 'calloutCard', 'discoverySupport'] as const;

const getNavigatorSectionForComponent = (componentId: string): NavigatorSectionId => {
  if (CORE_READER_COMPONENT_IDS.includes(componentId as (typeof CORE_READER_COMPONENT_IDS)[number])) return 'core';
  return 'cards';
};

const getOrderedVariantElements = (
  componentId: string,
  variantId: string,
  elements: DisplayElement[],
): DisplayElement[] => {
  if (componentId === 'storyCard' && variantId === 'closed') {
    const preferredOrder = ['surface', 'contentPadding', 'title', 'overlayTitle', 'excerpt', 'excerptLineHeight'];
    const rank = new Map(preferredOrder.map((id, index) => [id, index]));

    return [...elements].sort((a, b) => {
      const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }

  return elements;
};

const getVisibleVariantElements = (
  componentId: string,
  variantId: string,
  elements: DisplayElement[],
): DisplayElement[] => {
  if (componentId === 'storyCard' && variantId === 'closed') {
    return elements.filter((element) => !['surface', 'contentPadding', 'overlayTitle', 'excerptLineHeight'].includes(element.id));
  }

  if (componentId === 'galleryCard' && variantId === 'closed') {
    return elements.filter((element) => !['surface', 'contentPadding', 'overlayTitle'].includes(element.id));
  }

  if (componentId === 'qaCard' && variantId === 'closed') {
    return elements.filter((element) => !['surface', 'contentPadding'].includes(element.id));
  }

  if (componentId === 'calloutCard' && variantId === 'closed') {
    return elements.filter((element) => !['surface', 'contentLineHeight'].includes(element.id));
  }

  if (componentId === 'quoteCard' && variantId === 'closed') {
    return elements.filter((element) => element.id !== 'surface');
  }

    return elements;
  };

const getDefaultAttributeId = (
  component: DisplayComponentSpec | undefined,
  variantId?: string,
): string => {
  if (!component) return '';

  const variant = component.variants.find((entry) => entry.id === variantId) ?? component.variants[0];
  if (!variant) return '';

  const baseElements: DisplayElement[] = variant.elements.map((element) => ({
    id: element.id,
    label: element.label,
    description: element.description,
    binding: {
      kind: element.binding.kind,
      key: element.binding.key,
    },
  }));

  const visibleElements = getVisibleVariantElements(
    component.id,
    variant.id,
    getOrderedVariantElements(component.id, variant.id, baseElements),
  );
  const firstElement = visibleElements[0];
  return firstElement ? `${firstElement.binding.kind}:${firstElement.binding.key}` : '';
};

const VARIANT_LABELS: Record<string, string> = {
  'canvas.reader': 'Foundation',
  'storyCard.closed': 'Closed',
  'storyCard.open': 'Open',
  'galleryCard.closed': 'Closed',
  'galleryCard.open': 'Open',
  'qaCard.closed': 'Closed',
  'qaCard.open': 'Open',
  'quoteCard.closed': 'Closed',
  'calloutCard.closed': 'Closed',
  'cardGeneral.shared': 'Shared',
  'feedback.general': 'General',
  'feedback.states': 'States',
  'feedback.success': 'Success',
  'feedback.warning': 'Warning',
  'feedback.error': 'Error',
  'feedback.info': 'Info',
  'chrome.header': 'Header',
  'chrome.sidebar': 'Sidebar',
};

const getVariantLabel = (componentId: string, variantId: string, fallback: string): string => (
  VARIANT_LABELS[`${componentId}.${variantId}`] ?? fallback
);

const ATTRIBUTE_LABELS: Record<string, string> = {
  'canvas.reader.pageSurface': 'Background',
  'canvas.reader.sectionSurface': 'Raised Surface',
  'canvas.reader.border': 'Border',
  'canvas.reader.borderStrong': 'Strong Border',
  'canvas.reader.bodyText': 'Text',
  'canvas.reader.metaText': 'Muted Text',
  'canvas.reader.inlineLink': 'Link',
  'canvas.reader.focusRing': 'Focus Ring',
  'chrome.header.surface': 'Header Surface',
  'chrome.header.height': 'Header Height',
  'chrome.header.logoMaxHeight': 'Logo Max',
  'chrome.sidebar.surface': 'Sidebar Surface',
  'chrome.sidebar.width': 'Sidebar Width',
  'field.controls.label': 'Label',
  'field.controls.meta': 'Meta',
  'field.controls.hint': 'Hint',
  'field.controls.control': 'Control Surface',
  'field.controls.controlText': 'Control Text',
  'field.controls.controlStrong': 'Selected Surface',
  'field.controls.activeTab': 'Active Control',
  'field.controls.filterChip': 'Filter Chip',
  'field.controls.padding': 'Padding',
  'field.controls.borderRadius': 'Border Radius',
  'cardGeneral.shared.surface': 'Surface',
  'feedback.states.surface': 'Background',
  'feedback.general.surface': 'Background',
  'feedback.general.title': 'Title',
  'feedback.general.meta': 'Text',
  'feedback.general.hint': 'Hint',
  'feedback.general.action': 'Action',
  'feedback.states.colors': 'State Colors',
  'feedback.states.title': 'Title',
  'feedback.states.meta': 'Text',
  'feedback.states.hint': 'Hint',
  'feedback.states.action': 'Action',
  'feedback.success.surface': 'Background',
  'feedback.success.title': 'Title',
  'feedback.success.meta': 'Text',
  'feedback.success.action': 'Action',
  'feedback.warning.surface': 'Background',
  'feedback.warning.title': 'Title',
  'feedback.warning.meta': 'Text',
  'feedback.warning.action': 'Action',
  'feedback.error.surface': 'Background',
  'feedback.error.title': 'Title',
  'feedback.error.meta': 'Text',
  'feedback.error.action': 'Action',
  'feedback.info.surface': 'Background',
  'feedback.info.title': 'Title',
  'feedback.info.meta': 'Text',
  'feedback.info.action': 'Action',
  'storyCard.closed.surface': 'Surface',
  'storyCard.closed.title': 'Title',
  'storyCard.closed.imageOverlay': 'Overlay',
  'storyCard.closed.excerpt': 'Excerpt',
  'storyCard.closed.excerptLineHeight': 'Line Spacing',
  'storyCard.discovery.title': 'Compact Title',
  'storyCard.discovery.excerpt': 'Excerpt',
  'storyCard.discovery.meta': 'Meta',
  'galleryCard.closed.surface': 'Surface',
  'galleryCard.closed.title': 'Title',
  'galleryCard.closed.imageOverlay': 'Overlay',
  'galleryCard.discovery.sectionTitle': 'Section Title',
  'galleryCard.discovery.title': 'Compact Title',
  'galleryCard.discovery.caption': 'Caption',
  'galleryCard.discovery.meta': 'Group/Meta Text',
  'qaCard.closed.surface': 'Surface',
  'qaCard.closed.question': 'Question',
  'qaCard.closed.overlayQuestion': 'Overlay',
  'qaCard.closed.excerpt': 'Excerpt',
  'qaCard.discovery.question': 'Compact Question',
  'qaCard.discovery.excerpt': 'Excerpt',
  'discoverySupport.discovery.surface': 'Shared Surface',
  'discoverySupport.discovery.sectionTitle': 'Section Title',
  'discoverySupport.discovery.meta': 'Group/Meta Text',
  'discoverySupport.childRail.sectionTitle': 'Rail Section Title',
  'discoverySupport.childRail.countMeta': 'Rail Count/Meta',
  'discoverySupport.childRail.cardTitle': 'Rail Card Title',
  'qaCard.open.answer': 'Content',
  'qaCard.open.caption': 'Caption',
  'quoteCard.closed.quote': 'Quote',
  'quoteCard.closed.watermark': 'Watermark',
  'calloutCard.closed.contentLineHeight': 'Line Spacing',
  'calloutCard.closed.watermark': 'Watermark',
};
const getAttributeLabel = (componentId: string, variantId: string, elementId: string, fallback: string): string => (
  ATTRIBUTE_LABELS[`${componentId}.${variantId}.${elementId}`] ?? fallback
);
const FOUNDATION_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'canvas',
  label: 'Foundation',
  description: 'Shared reading foundation for background, raised surface, text, links, and focus treatment.',
  variants: [
    {
      id: 'reader',
      label: 'Foundation',
      elements: [
        {
          id: 'pageSurface',
          label: 'Foundation background',
          description: 'Base page and canvas surface for the reader experience.',
          binding: { kind: 'surface', key: 'canvasPage' },
        },
        {
          id: 'sectionSurface',
          label: 'Raised surface',
          description: 'Shared raised surface used for secondary canvas layers and framed content.',
          binding: { kind: 'surface', key: 'canvasSection' },
        },
        {
          id: 'border',
          label: 'Border',
          description: 'Shared foundation border treatment.',
          binding: { kind: 'token', key: 'foundationBorderColor' },
        },
        {
          id: 'borderStrong',
          label: 'Strong border',
          description: 'Stronger shared border treatment for emphasized edges.',
          binding: { kind: 'token', key: 'foundationBorderStrongColor' },
        },
        {
          id: 'bodyText',
          label: 'Primary text',
          description: 'Default body text across the reader.',
          binding: { kind: 'typography', key: 'body' },
        },
        {
          id: 'metaText',
          label: 'Secondary text',
          description: 'Muted support text used for meta and secondary copy.',
          binding: { kind: 'typography', key: 'meta' },
        },
        {
          id: 'inlineLink',
          label: 'Link',
          description: 'Shared link and accent treatment.',
          binding: { kind: 'control', key: 'inlineLink' },
        },
        {
          id: 'focusRing',
          label: 'Focus ring',
          description: 'Shared focus treatment for interactive elements.',
          binding: { kind: 'control', key: 'focusRing' },
        },
      ],
    },
  ],
};

const CHROME_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'chrome',
  label: 'Chrome',
  description: 'Reader shell framing for header and sidebar surfaces and sizing.',
  variants: [
    {
      id: 'header',
      label: 'Header',
      elements: [
        { id: 'surface', label: 'Header surface', binding: { kind: 'surface', key: 'chromeToolbar' } },
      ],
    },
    {
      id: 'sidebar',
      label: 'Sidebar',
      elements: [
        { id: 'surface', label: 'Sidebar surface', binding: { kind: 'surface', key: 'chromeSidebar' } },
      ],
    },
  ],
};

const FEEDBACK_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'feedback',
  label: 'Feedback',
  description: 'Shared feedback presentation and notice-state color assignments.',
  variants: [
    {
      id: 'general',
      label: 'General',
      elements: [
        { id: 'surface', label: 'Feedback panel', binding: { kind: 'surface', key: 'feedbackPanel' } },
        { id: 'title', label: 'Title', binding: { kind: 'typography', key: 'feedbackTitle' } },
        { id: 'meta', label: 'Text', binding: { kind: 'typography', key: 'feedbackMeta' } },
        { id: 'hint', label: 'Hint', binding: { kind: 'typography', key: 'feedbackHint' } },
        { id: 'action', label: 'Action', binding: { kind: 'control', key: 'feedbackAction' } },
      ],
    },
    {
      id: 'states',
      label: 'States',
      elements: [
        { id: 'colors', label: 'State colors', binding: { kind: 'feedbackStates', key: 'feedbackStates' } },
      ],
    },
  ],
};

const CARD_GENERAL_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'cardGeneral',
  label: 'General',
  description: 'Shared closed-card foundation across story, gallery, question, quote, and callout cards.',
  variants: [
    {
      id: 'shared',
      label: 'Shared',
      elements: [
        {
          id: 'surface',
          label: 'Surface',
          description: 'Shared closed-card surface foundation.',
          binding: { kind: 'sharedSurface', key: 'closedCards' },
        },
      ],
    },
  ],
};

const FONT_FAMILY_OPTIONS: ThemeRecipeTokenRef[] = [
  'font-family/sans1',
  'font-family/sans2',
  'font-family/sans3',
  'font-family/serif1',
  'font-family/serif2',
  'font-family/serif3',
  'font-family/handwriting1',
  'font-family/handwriting2',
];

const FONT_SIZE_OPTIONS: ThemeRecipeTokenRef[] = [
  'font-size/xs',
  'font-size/sm',
  'font-size/base',
  'font-size/lg',
  'font-size/xl',
  'font-size/2xl',
  'font-size/3xl',
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

const PALETTE_ACCENT_OPTIONS: ThemeRecipeTokenRef[] = [
  'palette/3',
  'palette/4',
  'palette/5',
  'palette/6',
  'palette/7',
  'palette/8',
  'palette/9',
  'palette/10',
];

const FOUNDATION_SURFACE_OPTIONS: ThemeRecipeTokenRef[] = [
  'layout/background1Color',
  'layout/background2Color',
];

const FOUNDATION_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  'layout/border1Color',
  'layout/border2Color',
];

const FOUNDATION_TEXT_OPTIONS: ThemeRecipeTokenRef[] = [
  'literal/typography.textColors.text1',
  'literal/typography.textColors.text2',
  'semantic/reader/tonal-text-primary',
  'semantic/reader/tonal-text-secondary',
];

const CONTRAST_TEXT_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/contrast-on-fill-text',
  'semantic/reader/overlay-contrast-text',
];

const NOTICE_SURFACE_OPTIONS: ThemeRecipeTokenRef[] = [
  'state/success/background',
  'state/error/background',
  'state/warning/background',
  'state/info/background',
];

const NOTICE_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  'state/success/border',
  'state/error/border',
  'state/warning/border',
  'state/info/border',
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

const EMPHASIS_BACKGROUND_OPTIONS: ThemeRecipeTokenRef[] = [
  ...FOUNDATION_SURFACE_OPTIONS,
  ...PALETTE_ACCENT_OPTIONS,
];

const EMPHASIS_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  ...FOUNDATION_BORDER_OPTIONS,
  ...PALETTE_ACCENT_OPTIONS,
];

const CONTROL_TEXT_OPTIONS: ThemeRecipeTokenRef[] = [
  ...FOUNDATION_TEXT_OPTIONS,
  ...CONTRAST_TEXT_OPTIONS,
];

const LINK_COLOR_OPTIONS: ThemeRecipeTokenRef[] = [
  ...PALETTE_ACCENT_OPTIONS,
  ...FOUNDATION_TEXT_OPTIONS,
];

const OVERLAY_BACKGROUND_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/overlay-scrim',
  'semantic/reader/overlay-scrim-strong',
  'gradient/bottomOverlay',
  'gradient/bottomOverlayStrong',
];

const OVERLAY_TEXT_OPTIONS: ThemeRecipeTokenRef[] = [
  'semantic/reader/overlay-contrast-text',
  'semantic/reader/contrast-on-fill-text',
];

const getTypographyColorOptions = (role: keyof ReaderThemeRecipes['typography']): ThemeRecipeTokenRef[] => {
  if (role === 'storyOverlayTitle' || role === 'galleryOverlayTitle' || role === 'questionOverlay') {
    return OVERLAY_TEXT_OPTIONS;
  }

  if (
    role === 'title'
    || role === 'storyTitle'
    || role === 'galleryTitle'
    || role === 'galleryHeaderTitle'
    || role === 'detailTitle'
    || role === 'storyDetailTitle'
    || role === 'galleryDetailTitle'
    || role === 'discoveryTitle'
    || role === 'railSectionTitle'
    || role === 'railCardTitle'
    || role === 'question'
    || role === 'calloutTitle'
    || role === 'quote'
  ) {
    return [...FOUNDATION_TEXT_OPTIONS, ...PALETTE_ACCENT_OPTIONS];
  }

  return FOUNDATION_TEXT_OPTIONS;
};

const getSurfaceBackgroundOptions = (role: keyof ReaderThemeRecipes['surfaces']): ThemeRecipeTokenRef[] => (
  role.startsWith('feedback') ? [...FOUNDATION_SURFACE_OPTIONS, ...NOTICE_SURFACE_OPTIONS] : FOUNDATION_SURFACE_OPTIONS
);

const getSurfaceBorderOptions = (role: keyof ReaderThemeRecipes['surfaces']): ThemeRecipeTokenRef[] => (
  role.startsWith('feedback') ? [...FOUNDATION_BORDER_OPTIONS, ...NOTICE_BORDER_OPTIONS] : FOUNDATION_BORDER_OPTIONS
);

const getControlBackgroundOptions = (role: keyof ReaderThemeRecipes['controls']): ThemeRecipeTokenRef[] => {
  if (role === 'lightboxControl') return OVERLAY_BACKGROUND_OPTIONS;
  if (role === 'fieldControl') return FOUNDATION_SURFACE_OPTIONS;
  return EMPHASIS_BACKGROUND_OPTIONS;
};

const getControlBorderOptions = (role: keyof ReaderThemeRecipes['controls']): ThemeRecipeTokenRef[] => {
  if (role === 'lightboxControl') return FOUNDATION_BORDER_OPTIONS;
  if (role === 'fieldControl') return FOUNDATION_BORDER_OPTIONS;
  return EMPHASIS_BORDER_OPTIONS;
};

const getControlTextOptions = (role: keyof ReaderThemeRecipes['controls']): ThemeRecipeTokenRef[] => {
  if (role === 'inlineLink') return LINK_COLOR_OPTIONS;
  if (role === 'lightboxControl') return OVERLAY_TEXT_OPTIONS;
  return CONTROL_TEXT_OPTIONS;
};

const getIconographyColorOptions = (role: keyof ReaderThemeRecipes['iconography']): ThemeRecipeTokenRef[] => {
  if (role === 'overlay') return OVERLAY_TEXT_OPTIONS;
  if (role === 'accent') return PALETTE_ACCENT_OPTIONS;
  return [...FOUNDATION_TEXT_OPTIONS, ...CONTRAST_TEXT_OPTIONS];
};

const getTagBackgroundOptions = (role: keyof ReaderThemeRecipes['tags']): ThemeRecipeTokenRef[] => (
  role === 'muted' ? FOUNDATION_SURFACE_OPTIONS : PALETTE_ACCENT_OPTIONS
);

const getTagTextOptions = (role: keyof ReaderThemeRecipes['tags']): ThemeRecipeTokenRef[] => (
  role === 'muted' ? FOUNDATION_TEXT_OPTIONS : CONTRAST_TEXT_OPTIONS
);

const getTagBorderOptions = (role: keyof ReaderThemeRecipes['tags']): ThemeRecipeTokenRef[] => (
  role === 'muted' ? FOUNDATION_BORDER_OPTIONS : PALETTE_ACCENT_OPTIONS
);

const INHERITED_FAMILY_ROLES: Array<keyof ReaderThemeRecipes['typography']> = [
  'chromeLabel',
  'chromeMeta',
  'chromeHint',
  'fieldControl',
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
  const { applyDraftThemeCss, clearDraftThemeCss, theme, toggleTheme } = useTheme();
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
  const [activePresetId, setActivePresetId] = useState<ThemePresetId | 'custom'>('custom');
  const [activeAdminPresetId, setActiveAdminPresetId] = useState<ThemeAdminPresetId | 'custom'>('admin');
  const [savedThemeDocument, setSavedThemeDocument] = useState<PersistedThemeDocumentData | null>(null);

  const orderedReaderComponents: DisplayComponentSpec[] = COMPONENT_ORDER
    .map((id) => {
      if (id === 'header') {
        return undefined;
      }
      if (id === 'canvas') {
        return FOUNDATION_COMPONENT_SPEC;
      }
      if (id === 'cardGeneral') {
        return CARD_GENERAL_COMPONENT_SPEC;
      }
      if (id === 'feedback') {
        return FEEDBACK_COMPONENT_SPEC;
      }
      if (id === 'chrome') {
        return CHROME_COMPONENT_SPEC;
      }
      return CURRENT_READER_THEME_COMPONENTS.find((component) => component.id === id) as DisplayComponentSpec | undefined;
    })
    .filter((component): component is DisplayComponentSpec => Boolean(component));

  const coreReaderComponents = useMemo(() => CORE_READER_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);

  const cardComponents = useMemo(() => CARD_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);
  const visibleNavigatorComponents = useMemo(() => {
    if (selectedNavigatorSection === 'core') return coreReaderComponents;
    return cardComponents;
  }, [cardComponents, coreReaderComponents, selectedNavigatorSection]);

  const applyReaderPreset = useCallback((presetId: ThemePresetId) => {
    const preset = getReaderPresetSettings(presetId);
    setThemeData(preset.data);
    setReaderRecipes(mergeReaderRecipes(preset.recipes));
    setActivePresetId(presetId);
    setSaveNotice(null);
  }, []);

  useEffect(() => {
    const selectedComponent = orderedReaderComponents.find((component) => component.id === selectedComponentId);
    const visibleVariants = (selectedComponent?.variants ?? []).filter((variant) => {
      if (!selectedComponent) return true;
      if (selectedComponent.id === 'storyCard' || selectedComponent.id === 'galleryCard' || selectedComponent.id === 'qaCard') {
        return variant.id !== 'discovery';
      }
      return true;
    });
    const fallbackVariantId = visibleVariants[0]?.id ?? '';
    if (!selectedComponent) return;
    if (!visibleVariants.some((variant) => variant.id === selectedVariantId)) {
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
    setReaderRecipes(mergeReaderRecipes(document.reader.recipes));
    setActivePresetId(
      document.reader.activePresetId === 'journal' || document.reader.activePresetId === 'editorial'
        ? document.reader.activePresetId
        : 'journal'
    );
    setAdminThemeData(document.admin.data);
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
              activePresetId:
                scoped.reader.activePresetId === 'journal' || scoped.reader.activePresetId === 'editorial'
                  ? scoped.reader.activePresetId
                  : 'journal',
              ...(scoped.reader.recipes ? { recipes: scoped.reader.recipes } : {}),
            },
            admin: {
              data: scoped.admin.data,
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
              activePresetId: ap === 'journal' || ap === 'editorial' ? ap : 'journal',
              recipes: mergeReaderRecipes(),
            },
            admin: {
              data: adminPreset.data,
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

    setThemeData((prev) => {
      const next = structuredClone(prev!);
      if (id === 1 || id === 2) {
        const themeColor = next.themeColors.find((entry) => entry.id === id);
        if (themeColor && variant) {
          if (field === 'hex') {
            themeColor[variant].hex = value;
          } else if (field === 'name') {
            themeColor.name = value;
          }
        }
      } else {
        next.palette = next.palette.map((entry) => (
          entry.id === id ? { ...entry, [field]: value } : entry
        ));
      }
      return next;
    });
  };

  const handleHslChange = (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => {
    if (!themeData) return;

    setThemeData((prev) => {
      const next = structuredClone(prev!);
      if (id === 1 || id === 2) {
        const themeColor = next.themeColors.find((entry) => entry.id === id);
        if (themeColor && variant) {
          themeColor[variant].h = h;
          themeColor[variant].s = s;
          themeColor[variant].l = l;
        }
      } else {
        next.palette = next.palette.map((entry) => (
          entry.id === id ? { ...entry, h, s, l } : entry
        ));
      }
      return next;
    });
  };

  const handleTokenChange = (section: string, key: string, value: string) => {
    if (!themeData) return;

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
    if (!themeData || !adminThemeData) return false;

    if (!THEME_SAVE_ENABLED) {
      setSaveNotice({
        type: 'warning',
        message: 'Theme saving is paused.',
        detail: 'This page is a preview lab until the semantic theme model is ready.',
      });
      return false;
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
      return false;
    }
    
    setSaving(true);
    setSaveNotice(null);
    try {
      const dataToSave: PersistedThemeDocumentData = {
        version: 2,
        reader: {
          data: themeData,
          activePresetId,
          recipes: readerRecipes,
        },
        admin: {
          data: adminThemeData,
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
        return true;
      } else {
        const err = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        setSaveNotice({
          type: 'error',
          message: 'Failed to save theme.',
          detail: err.message || err.error || 'Request failed.',
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveNotice({
        type: 'error',
        message: 'Failed to save theme.',
        detail: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = useCallback(() => {
    if (!savedThemeDocument) return;
    applyThemeDocument(savedThemeDocument);
    clearDraftThemeCss();
    setSaveNotice(null);
  }, [applyThemeDocument, clearDraftThemeCss, savedThemeDocument]);

  const currentDraftDocument = useMemo<PersistedThemeDocumentData | null>(() => {
    if (!themeData || !adminThemeData) return null;

    return {
      version: 2,
      reader: {
        data: themeData,
        activePresetId,
        recipes: readerRecipes,
      },
      admin: {
        data: adminThemeData,
        activePresetId: activeAdminPresetId,
      },
    };
  }, [
    activeAdminPresetId,
    activePresetId,
    adminThemeData,
    readerRecipes,
    themeData,
  ]);

  const isDraftDirty = useMemo(() => {
    if (!currentDraftDocument || !savedThemeDocument) return false;
    return JSON.stringify(currentDraftDocument) !== JSON.stringify(savedThemeDocument);
  }, [currentDraftDocument, savedThemeDocument]);

  const confirmSwitchWithDirtyDraft = async () => {
    if (!isDraftDirty) return true;
    const shouldSave = window.confirm('You have unsaved changes. Press OK to save before switching, or Cancel to switch without saving.');
    if (!shouldSave) return true;
    return await saveTheme();
  };

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

  const handlePresetSwitch = async (presetId: ThemePresetId) => {
    if (activePresetId === presetId) return;
    const canProceed = await confirmSwitchWithDirtyDraft();
    if (!canProceed) return;
    applyReaderPreset(presetId);
  };

  const handleModeSwitch = async (nextMode: 'light' | 'dark') => {
    if (theme === nextMode) return;
    const canProceed = await confirmSwitchWithDirtyDraft();
    if (!canProceed) return;
    toggleTheme();
  };

  const updateTypographyRecipe = <K extends keyof ReaderThemeRecipes['typography']>(
    role: K,
    field: keyof ReaderTypographyRoleRecipe,
    value: ReaderTypographyRoleRecipe[keyof ReaderTypographyRoleRecipe]
  ) => {
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

  const updateSharedClosedCardSurface = (
    field: 'background' | 'border' | 'radius' | 'shadow' | 'shadowHover',
    value: ThemeRecipeTokenRef
  ) => {
    setReaderRecipes((prev) => ({
      ...prev,
      surfaces: {
        ...prev.surfaces,
        storyCardClosed: {
          ...prev.surfaces.storyCardClosed,
          [field]: value,
        },
        qaCardClosed: {
          ...prev.surfaces.qaCardClosed,
          [field]: value,
        },
        galleryCardClosed: {
          ...prev.surfaces.galleryCardClosed,
          [field]: value,
        },
        card: {
          ...prev.surfaces.card,
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
    return (
      <div className={styles.componentRecipeEditor}>
        {!INHERITED_FAMILY_ROLES.includes(role) ? (
          <label className={styles.architectureField}>
            <span>Family</span>
            <select value={recipe.family} onChange={(e) => updateTypographyRecipe(role, 'family', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(FONT_FAMILY_OPTIONS, 'typography')}
            </select>
          </label>
        ) : null}
        <label className={styles.architectureField}>
          <span>Size</span>
          <select value={recipe.size} onChange={(e) => updateTypographyRecipe(role, 'size', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(FONT_SIZE_OPTIONS, 'typography')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Weight</span>
          <select value={recipe.weight} onChange={(e) => updateTypographyRecipe(role, 'weight', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(FONT_WEIGHT_OPTIONS, 'typography')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Line height</span>
          <select value={recipe.lineHeight} onChange={(e) => updateTypographyRecipe(role, 'lineHeight', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Color</span>
          <select value={recipe.color} onChange={(e) => updateTypographyRecipe(role, 'color', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getTypographyColorOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Style</span>
          <select value={recipe.fontStyle ?? 'normal'} onChange={(e) => updateTypographyRecipe(role, 'fontStyle', e.target.value as 'normal' | 'italic')}>
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
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
            {renderEditorValueOptions(getSurfaceBackgroundOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateSurfaceRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getSurfaceBorderOptions(role), 'color')}
          </select>
        </label>
        {recipe.radius ? (
          <label className={styles.architectureField}>
            <span>Radius</span>
            <select value={recipe.radius} onChange={(e) => updateSurfaceRecipe(role, 'radius', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(RADIUS_OPTIONS, 'radius')}
            </select>
          </label>
        ) : null}
        {recipe.shadow ? (
          <label className={styles.architectureField}>
            <span>Shadow</span>
            <select value={recipe.shadow} onChange={(e) => updateSurfaceRecipe(role, 'shadow', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
            </select>
          </label>
        ) : null}
        {recipe.shadowHover ? (
          <label className={styles.architectureField}>
            <span>Hover shadow</span>
            <select value={recipe.shadowHover} onChange={(e) => updateSurfaceRecipe(role, 'shadowHover', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
            </select>
          </label>
        ) : null}
        {recipe.padding ? (
          <label className={styles.architectureField}>
            <span>Padding</span>
            <select value={recipe.padding} onChange={(e) => updateSurfaceRecipe(role, 'padding', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(PADDING_OPTIONS, 'padding')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderSharedClosedCardSurfaceEditor = () => {
    const recipe = readerRecipes.surfaces.card;

    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateSharedClosedCardSurface('background', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateSharedClosedCardSurface('border', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Radius</span>
          <select value={recipe.radius ?? RADIUS_OPTIONS[0]} onChange={(e) => updateSharedClosedCardSurface('radius', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(RADIUS_OPTIONS, 'radius')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Shadow</span>
          <select value={recipe.shadow ?? SHADOW_OPTIONS[0]} onChange={(e) => updateSharedClosedCardSurface('shadow', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Hover Shadow</span>
          <select value={recipe.shadowHover ?? SHADOW_OPTIONS[0]} onChange={(e) => updateSharedClosedCardSurface('shadowHover', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
          </select>
        </label>
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
              {renderEditorValueOptions(PALETTE_ACCENT_OPTIONS, 'color')}
            </select>
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
              {renderEditorValueOptions(LINK_COLOR_OPTIONS, 'color')}
            </select>
          </label>
          <label className={styles.architectureField}>
            <span>Hover text</span>
            <select value={recipe.hoverText ?? CONTROL_TEXT_OPTIONS[0]} onChange={(e) => updateLinkRecipe('hoverText', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(LINK_COLOR_OPTIONS, 'color')}
            </select>
          </label>
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground ?? FOUNDATION_SURFACE_OPTIONS[0]} onChange={(e) => updateLinkRecipe('hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
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
            {renderEditorValueOptions(getControlBackgroundOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateControlRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getControlTextOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateControlRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getControlBorderOptions(role), 'color')}
          </select>
        </label>
        {recipe.hoverBackground ? (
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground} onChange={(e) => updateControlRecipe(role, 'hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getControlBackgroundOptions(role), 'color')}
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
            {renderEditorValueOptions(getTagBackgroundOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateTagRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getTagTextOptions(role), 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Border</span>
          <select value={recipe.border} onChange={(e) => updateTagRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(getTagBorderOptions(role), 'color')}
          </select>
        </label>
        {recipe.hoverBackground ? (
          <label className={styles.architectureField}>
            <span>Hover background</span>
            <select value={recipe.hoverBackground} onChange={(e) => updateTagRecipe(role, 'hoverBackground', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getTagBackgroundOptions(role), 'color')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderFeedbackStatesEditor = () => (
    <div className={styles.componentRecipeEditor}>
      <label className={styles.architectureField}>
        <span>Success</span>
        <select
          value={readerRecipes.surfaces.feedbackSuccessPanel.background}
          onChange={(e) => updateSurfaceRecipe('feedbackSuccessPanel', 'background', e.target.value as ThemeRecipeTokenRef)}
        >
          {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
        </select>
      </label>
      <label className={styles.architectureField}>
        <span>Warning</span>
        <select
          value={readerRecipes.surfaces.feedbackWarningPanel.background}
          onChange={(e) => updateSurfaceRecipe('feedbackWarningPanel', 'background', e.target.value as ThemeRecipeTokenRef)}
        >
          {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
        </select>
      </label>
      <label className={styles.architectureField}>
        <span>Error</span>
        <select
          value={readerRecipes.surfaces.feedbackErrorPanel.background}
          onChange={(e) => updateSurfaceRecipe('feedbackErrorPanel', 'background', e.target.value as ThemeRecipeTokenRef)}
        >
          {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
        </select>
      </label>
      <label className={styles.architectureField}>
        <span>Info</span>
        <select
          value={readerRecipes.surfaces.feedbackInfoPanel.background}
          onChange={(e) => updateSurfaceRecipe('feedbackInfoPanel', 'background', e.target.value as ThemeRecipeTokenRef)}
        >
          {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
        </select>
      </label>
    </div>
  );

  const renderOverlayEditor = (role: keyof ReaderThemeRecipes['overlays']) => {
    const recipe = readerRecipes.overlays[role];
    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Background</span>
          <select value={recipe.background} onChange={(e) => updateOverlayRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(OVERLAY_BACKGROUND_OPTIONS, 'color')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Text</span>
          <select value={recipe.text} onChange={(e) => updateOverlayRecipe(role, 'text', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(OVERLAY_TEXT_OPTIONS, 'color')}
          </select>
        </label>
        {recipe.border ? (
          <label className={styles.architectureField}>
            <span>Border</span>
            <select value={recipe.border} onChange={(e) => updateOverlayRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
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
          {renderEditorValueOptions(getIconographyColorOptions(role), 'color')}
        </select>
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
          <span>Desktop width</span>
          <input
            type="text"
            value={themeData.layout?.sidebarWidth || ''}
            onChange={(e) => handleTokenChange('layout', 'sidebarWidth', e.target.value)}
            className={styles.componentRecipeInput}
          />
        </label>
        <label className={styles.architectureField}>
          <span>Mobile width</span>
          <input
            type="text"
            value={themeData.layout?.sidebarWidthMobile || ''}
            onChange={(e) => handleTokenChange('layout', 'sidebarWidthMobile', e.target.value)}
            className={styles.componentRecipeInput}
          />
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
              <span>Background</span>
              <select
                value={themeData.components?.header?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      case 'headerBorderColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={themeData.components?.header?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'borderColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      case 'foundationBorderColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={themeData.layout?.border1Color || ''}
                onChange={(e) => handleTokenChange('layout', 'border1Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      case 'foundationBorderStrongColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Strong border</span>
              <select
                value={themeData.layout?.border2Color || ''}
                onChange={(e) => handleTokenChange('layout', 'border2Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
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
            </label>
          </div>
        );
      case 'logoMaxHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Logo max</span>
              <input
                type="text"
                value={themeData.layout?.logoMaxHeight || ''}
                onChange={(e) => handleTokenChange('layout', 'logoMaxHeight', e.target.value)}
                className={styles.componentRecipeInput}
              />
            </label>
          </div>
        );
      case 'fieldPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Padding</span>
              <select
                value={themeData.components?.input?.padding || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'padding', e.target.value)}
              >
                {renderEditorValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
            </label>
          </div>
        );
      case 'fieldBorderRadius':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border radius</span>
              <select
                value={themeData.components?.input?.borderRadius || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'borderRadius', e.target.value)}
              >
                {renderEditorValueOptions(RADIUS_OPTIONS, 'radius')}
              </select>
            </label>
          </div>
        );
      case 'storyClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Title Padding</span>
              <select
                value={readerRecipes.surfaces.storyCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('storyCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderEditorValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
            </label>
          </div>
        );
      case 'storyClosedExcerptLineHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Line Spacing</span>
              <select
                value={readerRecipes.typography.storyExcerpt.lineHeight}
                onChange={(e) => updateTypographyRecipe('storyExcerpt', 'lineHeight', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderEditorValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
              </select>
            </label>
          </div>
        );
      case 'questionClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Title Padding</span>
              <select
                value={readerRecipes.surfaces.qaCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('qaCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderEditorValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
            </label>
          </div>
        );
      case 'galleryClosedPadding':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Title Padding</span>
              <select
                value={readerRecipes.surfaces.galleryCardClosed.padding ?? 'component/card/padding'}
                onChange={(e) => updateSurfaceRecipe('galleryCardClosed', 'padding', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderEditorValueOptions(PADDING_OPTIONS, 'padding')}
              </select>
            </label>
          </div>
        );
      case 'calloutContentLineHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Line Spacing</span>
              <select
                value={readerRecipes.typography.calloutBody.lineHeight}
                onChange={(e) => updateTypographyRecipe('calloutBody', 'lineHeight', e.target.value as ThemeRecipeTokenRef)}
              >
                {renderEditorValueOptions(LINE_HEIGHT_OPTIONS, 'lineHeight')}
              </select>
            </label>
          </div>
        );
      default:
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }
  };

  const renderSelectedAttributeEditor = (
    componentId: string,
    variantId: string,
    elementId: string,
    kind: string,
    key: string,
  ) => {
    if (componentId === 'canvas' && variantId === 'reader' && elementId === 'pageSurface') {
      const recipe = readerRecipes.surfaces.canvasPage;
      return (
        <div className={styles.componentRecipeEditor}>
          <label className={styles.architectureField}>
            <span>Background</span>
            <select value={recipe.background} onChange={(e) => updateSurfaceRecipe('canvasPage', 'background', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
            </select>
          </label>
        </div>
      );
    }

    if (componentId === 'canvas' && variantId === 'reader' && elementId === 'sectionSurface') {
      const recipe = readerRecipes.surfaces.canvasSection;
      return (
        <div className={styles.componentRecipeEditor}>
          <label className={styles.architectureField}>
            <span>Background</span>
            <select value={recipe.background} onChange={(e) => updateSurfaceRecipe('canvasSection', 'background', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
            </select>
          </label>
        </div>
      );
    }

    if (componentId === 'field' && variantId === 'controls' && elementId === 'control') {
      return (
        <div className={styles.componentGroupedEditor}>
          {renderControlEditor('fieldControl')}
          {renderTokenValueEditor('fieldPadding')}
          {renderTokenValueEditor('fieldBorderRadius')}
        </div>
      );
    }

    if (componentId === 'storyCard' && variantId === 'closed') {
      if (elementId === 'title') {
        return (
          <div className={styles.componentGroupedEditor}>
            {renderTypographyEditor('storyTitle')}
            {renderTokenValueEditor('storyClosedPadding')}
          </div>
        );
      }

      if (elementId === 'excerpt') {
        return (
          <div className={styles.componentGroupedEditor}>
            {renderTypographyEditor('storyExcerpt')}
            {renderTokenValueEditor('storyClosedExcerptLineHeight')}
          </div>
        );
      }

      if (elementId === 'imageOverlay') {
        return (
          <div className={styles.componentGroupedEditor}>
            {renderTypographyEditor('storyOverlayTitle')}
            {renderOverlayEditor('card')}
          </div>
        );
      }
    }

    if (componentId === 'galleryCard' && variantId === 'closed') {
      if (elementId === 'title') {
        return (
          <div className={styles.componentGroupedEditor}>
            {renderTypographyEditor('galleryTitle')}
            {renderTokenValueEditor('galleryClosedPadding')}
          </div>
        );
      }

      if (elementId === 'imageOverlay') {
        return (
          <div className={styles.componentGroupedEditor}>
            {renderTypographyEditor('galleryOverlayTitle')}
            {renderOverlayEditor('cardStrong')}
          </div>
        );
      }
    }

    if (componentId === 'qaCard' && variantId === 'closed' && elementId === 'question') {
      return (
        <div className={styles.componentGroupedEditor}>
          {renderTypographyEditor('question')}
          {renderTokenValueEditor('questionClosedPadding')}
        </div>
      );
    }

    if (componentId === 'calloutCard' && variantId === 'closed' && elementId === 'body') {
      return (
        <div className={styles.componentGroupedEditor}>
          {renderTypographyEditor('calloutBody')}
          {renderTokenValueEditor('calloutContentLineHeight')}
        </div>
      );
    }

    return renderBindingEditor(kind, key);
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
      case 'feedbackStates':
        return renderFeedbackStatesEditor();
      case 'treatment':
        return renderTreatmentEditor(key as keyof ReaderThemeRecipes['treatments']);
      case 'layout':
        return renderLayoutEditor(key);
      case 'sharedSurface':
        return renderSharedClosedCardSurfaceEditor();
      case 'token':
        return renderTokenValueEditor(key);
      default:
        return null;
    }
  };


  const [selectedKind = '', selectedKey = ''] = selectedRecipeId.split(':') as [string?, string?];
  const selectedComponent = orderedReaderComponents.find((component) => component.id === selectedComponentId)
    ?? orderedReaderComponents[0];
  const displayedVariants = (selectedComponent?.variants ?? []).filter((variant) => {
    if (!selectedComponent) return true;
    if (selectedComponent.id === 'storyCard' || selectedComponent.id === 'galleryCard' || selectedComponent.id === 'qaCard') {
      return variant.id !== 'discovery';
    }
    return true;
  });
  const selectedVariant = displayedVariants.find((variant) => variant.id === selectedVariantId)
    ?? displayedVariants[0];
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

    if (selectedComponent.id === 'chrome' && selectedVariant.id === 'header') {
      return [
        ...baseElements,
        {
          id: 'height',
          label: 'Header height',
          description: 'Overall header height value.',
          binding: {
            kind: 'token',
            key: 'headerHeight',
          },
        },
        {
          id: 'logoMaxHeight',
          label: 'Logo max',
          description: 'Maximum logo height in the header chrome.',
          binding: {
            kind: 'token',
            key: 'logoMaxHeight',
          },
        },
      ];
    }

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
          id: 'activeTab',
          label: 'Active control',
          description: 'Shared selected-state treatment for tabs and similar controls.',
          binding: {
            kind: 'control',
            key: 'chromeActiveTab',
          },
        },
        {
          id: 'filterChip',
          label: 'Filter chip',
          description: 'Shared chip treatment used for sidebar and filter chips.',
          binding: {
            kind: 'control',
            key: 'chromeFilterChip',
          },
        },
      ];
    }

    return getVisibleVariantElements(
      selectedComponent.id,
      selectedVariant.id,
      getOrderedVariantElements(selectedComponent.id, selectedVariant.id, baseElements),
    );
  })();
  const selectedElement = selectedRecipeId
    ? selectedVariantElements.find((element) => `${element.binding.kind}:${element.binding.key}` === selectedRecipeId) ?? null
    : null;
  const selectedAttributeLabel = selectedComponent && selectedVariant && selectedElement
    ? getAttributeLabel(selectedComponent.id, selectedVariant.id, selectedElement.id, selectedElement.label)
    : 'Select an attribute';

  const workspaceColumns = `minmax(${MIN_SYSTEM_PANE_WIDTH}px, 1fr) minmax(${MIN_ADVANCED_PANE_WIDTH}px, 1fr)`;
  const valuesThemeData = themeData;

  const renderRecoveredValuesWorkspace = () => {
    if (!valuesThemeData) {
      return <span className={styles.architectureEmptyState}>Theme values are unavailable.</span>;
    }

    return (
      <>
        <section className={`${styles.section} ${styles.advancedSection}`}>
          <div className={styles.tokenGrid3Column}>
            <div className={styles.tokenCategory}>
              <h3>Colors</h3>
              <div className={styles.paletteGrid}>
                {valuesThemeData.themeColors.map((color) => (
                  <PaletteColorEditor
                    key={`theme-${color.id}`}
                    color={color}
                    onColorChange={handleColorChange}
                    onHslChange={handleHslChange}
                  />
                ))}
                {valuesThemeData.palette.map((color) => (
                  <PaletteColorEditor
                    key={`palette-${color.id}`}
                    color={color}
                    onColorChange={handleColorChange}
                    onHslChange={handleHslChange}
                  />
                ))}
              </div>
            </div>

            <div className={styles.tokenCategory}>
              <h3>Typography</h3>
              <div className={styles.tokenSubsection}>
                <h4>Families</h4>
                <TokenInput label="Sans 1" value={valuesThemeData.typography.fontFamilies.sans1} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'sans1', v)} />
                <TokenInput label="Sans 2" value={valuesThemeData.typography.fontFamilies.sans2} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'sans2', v)} />
                <TokenInput label="Sans 3" value={valuesThemeData.typography.fontFamilies.sans3} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'sans3', v)} />
                <TokenInput label="Serif 1" value={valuesThemeData.typography.fontFamilies.serif1} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'serif1', v)} />
                <TokenInput label="Serif 2" value={valuesThemeData.typography.fontFamilies.serif2} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'serif2', v)} />
                <TokenInput label="Serif 3" value={valuesThemeData.typography.fontFamilies.serif3} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'serif3', v)} />
                <TokenInput label="Handwriting 1" value={valuesThemeData.typography.fontFamilies.handwriting1} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'handwriting1', v)} />
                <TokenInput label="Handwriting 2" value={valuesThemeData.typography.fontFamilies.handwriting2} onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'handwriting2', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Sizes</h4>
                <FontSizeTokenInput label="XS" value={valuesThemeData.typography.fontSizes.xs} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xs', v)} />
                <FontSizeTokenInput label="SM" value={valuesThemeData.typography.fontSizes.sm} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'sm', v)} />
                <FontSizeTokenInput label="Base" value={valuesThemeData.typography.fontSizes.base} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'base', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.typography.fontSizes.lg} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.typography.fontSizes.xl} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xl', v)} />
                <FontSizeTokenInput label="2XL" value={valuesThemeData.typography.fontSizes['2xl']} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '2xl', v)} />
                <FontSizeTokenInput label="3XL" value={valuesThemeData.typography.fontSizes['3xl']} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '3xl', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Weights</h4>
                <FontWeightInput label="Normal" value={valuesThemeData.typography.fontWeights.normal} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'normal', v)} />
                <FontWeightInput label="Medium" value={valuesThemeData.typography.fontWeights.medium} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'medium', v)} />
                <FontWeightInput label="Semibold" value={valuesThemeData.typography.fontWeights.semibold} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'semibold', v)} />
                <FontWeightInput label="Bold" value={valuesThemeData.typography.fontWeights.bold} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'bold', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Fluid Sizes</h4>
                <ExtendedTokenInput label="Fld1" value={valuesThemeData.typography.fluidFontSizes.size1} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size1', v)} />
                <ExtendedTokenInput label="Fld2" value={valuesThemeData.typography.fluidFontSizes.size2} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size2', v)} />
                <ExtendedTokenInput label="Fld3" value={valuesThemeData.typography.fluidFontSizes.size3} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size3', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Line Height</h4>
                <FontSizeTokenInput label="Base" value={valuesThemeData.typography.lineHeights.base} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'base', v)} />
                <FontSizeTokenInput label="Tight" value={valuesThemeData.typography.lineHeights.tight} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'tight', v)} />
                <FontSizeTokenInput label="Relaxed" value={valuesThemeData.typography.lineHeights.relaxed} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'relaxed', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Styles</h4>
                <div className={styles.fontSizeTokenInput}>
                  <label>Normal</label>
                  <select value={valuesThemeData.typography.styles.normal} onChange={(e) => handleNestedTokenChange('typography', 'styles', 'normal', e.target.value)}>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                <div className={styles.fontSizeTokenInput}>
                  <label>Italic</label>
                  <select value={valuesThemeData.typography.styles.italic} onChange={(e) => handleNestedTokenChange('typography', 'styles', 'italic', e.target.value)}>
                    <option value="italic">Italic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.tokenCategory}>
              <h3>Structure</h3>
              <div className={styles.tokenSubsection}>
                <h4>Card Spacing</h4>
                <FontSizeTokenInput label="Unit" value={valuesThemeData.spacing.unit} onChange={(v) => handleTokenChange('spacing', 'unit', v)} />
                <SpacingMultiplierInput label="SM Factor" value={valuesThemeData.spacing.smMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'smMultiplier', v)} />
                <SpacingMultiplierInput label="MD Factor" value={valuesThemeData.spacing.mdMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'mdMultiplier', v)} />
                <SpacingMultiplierInput label="LG Factor" value={valuesThemeData.spacing.lgMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'lgMultiplier', v)} />
                <SpacingMultiplierInput label="XL Factor" value={valuesThemeData.spacing.xlMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'xlMultiplier', v)} />
                <FontSizeTokenInput label="SM" value={valuesThemeData.spacing.sm} onChange={(v) => handleTokenChange('spacing', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={valuesThemeData.spacing.md} onChange={(v) => handleTokenChange('spacing', 'md', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.spacing.lg} onChange={(v) => handleTokenChange('spacing', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.spacing.xl} onChange={(v) => handleTokenChange('spacing', 'xl', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Control Spacing</h4>
                <SpacingMultiplierInput label="XS Factor" value={valuesThemeData.spacing.xsMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'xsMultiplier', v)} />
                <FontSizeTokenInput label="XS" value={valuesThemeData.spacing.xs} onChange={(v) => handleTokenChange('spacing', 'xs', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Border</h4>
                <FontSizeTokenInput label="Thin" value={valuesThemeData.borders.widths.thin} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thin', v)} />
                <FontSizeTokenInput label="Medium" value={valuesThemeData.borders.widths.medium} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'medium', v)} />
                <FontSizeTokenInput label="Thick" value={valuesThemeData.borders.widths.thick} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thick', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Radii</h4>
                <FontSizeTokenInput label="SM" value={valuesThemeData.borders.radius.sm} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={valuesThemeData.borders.radius.md} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'md', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.borders.radius.lg} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.borders.radius.xl} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'xl', v)} />
                <FontSizeTokenInput label="Full" value={valuesThemeData.borders.radius.full} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'full', v)} />
              </div>
              <div className={styles.tokenSubsection}>
                <h4>Shadows</h4>
                <FontSizeTokenInput label="Strength Light" value={valuesThemeData.shadows.strength} onChange={(v) => handleTokenChange('shadows', 'strength', v)} />
                <FontSizeTokenInput label="Strength Dark" value={valuesThemeData.shadows.strengthDark} onChange={(v) => handleTokenChange('shadows', 'strengthDark', v)} />
                <ExtendedTokenInput label="Color" value={valuesThemeData.shadows.color} onChange={(v) => handleTokenChange('shadows', 'color', v)} />
                <ExtendedTokenInput label="SM" value={valuesThemeData.shadows.sm} onChange={(v) => handleTokenChange('shadows', 'sm', v)} />
                <ExtendedTokenInput label="MD" value={valuesThemeData.shadows.md} onChange={(v) => handleTokenChange('shadows', 'md', v)} />
                <ExtendedTokenInput label="LG" value={valuesThemeData.shadows.lg} onChange={(v) => handleTokenChange('shadows', 'lg', v)} />
                <ExtendedTokenInput label="XL" value={valuesThemeData.shadows.xl} onChange={(v) => handleTokenChange('shadows', 'xl', v)} />
              </div>
            </div>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIntro}>
            <h1 className={styles.headerTitle}>Theme Management</h1>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={discardDraft}
              disabled={!isDraftDirty}
              className={`${styles.secondaryActionButton} ${isDraftDirty ? styles.secondaryActionButtonActive : ''}`}
            >
              Discard
            </button>
            <button 
              onClick={saveTheme}
              disabled={saving || !THEME_SAVE_ENABLED || !isDraftDirty}
              className={`${styles.saveButton} ${isDraftDirty ? styles.saveButtonActive : ''}`}
            >
              {saving ? 'Saving...' : THEME_SAVE_ENABLED ? 'Save' : 'Save Paused'}
            </button>
          </div>
        </div>
        {saveNotice && saveNotice.type !== 'success' ? (
          <div
            className={`${styles.saveNotice} ${saveNotice.type === 'warning' ? styles.saveNoticeWarning : styles.saveNoticeError}`}
            role="alert"
            aria-live="assertive"
          >
            <strong>{saveNotice.message}</strong>
            {saveNotice.detail ? <span>{saveNotice.detail}</span> : null}
          </div>
        ) : null}
      </div>

      <main className={styles.mainContent}>
        <div className={styles.workspaceToolbar}>
          <div className={styles.valuesControlRow}>
            <div className={styles.toggleGroup} aria-label="Color mode">
              <button
                type="button"
                className={theme === 'light' ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => { void handleModeSwitch('light'); }}
              >
                Light
              </button>
              <button
                type="button"
                className={theme === 'dark' ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => { void handleModeSwitch('dark'); }}
              >
                Dark
              </button>
            </div>
            <div className={styles.toggleGroup} aria-label="Reader theme">
              {READER_PRESET_IDS.map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  className={activePresetId === presetId ? styles.toggleButtonActive : styles.toggleButton}
                  onClick={() => { void handlePresetSwitch(presetId); }}
                >
                  {THEME_PRESET_META[presetId].label}
                </button>
              ))}
            </div>
          </div>
        </div>
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
                <div className={styles.componentSelectorGroups}>
                  <section className={styles.componentSelectorGroup}>
                    <div className={styles.componentSelectorGroupHeader}>
                      <strong>Navigator</strong>
                    </div>
                    <div className={styles.navigatorSectionTabs}>
                      <button
                        type="button"
                        className={selectedNavigatorSection === 'core' ? styles.navigatorSectionTabActive : styles.navigatorSectionTab}
                        onClick={() => {
                          setSelectedNavigatorSection('core');
                          const firstComponent = coreReaderComponents[0];
                          const firstVariant = firstComponent?.variants[0];
                          if (firstComponent) {
                            setSelectedComponentId(firstComponent.id);
                            setSelectedVariantId(firstVariant?.id ?? '');
                            setSelectedRecipeId(getDefaultAttributeId(firstComponent, firstVariant?.id));
                          }
                        }}
                      >
                        Core
                      </button>
                      <button
                        type="button"
                        className={selectedNavigatorSection === 'cards' ? styles.navigatorSectionTabActive : styles.navigatorSectionTab}
                        onClick={() => {
                          setSelectedNavigatorSection('cards');
                          const firstComponent = cardComponents[0];
                          const firstVariant = firstComponent?.variants[0];
                          if (firstComponent) {
                            setSelectedComponentId(firstComponent.id);
                            setSelectedVariantId(firstVariant?.id ?? '');
                            setSelectedRecipeId(getDefaultAttributeId(firstComponent, firstVariant?.id));
                          }
                        }}
                      >
                        Cards
                      </button>
                    </div>
                    <div className={styles.componentSelectorRow}>
                      {visibleNavigatorComponents.map((component) => (
                        <button
                          key={component.id}
                          type="button"
                          className={component.id === selectedComponentId ? styles.componentSelectorActive : styles.componentSelectorButton}
                          onClick={() => {
                            setSelectedNavigatorSection(getNavigatorSectionForComponent(component.id));
                            setSelectedComponentId(component.id);
                            setSelectedVariantId(component.variants[0]?.id ?? '');
                            setSelectedRecipeId(getDefaultAttributeId(component, component.variants[0]?.id));
                          }}
                        >
                          <strong>{COMPONENT_TAB_LABELS[component.id] ?? component.label}</strong>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                <div className={styles.componentEditorPanel}>
                  <div className={styles.componentEditorHeader}>
                    <strong>{selectedComponent ? (COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label) : 'Component'}</strong>
                  </div>
                  {displayedVariants.length > 1 ? (
                    <div className={styles.componentVariantTabs}>
                      {displayedVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={variant.id === selectedVariant?.id ? styles.componentVariantTabActive : styles.componentVariantTab}
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setSelectedRecipeId(getDefaultAttributeId(selectedComponent, variant.id));
                          }}
                        >
                          {selectedComponent ? getVariantLabel(selectedComponent.id, variant.id, variant.label) : variant.label}
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
                  <div className={styles.componentActiveEditor}>
                    <div className={styles.componentActiveEditorHeader}>
                      <strong>{selectedAttributeLabel}</strong>
                    </div>
                    {selectedComponent && selectedVariant && selectedElement
                      ? renderSelectedAttributeEditor(
                        selectedComponent.id,
                        selectedVariant.id,
                        selectedElement.id,
                        selectedKind,
                        selectedKey,
                      )
                      : <span className={styles.architectureEmptyState}>Select an attribute to edit.</span>}
                  </div>
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
              {renderRecoveredValuesWorkspace()}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

