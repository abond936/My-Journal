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
  type CanvasTextureToken,
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
type NavigatorSectionId = 'core' | 'cards' | 'workbench';
type ThemeTargetScope = 'reader' | 'workbench';

type ThemeRecord = Record<string, unknown>;
type TokenOptionGroup = {
  label: string;
  options: ThemeRecipeTokenRef[];
};
type ValueOptionKind = 'color' | 'length' | 'typography' | 'shadow' | 'padding' | 'radius' | 'lineHeight' | 'generic';
type ValueSectionId =
  | 'colors.core'
  | 'colors.overlays'
  | 'colors.states'
  | 'typography.families'
  | 'typography.sizes'
  | 'typography.weights'
  | 'typography.fluid'
  | 'typography.lineHeights'
  | 'structure.layout'
  | 'structure.spacing'
  | 'structure.borders'
  | 'structure.radii'
  | 'structure.shadows';
type AttributeAssignment = {
  label: string;
  value: string;
};
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

const CANVAS_TEXTURE_OPTIONS: Array<{ value: CanvasTextureToken; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fineGrain', label: 'Fine grain' },
  { value: 'paperWash', label: 'Paper wash' },
];

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
    'shared/card/background': 'Use General',
    'shared/card/border': 'Use General',
    'shared/card/radius': 'Use General',
    'shared/card/shadow': 'Use General',
    'shared/card/shadowHover': 'Use General',
    'shared/card/padding': 'Use General',
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
    'semantic/reader/overlay-scrim': 'Overlay Wash (Adaptive)',
    'semantic/reader/overlay-scrim-strong': 'Overlay Wash Strong (Adaptive)',
    'semantic/reader/covered-fade': 'Covered Fade (Adaptive)',
    'semantic/reader/covered-fade-strong': 'Covered Fade Strong (Adaptive)',
    'gradient/bottomOverlay': 'Gradient Fade (Fixed)',
    'gradient/bottomOverlayStrong': 'Gradient Fade Strong (Fixed)',
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

const DeferredTextInput: React.FC<{
  className: string;
  inputClassName?: string;
  label: string;
  value: string;
  onCommit: (value: string) => void;
  type?: 'text' | 'number';
  step?: string;
  tokenPath?: string;
}> = ({ className, inputClassName, label, value, onCommit, type = 'text', step, tokenPath }) => {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitValue = () => {
    if (draftValue !== value) {
      onCommit(draftValue);
    }
  };

  return (
    <div className={className}>
      <label>{label}</label>
      <div className={styles.tokenInputControl}>
        <input
          className={inputClassName}
          type={type}
          step={step}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              setDraftValue(value);
              e.currentTarget.blur();
            }
          }}
        />
        {tokenPath ? <code className={styles.tokenInputPath}>{tokenPath}</code> : null}
      </div>
    </div>
  );
};

const TokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  tokenPath?: string;
}> = ({ label, value, onChange, type = 'text', tokenPath }) => (
  <DeferredTextInput
    className={styles.tokenInput}
    label={label}
    value={value}
    onCommit={onChange}
    type={type}
    tokenPath={tokenPath}
  />
);

const FontSizeTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  tokenPath?: string;
}> = ({ label, value, onChange, tokenPath }) => (
  <DeferredTextInput
    className={styles.fontSizeTokenInput}
    label={label}
    value={value}
    onCommit={onChange}
    tokenPath={tokenPath}
  />
);

const ExtendedTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  tokenPath?: string;
}> = ({ label, value, onChange, tokenPath }) => (
  <DeferredTextInput
    className={styles.extendedTokenInput}
    label={label}
    value={value}
    onCommit={onChange}
    tokenPath={tokenPath}
  />
);

const FontWeightInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <DeferredTextInput
    className={styles.fontSizeTokenInput}
    label={label}
    value={value}
    onCommit={onChange}
    type="number"
  />
);

const SpacingMultiplierInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <DeferredTextInput
    className={styles.fontSizeTokenInput}
    label={label}
    value={value}
    onCommit={onChange}
    type="number"
    step="0.25"
  />
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
  header: 'Header',
  sidebar: 'Sidebar',
  field: 'Controls',
  window: 'Window',
  feedback: 'Feedback',
  workbenchHeader: 'Header',
  workbenchSidebar: 'Sidebar',
  workbenchShell: 'Shell',
  workbenchTabs: 'Tabs',
  workbenchControls: 'Controls',
  workbenchFeedback: 'Feedback',
  cardGeneral: 'General',
  storyCard: 'Story',
  galleryCard: 'Gallery',
  lightbox: 'Lightbox',
  qaCard: 'Question',
  discoverySupport: 'Discovery',
  quoteCard: 'Quote',
  calloutCard: 'Callout',
};

const COMPONENT_ORDER = [
  'canvas',
  'header',
  'sidebar',
  'window',
  'feedback',
  'field',
  'workbenchHeader',
  'workbenchSidebar',
  'workbenchShell',
  'workbenchTabs',
  'workbenchControls',
  'workbenchFeedback',
  'cardGeneral',
  'storyCard',
  'galleryCard',
  'lightbox',
  'qaCard',
  'quoteCard',
  'calloutCard',
  'discoverySupport',
] as const;

const CORE_READER_COMPONENT_IDS = ['canvas', 'header', 'sidebar', 'window', 'field', 'feedback'] as const;
const WORKBENCH_COMPONENT_IDS = ['workbenchHeader', 'workbenchSidebar', 'workbenchShell', 'workbenchTabs', 'workbenchControls', 'workbenchFeedback'] as const;
const CARD_COMPONENT_IDS = ['cardGeneral', 'storyCard', 'galleryCard', 'lightbox', 'qaCard', 'quoteCard', 'calloutCard', 'discoverySupport'] as const;
const isWorkbenchComponentId = (componentId: string): boolean => (
  WORKBENCH_COMPONENT_IDS.includes(componentId as (typeof WORKBENCH_COMPONENT_IDS)[number])
);

const getNavigatorSectionForComponent = (componentId: string): NavigatorSectionId => {
  if (CORE_READER_COMPONENT_IDS.includes(componentId as (typeof CORE_READER_COMPONENT_IDS)[number])) return 'core';
  if (WORKBENCH_COMPONENT_IDS.includes(componentId as (typeof WORKBENCH_COMPONENT_IDS)[number])) return 'workbench';
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
  'header.main': 'Main',
  'sidebar.main': 'Main',
  'workbenchHeader.main': 'Main',
  'workbenchSidebar.main': 'Main',
  'workbenchShell.main': 'Main',
  'workbenchTabs.navigation': 'Navigation',
  'workbenchControls.controls': 'Controls',
  'workbenchFeedback.general': 'General',
  'workbenchFeedback.states': 'States',
  'storyCard.closed': 'Closed',
  'storyCard.open': 'Open',
  'galleryCard.closed': 'Closed',
  'galleryCard.open': 'Open',
  'lightbox.fullscreen': 'Fullscreen',
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
  'header.main.surface': 'Header Surface',
  'header.main.text': 'Header Text',
  'header.main.icon': 'Header Icon',
  'header.main.height': 'Header Height',
  'header.main.logoMaxHeight': 'Logo Max',
  'sidebar.main.surface': 'Sidebar Surface',
  'sidebar.main.text': 'Sidebar Text',
  'sidebar.main.meta': 'Sidebar Meta',
  'sidebar.main.width': 'Sidebar Width',
  'sidebar.main.activeTab': 'Active Tab',
  'sidebar.main.inlineLink': 'Inline Link',
  'sidebar.main.icon': 'Icon Color',
  'workbenchHeader.main.surface': 'Header Surface',
  'workbenchHeader.main.text': 'Header Text',
  'workbenchHeader.main.icon': 'Header Icon',
  'workbenchHeader.main.height': 'Header Height',
  'workbenchSidebar.main.surface': 'Sidebar Surface',
  'workbenchSidebar.main.border': 'Sidebar Border',
  'workbenchSidebar.main.width': 'Sidebar Width',
  'workbenchShell.main.surface': 'Shell Surface',
  'workbenchShell.main.frame': 'Shell Frame',
  'workbenchShell.main.elevation': 'Shell Elevation',
  'workbenchShell.main.text': 'Shell Text',
  'workbenchShell.main.meta': 'Shell Meta',
  'workbenchTabs.navigation.text': 'Tab Text',
  'workbenchTabs.navigation.meta': 'Supporting Meta',
  'workbenchTabs.navigation.activeTab': 'Active Tab',
  'workbenchTabs.navigation.icon': 'Icon Color',
  'workbenchControls.controls.title': 'Control Title',
  'workbenchControls.controls.label': 'Control Label',
  'workbenchControls.controls.meta': 'Control Meta',
  'workbenchControls.controls.hint': 'Control Hint',
  'workbenchControls.controls.control': 'Neutral Control',
  'workbenchControls.controls.controlText': 'Control Text',
  'workbenchControls.controls.controlStrong': 'Selected Control',
  'workbenchControls.controls.chip': 'Chip',
  'workbenchFeedback.general.surface': 'Panel Surface',
  'workbenchFeedback.general.title': 'Title',
  'workbenchFeedback.general.meta': 'Text',
  'workbenchFeedback.general.hint': 'Hint',
  'workbenchFeedback.general.action': 'Action',
  'workbenchFeedback.states.colors': 'State Colors',
  'field.controls.label': 'Label',
  'field.controls.meta': 'Meta',
  'field.controls.hint': 'Hint',
  'field.controls.title': 'Title',
  'field.controls.control': 'Control Surface',
  'field.controls.controlText': 'Control Text',
  'field.controls.controlStrong': 'Selected Surface',
  'field.controls.activeTab': 'Active Control',
  'field.controls.chip': 'Filter Chip',
  'field.controls.padding': 'Padding',
  'field.controls.borderRadius': 'Border Radius',
  'window.floating.surface': 'Window Surface',
  'window.floating.frame': 'Window Frame',
  'window.floating.elevation': 'Window Elevation',
  'cardGeneral.shared.surface': 'Surface',
  'cardGeneral.shared.overlayBackground': 'Covered Fade',
  'cardGeneral.shared.galleryOverlay': 'Gallery Overlay',
  'lightbox.fullscreen.backdrop': 'Backdrop',
  'lightbox.fullscreen.control': 'Control Surface',
  'lightbox.fullscreen.caption': 'Caption',
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
  'storyCard.closed.surface': 'Background',
  'storyCard.closed.title': 'Title',
  'storyCard.closed.imageOverlay': 'Overlay Text',
  'storyCard.closed.excerpt': 'Excerpt',
  'storyCard.closed.excerptLineHeight': 'Line Spacing',
  'storyCard.discovery.title': 'Compact Title',
  'storyCard.discovery.excerpt': 'Excerpt',
  'storyCard.discovery.meta': 'Meta',
  'galleryCard.closed.surface': 'Background',
  'galleryCard.closed.title': 'Title',
  'galleryCard.closed.imageOverlay': 'Overlay Text',
  'galleryCard.discovery.sectionTitle': 'Section Title',
  'galleryCard.discovery.title': 'Compact Title',
  'galleryCard.discovery.caption': 'Caption',
  'galleryCard.discovery.meta': 'Group/Meta Text',
  'qaCard.closed.surface': 'Background',
  'quoteCard.closed.surface': 'Background',
  'calloutCard.closed.surface': 'Background',
  'qaCard.closed.question': 'Question',
  'qaCard.closed.overlayQuestion': 'Overlay Text',
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
  'calloutCard.closed.watermark': 'Watermark',
};

const ATTRIBUTE_IMPACT_NOTES: Record<string, string> = {
  'cardGeneral.shared.surface': 'Shared across Story, Gallery, Question, Quote, and Callout closed cards.',
  'storyCard.closed.surface': 'Card-family background, border, radius, and shadow. Use General keeps Story following the shared closed-card surface.',
  'galleryCard.closed.surface': 'Card-family background, border, radius, and shadow. Use General keeps Gallery following the shared closed-card surface.',
  'qaCard.closed.surface': 'Card-family background, border, radius, and shadow. Use General keeps Question following the shared closed-card surface.',
  'quoteCard.closed.surface': 'Card-family background, border, radius, and shadow for Quote cards.',
  'calloutCard.closed.surface': 'Card-family background, border, radius, and shadow for Callout cards.',
  'cardGeneral.shared.overlayBackground': 'Shared by Story cards and Question cards with a cover image.',
  'cardGeneral.shared.galleryOverlay': 'Shared by covered Gallery cards and gallery overlay chips.',
  'lightbox.fullscreen.backdrop': 'Shared by fullscreen gallery lightbox backdrops.',
  'lightbox.fullscreen.control': 'Shared by fullscreen gallery lightbox controls.',
  'lightbox.fullscreen.caption': 'Shared by lightbox captions and other media-caption surfaces.',
  'field.controls.label': 'Shared across reader fields and nearby support chrome.',
  'field.controls.meta': 'Shared across reader fields and nearby support chrome.',
  'field.controls.hint': 'Shared across reader fields and nearby support chrome.',
  'field.controls.title': 'Shared across empty states, helper panels, and support chrome.',
  'field.controls.control': 'Shared across neutral field-style controls and selectors.',
  'field.controls.controlText': 'Shared across neutral field-style controls and selectors.',
  'field.controls.controlStrong': 'Shared across selected field-style controls and selectors.',
  'field.controls.chip': 'Shared across filter chips and similar support controls.',
  'sidebar.main.text': 'Shared across sidebar navigation text and chrome section labels.',
  'sidebar.main.meta': 'Shared across sidebar counts and secondary chrome text.',
  'window.floating.surface': 'Shared by floating reader windows and dialog shells.',
  'window.floating.frame': 'Shared by floating reader windows and dialog shells.',
  'window.floating.elevation': 'Shared by floating reader windows and dialog shells.',
  'sidebar.main.activeTab': 'Shared across active sidebar tabs and other solid reader control treatments.',
  'workbenchHeader.main.surface': 'Shared across the admin/workbench top chrome band.',
  'workbenchHeader.main.text': 'Shared across admin/workbench top chrome text.',
  'workbenchHeader.main.icon': 'Shared across admin/workbench top chrome icons.',
  'workbenchHeader.main.height': 'Shared structural height for the admin/workbench top chrome band.',
  'workbenchSidebar.main.surface': 'Shared across admin/workbench sidebar and drawer surfaces.',
  'workbenchSidebar.main.border': 'Shared across admin/workbench sidebar and drawer borders.',
  'workbenchSidebar.main.width': 'Shared structural width for admin/workbench sidebar surfaces.',
  'workbenchShell.main.surface': 'Shared across admin/workbench panes, dialogs, and floating authoring shells.',
  'workbenchShell.main.frame': 'Shared across admin/workbench panes, dialogs, and floating authoring shells.',
  'workbenchShell.main.elevation': 'Shared across admin/workbench panes, dialogs, and floating authoring shells.',
  'workbenchShell.main.text': 'Shared across admin/workbench shell copy and nearby chrome.',
  'workbenchShell.main.meta': 'Shared across admin/workbench secondary shell copy and metadata.',
  'workbenchTabs.navigation.text': 'Shared across admin/workbench tabs and nearby navigation copy.',
  'workbenchTabs.navigation.meta': 'Shared across admin/workbench secondary navigation copy.',
  'workbenchTabs.navigation.activeTab': 'Shared across selected admin/workbench tabs and similar navigation states.',
  'workbenchTabs.navigation.icon': 'Shared across admin/workbench navigation icons.',
  'workbenchControls.controls.title': 'Shared across admin/workbench panel titles and grouped control headings.',
  'workbenchControls.controls.label': 'Shared across admin/workbench field labels and tool labels.',
  'workbenchControls.controls.meta': 'Shared across admin/workbench secondary field and tool copy.',
  'workbenchControls.controls.hint': 'Shared across admin/workbench helper text and inline hints.',
  'workbenchControls.controls.control': 'Shared across neutral admin/workbench fields, selectors, and tool controls.',
  'workbenchControls.controls.controlText': 'Shared across admin/workbench field and selector text.',
  'workbenchControls.controls.controlStrong': 'Shared across selected admin/workbench controls and emphasized tool states.',
  'workbenchControls.controls.chip': 'Shared across admin/workbench chips, filters, and tag-like selections.',
  'workbenchFeedback.general.surface': 'Shared across admin/workbench empty, loading, and notice panels.',
  'workbenchFeedback.general.title': 'Shared across admin/workbench feedback titles.',
  'workbenchFeedback.general.meta': 'Shared across admin/workbench feedback body text.',
  'workbenchFeedback.general.hint': 'Shared across admin/workbench feedback helper text.',
  'workbenchFeedback.general.action': 'Shared across admin/workbench feedback actions.',
  'workbenchFeedback.states.colors': 'Shared across admin/workbench success, warning, error, and info state surfaces.',
};

const SHARED_ATTRIBUTE_IDS = new Set(Object.keys(ATTRIBUTE_IMPACT_NOTES));

const ATTRIBUTE_VALUE_NOTES: Record<string, string> = {
  'cardGeneral.shared.overlayBackground': 'Adaptive values switch with light and dark mode. Fixed gradients stay exactly the same in both modes.',
  'cardGeneral.shared.galleryOverlay': 'Adaptive values switch with light and dark mode. Fixed gradients stay exactly the same in both modes.',
  'lightbox.fullscreen.backdrop': 'Adaptive values switch with light and dark mode. Fixed gradients stay exactly the same in both modes.',
  'lightbox.fullscreen.control': 'Adaptive overlay values switch with light and dark mode. Fixed gradients stay exactly the same in both modes.',
  'window.floating.elevation': 'Choose a shared shadow size here. Light and dark mode adaptation comes from the global shadow strength values, not from separate adaptive shadow selections.',
  'cardGeneral.shared.surface': 'Choose shared card shadow sizes here. Light and dark mode adaptation comes from the global shadow strength values, not from separate adaptive shadow selections.',
};

const getAttributeOwnership = (
  componentId: string,
  variantId: string,
  elementId: string,
): 'Shared' | 'Local' => (
  SHARED_ATTRIBUTE_IDS.has(`${componentId}.${variantId}.${elementId}`) ? 'Shared' : 'Local'
);

const getAttributeLabel = (componentId: string, variantId: string, elementId: string, fallback: string): string => (
  ATTRIBUTE_LABELS[`${componentId}.${variantId}.${elementId}`] ?? fallback
);

const VALUE_SECTION_LABELS: Record<ValueSectionId, string> = {
  'colors.core': 'Named colors',
  'colors.overlays': 'Overlay values',
  'colors.states': 'State colors',
  'typography.families': 'Font families',
  'typography.sizes': 'Font sizes',
  'typography.weights': 'Font weights',
  'typography.fluid': 'Fluid sizes',
  'typography.lineHeights': 'Line heights',
  'structure.layout': 'Layout metrics',
  'structure.spacing': 'Spacing',
  'structure.borders': 'Borders',
  'structure.radii': 'Radii',
  'structure.shadows': 'Shadows',
};

const getRelevantValueSectionIds = (
  componentId: string,
  variantId: string,
  elementId: string,
  kind: string,
  key: string,
): ValueSectionId[] => {
  const sections = new Set<ValueSectionId>();

  if (kind === 'overlay') {
    sections.add('colors.overlays');
  }

  if (kind === 'feedbackStates') {
    sections.add('colors.states');
  }

  if (kind === 'typography') {
    sections.add('typography.families');
    sections.add('typography.sizes');
    sections.add('typography.weights');
    sections.add('typography.lineHeights');
    if (key === 'storyOverlayTitle' || key === 'galleryOverlayTitle' || key === 'questionOverlay' || key === 'caption') {
      sections.add('colors.overlays');
    } else {
      sections.add('colors.core');
    }
  }

  if (kind === 'surface' || kind === 'sharedSurface') {
    sections.add('colors.core');
    sections.add('structure.radii');
    sections.add('structure.shadows');
    if (key === 'feedbackSuccessPanel' || key === 'feedbackWarningPanel' || key === 'feedbackErrorPanel' || key === 'feedbackInfoPanel') {
      sections.add('colors.states');
    }
  }

  if (kind === 'control') {
    if (key === 'lightboxControl') {
      sections.add('colors.overlays');
    } else {
      sections.add('colors.core');
    }
  }

  if (kind === 'layout') {
    sections.add('structure.layout');
  }

  if (kind === 'token') {
    if (key.includes('LineHeight')) {
      sections.add('typography.lineHeights');
    }
    if (key.includes('Padding')) {
      sections.add('structure.spacing');
    }
    if (key.toLowerCase().includes('radius')) {
      sections.add('structure.radii');
    }
    if (key.toLowerCase().includes('border')) {
      sections.add('structure.borders');
      sections.add('colors.core');
    }
    if (key === 'headerHeight' || key === 'logoMaxHeight' || key === 'sidebarWidth' || key === 'foundationBorderColor' || key === 'foundationBorderStrongColor') {
      sections.add('structure.layout');
    }
  }

  if (componentId === 'window' && variantId === 'floating' && elementId === 'elevation') {
    sections.add('structure.shadows');
  }

  if (componentId === 'cardGeneral' && variantId === 'shared' && elementId === 'surface') {
    sections.add('structure.spacing');
  }

  if (!sections.size) {
    sections.add('colors.core');
  }

  return Array.from(sections);
};

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

const HEADER_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'header',
  label: 'Header',
  description: 'Reader header surface and its structural sizing. Shared labels and controls stay with their own roles.',
  variants: [
    {
      id: 'main',
      label: 'Main',
      elements: [
        { id: 'surface', label: 'Header surface', binding: { kind: 'surface', key: 'chromeToolbar' } },
        { id: 'text', label: 'Header text', binding: { kind: 'token', key: 'headerTextColor' } },
        { id: 'icon', label: 'Header icon', binding: { kind: 'token', key: 'headerIconColor' } },
        { id: 'height', label: 'Header height', binding: { kind: 'token', key: 'headerHeight' } },
        { id: 'logoMaxHeight', label: 'Logo max height', binding: { kind: 'token', key: 'logoMaxHeight' } },
      ],
    },
  ],
};

const SIDEBAR_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'sidebar',
  label: 'Sidebar',
  description: 'Reader sidebar surface plus its navigation-specific controls and sizing.',
  variants: [
    {
      id: 'main',
      label: 'Main',
      elements: [
        { id: 'surface', label: 'Sidebar surface', binding: { kind: 'surface', key: 'chromeSidebar' } },
        { id: 'text', label: 'Sidebar text', binding: { kind: 'typography', key: 'chromeText' } },
        { id: 'meta', label: 'Sidebar meta', binding: { kind: 'typography', key: 'chromeMeta' } },
        { id: 'width', label: 'Sidebar width', binding: { kind: 'layout', key: 'sidebarWidth' } },
        { id: 'activeTab', label: 'Active tab', binding: { kind: 'control', key: 'chromeActiveTab' } },
        { id: 'inlineLink', label: 'Inline link', binding: { kind: 'control', key: 'inlineLink' } },
        { id: 'icon', label: 'Icon color', binding: { kind: 'iconography', key: 'chrome' } },
      ],
    },
  ],
};

const WINDOW_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'window',
  label: 'Window',
  description: 'Floating reader windows and dialogs that should feel visibly layered above the page.',
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
};

const LIGHTBOX_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'lightbox',
  label: 'Lightbox',
  description: 'Fullscreen gallery media backdrop and controls. This is separate from Gallery cards because it has a different visual job and contrast requirement.',
  variants: [
    {
      id: 'fullscreen',
      label: 'Fullscreen',
      elements: [
        {
          id: 'backdrop',
          label: 'Backdrop',
          description: 'Shared backdrop behind fullscreen gallery media.',
          binding: { kind: 'overlay', key: 'lightboxBackdrop' },
        },
        {
          id: 'control',
          label: 'Control surface',
          description: 'Shared lightbox control treatment for media navigation and close actions.',
          binding: { kind: 'control', key: 'lightboxControl' },
        },
        {
          id: 'caption',
          label: 'Caption',
          description: 'Shared caption role reused by lightbox and other media captions.',
          binding: { kind: 'typography', key: 'caption' },
        },
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

const WORKBENCH_HEADER_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchHeader',
  label: 'Workbench Header',
  description: 'Admin/workbench top chrome band, including its surface, text, icon, and structural sizing.',
  variants: [
    {
      id: 'main',
      label: 'Main',
      elements: [
        { id: 'surface', label: 'Header surface', binding: { kind: 'token', key: 'headerBackgroundColor' } },
        { id: 'text', label: 'Header text', binding: { kind: 'token', key: 'headerTextColor' } },
        { id: 'icon', label: 'Header icon', binding: { kind: 'token', key: 'headerIconColor' } },
        { id: 'height', label: 'Header height', binding: { kind: 'token', key: 'headerHeight' } },
      ],
    },
  ],
};

const WORKBENCH_SIDEBAR_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchSidebar',
  label: 'Workbench Sidebar',
  description: 'Admin/workbench sidebar and drawer chrome, including surface, border, and shared width.',
  variants: [
    {
      id: 'main',
      label: 'Main',
      elements: [
        { id: 'surface', label: 'Sidebar surface', binding: { kind: 'token', key: 'workbenchSidebarSurface' } },
        { id: 'border', label: 'Sidebar border', binding: { kind: 'token', key: 'workbenchSidebarBorder' } },
        { id: 'width', label: 'Sidebar width', binding: { kind: 'layout', key: 'sidebarWidth' } },
      ],
    },
  ],
};

const WORKBENCH_SHELL_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchShell',
  label: 'Workbench Shell',
  description: 'Shared admin/workbench shell surfaces for dialogs, panes, tool panels, and other floating authoring containers.',
  variants: [
    {
      id: 'main',
      label: 'Main',
      elements: [
        {
          id: 'surface',
          label: 'Shell surface',
          description: 'Shared workbench surface used by admin panes, dialogs, and tooling shells.',
          binding: { kind: 'surface', key: 'windowSurface' },
        },
        {
          id: 'frame',
          label: 'Shell frame',
          description: 'Shared frame and border contrast for workbench shells.',
          binding: { kind: 'surface', key: 'windowFrame' },
        },
        {
          id: 'elevation',
          label: 'Shell elevation',
          description: 'Shared shadow and lift for workbench shells.',
          binding: { kind: 'surface', key: 'windowElevation' },
        },
        {
          id: 'text',
          label: 'Shell text',
          description: 'Shared admin/workbench text used for main chrome copy and nearby shell controls.',
          binding: { kind: 'typography', key: 'chromeText' },
        },
        {
          id: 'meta',
          label: 'Shell meta',
          description: 'Shared admin/workbench secondary text used for sublabels, helper rows, and shell metadata.',
          binding: { kind: 'typography', key: 'chromeMeta' },
        },
      ],
    },
  ],
};

const WORKBENCH_TABS_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchTabs',
  label: 'Workbench Tabs',
  description: 'Shared admin/workbench tab and navigation treatment for dense authoring surfaces.',
  variants: [
    {
      id: 'navigation',
      label: 'Navigation',
      elements: [
        {
          id: 'text',
          label: 'Tab text',
          description: 'Shared tab and navigation text for workbench tabs.',
          binding: { kind: 'typography', key: 'chromeText' },
        },
        {
          id: 'meta',
          label: 'Supporting meta',
          description: 'Shared secondary tab and navigation text for workbench tabs.',
          binding: { kind: 'typography', key: 'chromeMeta' },
        },
        {
          id: 'activeTab',
          label: 'Active tab',
          description: 'Shared active state for selected workbench tabs and navigation controls.',
          binding: { kind: 'control', key: 'chromeActiveTab' },
        },
        {
          id: 'icon',
          label: 'Icon color',
          description: 'Shared icon color for workbench navigation and tabs.',
          binding: { kind: 'iconography', key: 'chrome' },
        },
      ],
    },
  ],
};

const WORKBENCH_CONTROLS_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchControls',
  label: 'Workbench Controls',
  description: 'Shared admin/workbench form controls, selectors, helper labels, and chip treatments.',
  variants: [
    {
      id: 'controls',
      label: 'Controls',
      elements: [
        {
          id: 'title',
          label: 'Control title',
          description: 'Shared panel and control title role used across admin/workbench tooling.',
          binding: { kind: 'typography', key: 'supportTitle' },
        },
        {
          id: 'label',
          label: 'Control label',
          description: 'Shared field and control label role used across admin/workbench tooling.',
          binding: { kind: 'typography', key: 'supportLabel' },
        },
        {
          id: 'meta',
          label: 'Control meta',
          description: 'Shared field meta and secondary copy used across admin/workbench tooling.',
          binding: { kind: 'typography', key: 'supportMeta' },
        },
        {
          id: 'hint',
          label: 'Control hint',
          description: 'Shared helper and hint copy used across admin/workbench tooling.',
          binding: { kind: 'typography', key: 'supportHint' },
        },
        {
          id: 'control',
          label: 'Neutral control',
          description: 'Shared neutral input and selector surface for admin/workbench controls.',
          binding: { kind: 'control', key: 'supportControl' },
        },
        {
          id: 'controlText',
          label: 'Control text',
          description: 'Shared input and selector text role for admin/workbench controls.',
          binding: { kind: 'typography', key: 'supportControlText' },
        },
        {
          id: 'controlStrong',
          label: 'Selected control',
          description: 'Shared selected-state surface for admin/workbench controls.',
          binding: { kind: 'control', key: 'supportControlStrong' },
        },
        {
          id: 'chip',
          label: 'Chip',
          description: 'Shared chip treatment for workbench filters, tags, and grouped tool selections.',
          binding: { kind: 'control', key: 'supportChip' },
        },
      ],
    },
  ],
};

const WORKBENCH_FEEDBACK_COMPONENT_SPEC: DisplayComponentSpec = {
  id: 'workbenchFeedback',
  label: 'Workbench Feedback',
  description: 'Shared admin/workbench empty, loading, success, warning, error, and info messaging surfaces.',
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
        {
          id: 'overlayBackground',
          label: 'Covered fade',
          description: 'Shared bottom fade used by Story cards and Question cards with a cover image.',
          binding: { kind: 'overlay', key: 'coveredFade' },
        },
        {
          id: 'galleryOverlay',
          label: 'Gallery overlay',
          description: 'Shared gallery wash used by covered Gallery cards and gallery overlay chips.',
          binding: { kind: 'overlay', key: 'galleryOverlay' },
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
  'font-size/xxs',
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

const CARD_GENERAL_BACKGROUND_OPTION: ThemeRecipeTokenRef[] = [
  'shared/card/background',
];

const FOUNDATION_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  'layout/border1Color',
  'layout/border2Color',
];

const SHELL_BORDER_OPTIONS: ThemeRecipeTokenRef[] = [
  ...FOUNDATION_BORDER_OPTIONS,
  ...FOUNDATION_SURFACE_OPTIONS,
];

const CARD_GENERAL_BORDER_OPTION: ThemeRecipeTokenRef[] = [
  'shared/card/border',
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

const CARD_GENERAL_RADIUS_OPTION: ThemeRecipeTokenRef[] = [
  'shared/card/radius',
];

const SHADOW_OPTIONS: ThemeRecipeTokenRef[] = [
  'shadow/sm',
  'shadow/md',
  'shadow/lg',
  'shadow/xl',
];

const CARD_GENERAL_SHADOW_OPTIONS: ThemeRecipeTokenRef[] = [
  'shared/card/shadow',
  'shared/card/shadowHover',
];

const PADDING_OPTIONS: ThemeRecipeTokenRef[] = [
  'spacing/sm',
  'spacing/md',
  'spacing/lg',
  'spacing/xl',
  'component/card/padding',
];

const CARD_GENERAL_PADDING_OPTION: ThemeRecipeTokenRef[] = [
  'shared/card/padding',
];

const CARD_SPECIFIC_SURFACE_ROLES = new Set<keyof ReaderThemeRecipes['surfaces']>([
  'storyCardClosed',
  'galleryCardClosed',
  'qaCardClosed',
  'quoteCardClosed',
  'calloutCardClosed',
]);

const SHELL_SURFACE_BORDER_ROLES = new Set<keyof ReaderThemeRecipes['surfaces']>([
  'chromeToolbar',
  'chromeSidebar',
  'windowSurface',
  'windowFrame',
  'windowElevation',
]);

const resolveEditorShadowValue = (
  value: ThemeRecipeTokenRef | undefined,
  fallback: ThemeRecipeTokenRef,
  cardShadowValue: ThemeRecipeTokenRef,
  cardShadowHoverValue: ThemeRecipeTokenRef,
): ThemeRecipeTokenRef => {
  if (value === 'component/card/shadow') return cardShadowValue;
  if (value === 'component/card/shadowHover') return cardShadowHoverValue;
  return value ?? fallback;
};

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
  'semantic/reader/covered-fade',
  'semantic/reader/covered-fade-strong',
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
  role.startsWith('feedback')
    ? [...FOUNDATION_SURFACE_OPTIONS, ...NOTICE_SURFACE_OPTIONS]
    : CARD_SPECIFIC_SURFACE_ROLES.has(role)
      ? [...CARD_GENERAL_BACKGROUND_OPTION, ...FOUNDATION_SURFACE_OPTIONS]
      : FOUNDATION_SURFACE_OPTIONS
);

const getSurfaceBorderOptions = (role: keyof ReaderThemeRecipes['surfaces']): ThemeRecipeTokenRef[] => (
  role.startsWith('feedback')
    ? [...FOUNDATION_BORDER_OPTIONS, ...NOTICE_BORDER_OPTIONS]
    : CARD_SPECIFIC_SURFACE_ROLES.has(role)
      ? [...CARD_GENERAL_BORDER_OPTION, ...FOUNDATION_BORDER_OPTIONS]
      : SHELL_SURFACE_BORDER_ROLES.has(role)
        ? SHELL_BORDER_OPTIONS
        : FOUNDATION_BORDER_OPTIONS
);

const getSurfaceRadiusOptions = (role: keyof ReaderThemeRecipes['surfaces']): ThemeRecipeTokenRef[] => (
  CARD_SPECIFIC_SURFACE_ROLES.has(role)
    ? [...CARD_GENERAL_RADIUS_OPTION, ...RADIUS_OPTIONS]
    : RADIUS_OPTIONS
);

const getSurfaceShadowOptions = (
  role: keyof ReaderThemeRecipes['surfaces'],
  field: 'shadow' | 'shadowHover',
): ThemeRecipeTokenRef[] => (
  CARD_SPECIFIC_SURFACE_ROLES.has(role)
    ? [field === 'shadow' ? CARD_GENERAL_SHADOW_OPTIONS[0] : CARD_GENERAL_SHADOW_OPTIONS[1], ...SHADOW_OPTIONS]
    : SHADOW_OPTIONS
);

const getSurfacePaddingOptions = (role: keyof ReaderThemeRecipes['surfaces']): ThemeRecipeTokenRef[] => (
  CARD_SPECIFIC_SURFACE_ROLES.has(role)
    ? [...CARD_GENERAL_PADDING_OPTION, ...PADDING_OPTIONS]
    : PADDING_OPTIONS
);

const getControlBackgroundOptions = (role: keyof ReaderThemeRecipes['controls']): ThemeRecipeTokenRef[] => {
  if (role === 'lightboxControl') return OVERLAY_BACKGROUND_OPTIONS;
  if (role === 'supportControl') return FOUNDATION_SURFACE_OPTIONS;
  return EMPHASIS_BACKGROUND_OPTIONS;
};

const getControlBorderOptions = (role: keyof ReaderThemeRecipes['controls']): ThemeRecipeTokenRef[] => {
  if (role === 'lightboxControl') return FOUNDATION_BORDER_OPTIONS;
  if (role === 'supportControl') return FOUNDATION_BORDER_OPTIONS;
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
  'supportLabel',
  'supportMeta',
  'supportHint',
  'supportControlText',
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
  const [selectedThemeTarget, setSelectedThemeTarget] = useState<ThemeTargetScope>('reader');
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
        return HEADER_COMPONENT_SPEC;
      }
      if (id === 'sidebar') {
        return SIDEBAR_COMPONENT_SPEC;
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
      if (id === 'workbenchHeader') {
        return WORKBENCH_HEADER_COMPONENT_SPEC;
      }
      if (id === 'workbenchSidebar') {
        return WORKBENCH_SIDEBAR_COMPONENT_SPEC;
      }
      if (id === 'workbenchShell') {
        return WORKBENCH_SHELL_COMPONENT_SPEC;
      }
      if (id === 'workbenchTabs') {
        return WORKBENCH_TABS_COMPONENT_SPEC;
      }
      if (id === 'workbenchControls') {
        return WORKBENCH_CONTROLS_COMPONENT_SPEC;
      }
      if (id === 'workbenchFeedback') {
        return WORKBENCH_FEEDBACK_COMPONENT_SPEC;
      }
      if (id === 'window') {
        return WINDOW_COMPONENT_SPEC;
      }
      if (id === 'lightbox') {
        return LIGHTBOX_COMPONENT_SPEC;
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
  const workbenchComponents = useMemo(() => WORKBENCH_COMPONENT_IDS
    .map((id) => orderedReaderComponents.find((component) => component.id === id))
    .filter((component): component is (typeof orderedReaderComponents)[number] => Boolean(component)), [orderedReaderComponents]);
  const activeThemeData = selectedThemeTarget === 'reader' ? themeData : adminThemeData;
  const visibleNavigatorComponents = useMemo(() => {
    if (selectedThemeTarget === 'workbench') return workbenchComponents;
    if (selectedNavigatorSection === 'core') return coreReaderComponents;
    return cardComponents;
  }, [cardComponents, coreReaderComponents, selectedNavigatorSection, selectedThemeTarget, workbenchComponents]);

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
    if (selectedThemeTarget === 'workbench') {
      if (selectedNavigatorSection !== 'workbench') {
        setSelectedNavigatorSection('workbench');
      }
      if (!isWorkbenchComponentId(selectedComponentId)) {
        const firstComponent = workbenchComponents[0];
        const firstVariant = firstComponent?.variants[0];
        if (firstComponent) {
          setSelectedComponentId(firstComponent.id);
          setSelectedVariantId(firstVariant?.id ?? '');
          setSelectedRecipeId(getDefaultAttributeId(firstComponent, firstVariant?.id));
        }
      }
      return;
    }

    if (selectedNavigatorSection === 'workbench' || isWorkbenchComponentId(selectedComponentId)) {
      const firstComponent = coreReaderComponents[0];
      const firstVariant = firstComponent?.variants[0];
      setSelectedNavigatorSection('core');
      if (firstComponent) {
        setSelectedComponentId(firstComponent.id);
        setSelectedVariantId(firstVariant?.id ?? '');
        setSelectedRecipeId(getDefaultAttributeId(firstComponent, firstVariant?.id));
      }
    }
  }, [
    coreReaderComponents,
    selectedComponentId,
    selectedNavigatorSection,
    selectedThemeTarget,
    workbenchComponents,
  ]);

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
    if (!activeThemeData) return;

    const updateThemeData = selectedThemeTarget === 'reader' ? setThemeData : setAdminThemeData;
    updateThemeData((prev) => {
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
    if (!activeThemeData) return;

    const updateThemeData = selectedThemeTarget === 'reader' ? setThemeData : setAdminThemeData;
    updateThemeData((prev) => {
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
    if (!activeThemeData) return;

    const updateThemeData = selectedThemeTarget === 'reader' ? setThemeData : setAdminThemeData;
    updateThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [key]: value
      }
    }));
  };

  const handleNestedTokenChange = (section: string, subsection: string, key: string, value: string) => {
    if (!activeThemeData) return;

    const updateThemeData = selectedThemeTarget === 'reader' ? setThemeData : setAdminThemeData;
    updateThemeData(prev => ({
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

  const updateActiveButtonSolid = (field: 'backgroundColor' | 'backgroundColorHover' | 'borderColor' | 'textColor', value: string) => {
    const updateThemeData = selectedThemeTarget === 'reader' ? setThemeData : setAdminThemeData;
    updateThemeData((prev) => ({
      ...prev!,
      components: {
        ...prev!.components,
        button: {
          ...prev!.components.button,
          solid: {
            ...prev!.components.button.solid,
            [field]: value,
          },
        },
      },
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
        detail: 'Theme Management is running as the live authoring workspace, but saving is temporarily disabled.',
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

  const renderSurfaceEditor = (
    role: keyof ReaderThemeRecipes['surfaces'],
    fields?: Array<'background' | 'border' | 'radius' | 'shadow' | 'shadowHover' | 'padding'>,
  ) => {
    const recipe = readerRecipes.surfaces[role];
    const visibleFields = new Set(fields ?? ['background', 'border', 'radius', 'shadow', 'shadowHover', 'padding']);
    const shadowValue = resolveEditorShadowValue(
      recipe.shadow,
      SHADOW_OPTIONS[0],
      valuesThemeData.components.card.shadow as ThemeRecipeTokenRef,
      valuesThemeData.components.card.shadowHover as ThemeRecipeTokenRef,
    );
    const hoverShadowValue = resolveEditorShadowValue(
      recipe.shadowHover,
      SHADOW_OPTIONS[0],
      valuesThemeData.components.card.shadow as ThemeRecipeTokenRef,
      valuesThemeData.components.card.shadowHover as ThemeRecipeTokenRef,
    );
    return (
      <div className={styles.componentRecipeEditor}>
        {visibleFields.has('background') ? (
          <label className={styles.architectureField}>
            <span>Background</span>
            <select value={recipe.background} onChange={(e) => updateSurfaceRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfaceBackgroundOptions(role), 'color')}
            </select>
          </label>
        ) : null}
        {visibleFields.has('border') ? (
          <label className={styles.architectureField}>
            <span>Border</span>
            <select value={recipe.border} onChange={(e) => updateSurfaceRecipe(role, 'border', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfaceBorderOptions(role), 'color')}
            </select>
          </label>
        ) : null}
        {visibleFields.has('radius') && recipe.radius ? (
          <label className={styles.architectureField}>
            <span>Radius</span>
            <select value={recipe.radius} onChange={(e) => updateSurfaceRecipe(role, 'radius', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfaceRadiusOptions(role), 'radius')}
            </select>
          </label>
        ) : null}
        {visibleFields.has('shadow') && recipe.shadow ? (
          <label className={styles.architectureField}>
            <span>Shadow</span>
            <select value={shadowValue} onChange={(e) => updateSurfaceRecipe(role, 'shadow', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfaceShadowOptions(role, 'shadow'), 'shadow')}
            </select>
          </label>
        ) : null}
        {visibleFields.has('shadowHover') && recipe.shadowHover ? (
          <label className={styles.architectureField}>
            <span>Hover shadow</span>
            <select value={hoverShadowValue} onChange={(e) => updateSurfaceRecipe(role, 'shadowHover', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfaceShadowOptions(role, 'shadowHover'), 'shadow')}
            </select>
          </label>
        ) : null}
        {visibleFields.has('padding') && recipe.padding ? (
          <label className={styles.architectureField}>
            <span>Padding</span>
            <select value={recipe.padding} onChange={(e) => updateSurfaceRecipe(role, 'padding', e.target.value as ThemeRecipeTokenRef)}>
              {renderEditorValueOptions(getSurfacePaddingOptions(role), 'padding')}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderSharedClosedCardSurfaceEditor = () => {
    const recipe = readerRecipes.surfaces.card;
    const shadowValue = resolveEditorShadowValue(
      recipe.shadow,
      SHADOW_OPTIONS[0],
      valuesThemeData.components.card.shadow as ThemeRecipeTokenRef,
      valuesThemeData.components.card.shadowHover as ThemeRecipeTokenRef,
    );
    const hoverShadowValue = resolveEditorShadowValue(
      recipe.shadowHover,
      SHADOW_OPTIONS[0],
      valuesThemeData.components.card.shadow as ThemeRecipeTokenRef,
      valuesThemeData.components.card.shadowHover as ThemeRecipeTokenRef,
    );

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
          <select value={shadowValue} onChange={(e) => updateSharedClosedCardSurface('shadow', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
          </select>
        </label>
        <label className={styles.architectureField}>
          <span>Hover Shadow</span>
          <select value={hoverShadowValue} onChange={(e) => updateSharedClosedCardSurface('shadowHover', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
          </select>
        </label>
      </div>
    );
  };

  const renderOverlayBackgroundEditor = (
    role: keyof ReaderThemeRecipes['overlays'],
    label: string,
  ) => {
    const recipe = readerRecipes.overlays[role];

    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>{label}</span>
          <select value={recipe.background} onChange={(e) => updateOverlayRecipe(role, 'background', e.target.value as ThemeRecipeTokenRef)}>
            {renderEditorValueOptions(OVERLAY_BACKGROUND_OPTIONS, 'color')}
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
    if (!activeThemeData || key !== 'sidebarWidth') {
      return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }

    return (
      <div className={styles.componentRecipeEditor}>
        <label className={styles.architectureField}>
          <span>Desktop width</span>
          <input
            type="text"
            value={activeThemeData.layout?.sidebarWidth || ''}
            onChange={(e) => handleTokenChange('layout', 'sidebarWidth', e.target.value)}
            className={styles.componentRecipeInput}
          />
        </label>
        <label className={styles.architectureField}>
          <span>Mobile width</span>
          <input
            type="text"
            value={activeThemeData.layout?.sidebarWidthMobile || ''}
            onChange={(e) => handleTokenChange('layout', 'sidebarWidthMobile', e.target.value)}
            className={styles.componentRecipeInput}
          />
        </label>
      </div>
    );
  };

  const renderTokenValueEditor = (key: string) => {
    if (!activeThemeData) {
      return <span className={styles.architectureEmptyState}>Unavailable</span>;
    }

    switch (key) {
      case 'headerBackgroundColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.header?.backgroundColor || ''}
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
                value={activeThemeData.components?.header?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'borderColor', e.target.value)}
              >
                {renderEditorValueOptions(SHELL_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      case 'headerTextColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Text</span>
              <select
                value={activeThemeData.components?.header?.textColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'textColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      case 'headerIconColor':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Icon</span>
              <select
                value={activeThemeData.components?.header?.iconColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'iconColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
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
                value={activeThemeData.layout?.border1Color || ''}
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
                value={activeThemeData.layout?.border2Color || ''}
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
                value={activeThemeData.components?.header?.height || ''}
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
                value={activeThemeData.layout?.logoMaxHeight || ''}
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
                value={activeThemeData.components?.input?.padding || ''}
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
                value={activeThemeData.components?.input?.borderRadius || ''}
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
      case 'calloutBulletLineHeight':
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Bullet line height</span>
              <select
                value={readerRecipes.treatments.calloutBodyListLineHeight}
                onChange={(e) => updateTreatmentRecipe('calloutBodyListLineHeight', e.target.value as ThemeRecipeTokenRef)}
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
    if (componentId === 'workbenchHeader') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (elementId === 'surface') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.header?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.components?.header?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'borderColor', e.target.value)}
              >
                {renderEditorValueOptions(SHELL_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'text' || elementId === 'icon') {
        const field = elementId === 'text' ? 'textColor' : 'iconColor';
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>{elementId === 'text' ? 'Text color' : 'Icon color'}</span>
              <select
                value={activeThemeData.components?.header?.[field] || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', field, e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'height') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Height</span>
              <input
                type="text"
                value={activeThemeData.components?.header?.height || ''}
                onChange={(e) => handleNestedTokenChange('components', 'header', 'height', e.target.value)}
                className={styles.componentRecipeInput}
              />
            </label>
          </div>
        );
      }
    }

    if (componentId === 'workbenchSidebar') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (elementId === 'surface') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.layout?.background2Color || ''}
                onChange={(e) => handleTokenChange('layout', 'background2Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'border') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.layout?.border1Color || ''}
                onChange={(e) => handleTokenChange('layout', 'border1Color', e.target.value)}
              >
                {renderEditorValueOptions(SHELL_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'width') {
        return renderLayoutEditor('sidebarWidth');
      }
    }

    if (componentId === 'workbenchShell') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (elementId === 'surface') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.layout?.background1Color || ''}
                onChange={(e) => handleTokenChange('layout', 'background1Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'frame') {
        return (
          <div className={styles.componentGroupedEditor}>
            <div className={styles.componentRecipeEditor}>
              <label className={styles.architectureField}>
                <span>Border</span>
                <select
                  value={activeThemeData.layout?.border1Color || ''}
                  onChange={(e) => handleTokenChange('layout', 'border1Color', e.target.value)}
                >
                  {renderEditorValueOptions(SHELL_BORDER_OPTIONS, 'color')}
                </select>
              </label>
              <label className={styles.architectureField}>
                <span>Radius</span>
                <select
                  value={activeThemeData.borders?.radius?.md || ''}
                  onChange={(e) => handleNestedTokenChange('borders', 'radius', 'md', e.target.value)}
                >
                  {renderEditorValueOptions(RADIUS_OPTIONS, 'radius')}
                </select>
              </label>
            </div>
          </div>
        );
      }

      if (elementId === 'elevation') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Shadow</span>
              <select
                value={activeThemeData.shadows?.lg || ''}
                onChange={(e) => handleTokenChange('shadows', 'lg', e.target.value)}
              >
                {renderEditorValueOptions(SHADOW_OPTIONS, 'shadow')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'text' || elementId === 'meta') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>{elementId === 'text' ? 'Text color' : 'Meta color'}</span>
              <select
                value={elementId === 'text'
                  ? activeThemeData.typography?.textColors?.text1 || ''
                  : activeThemeData.typography?.textColors?.text2 || ''}
                onChange={(e) => handleNestedTokenChange('typography', 'textColors', elementId === 'text' ? 'text1' : 'text2', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }
    }

    if (componentId === 'workbenchTabs') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (elementId === 'text' || elementId === 'meta') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>{elementId === 'text' ? 'Text color' : 'Meta color'}</span>
              <select
                value={elementId === 'text'
                  ? activeThemeData.typography?.textColors?.text1 || ''
                  : activeThemeData.typography?.textColors?.text2 || ''}
                onChange={(e) => handleNestedTokenChange('typography', 'textColors', elementId === 'text' ? 'text1' : 'text2', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'activeTab') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.button?.solid?.backgroundColor || ''}
                onChange={(e) => updateActiveButtonSolid('backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(EMPHASIS_BACKGROUND_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Text</span>
              <select
                value={activeThemeData.components?.button?.solid?.textColor || ''}
                onChange={(e) => updateActiveButtonSolid('textColor', e.target.value)}
              >
                {renderEditorValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.components?.button?.solid?.borderColor || ''}
                onChange={(e) => updateActiveButtonSolid('borderColor', e.target.value)}
              >
                {renderEditorValueOptions(EMPHASIS_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'icon') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Icon color</span>
              <select
                value={activeThemeData.typography?.textColors?.text1 || ''}
                onChange={(e) => handleNestedTokenChange('typography', 'textColors', 'text1', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }
    }

    if (componentId === 'workbenchControls') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (['title', 'label', 'meta', 'hint'].includes(elementId)) {
        const tokenKey = elementId === 'title' || elementId === 'label' ? 'text1' : 'text2';
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Text color</span>
              <select
                value={activeThemeData.typography?.textColors?.[tokenKey as 'text1' | 'text2'] || ''}
                onChange={(e) => handleNestedTokenChange('typography', 'textColors', tokenKey, e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'control') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.input?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.components?.input?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'borderColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'controlText') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Text</span>
              <select
                value={activeThemeData.components?.input?.textColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'textColor', e.target.value)}
              >
                {renderEditorValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'controlStrong' || elementId === 'chip') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.button?.solid?.backgroundColor || ''}
                onChange={(e) => updateActiveButtonSolid('backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(EMPHASIS_BACKGROUND_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Text</span>
              <select
                value={activeThemeData.components?.button?.solid?.textColor || ''}
                onChange={(e) => updateActiveButtonSolid('textColor', e.target.value)}
              >
                {renderEditorValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.components?.button?.solid?.borderColor || ''}
                onChange={(e) => updateActiveButtonSolid('borderColor', e.target.value)}
              >
                {renderEditorValueOptions(EMPHASIS_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }
    }

    if (componentId === 'workbenchFeedback') {
      if (!activeThemeData) {
        return <span className={styles.architectureEmptyState}>Unavailable</span>;
      }

      if (elementId === 'surface') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.layout?.background2Color || ''}
                onChange={(e) => handleTokenChange('layout', 'background2Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.layout?.border1Color || ''}
                onChange={(e) => handleTokenChange('layout', 'border1Color', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (['title', 'meta', 'hint'].includes(elementId)) {
        const tokenKey = elementId === 'title' ? 'text1' : 'text2';
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Text color</span>
              <select
                value={activeThemeData.typography?.textColors?.[tokenKey as 'text1' | 'text2'] || ''}
                onChange={(e) => handleNestedTokenChange('typography', 'textColors', tokenKey, e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_TEXT_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'action') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Background</span>
              <select
                value={activeThemeData.components?.input?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Text</span>
              <select
                value={activeThemeData.components?.input?.textColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'textColor', e.target.value)}
              >
                {renderEditorValueOptions(CONTROL_TEXT_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Border</span>
              <select
                value={activeThemeData.components?.input?.borderColor || ''}
                onChange={(e) => handleNestedTokenChange('components', 'input', 'borderColor', e.target.value)}
              >
                {renderEditorValueOptions(FOUNDATION_BORDER_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }

      if (elementId === 'colors') {
        return (
          <div className={styles.componentRecipeEditor}>
            <label className={styles.architectureField}>
              <span>Success</span>
              <select
                value={activeThemeData.states?.success?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('states', 'success', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Warning</span>
              <select
                value={activeThemeData.states?.warning?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('states', 'warning', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Error</span>
              <select
                value={activeThemeData.states?.error?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('states', 'error', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
            <label className={styles.architectureField}>
              <span>Info</span>
              <select
                value={activeThemeData.states?.info?.backgroundColor || ''}
                onChange={(e) => handleNestedTokenChange('states', 'info', 'backgroundColor', e.target.value)}
              >
                {renderEditorValueOptions(NOTICE_SURFACE_OPTIONS, 'color')}
              </select>
            </label>
          </div>
        );
      }
    }

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
          <label className={styles.architectureField}>
            <span>Texture</span>
            <select
              value={activeThemeData?.gradients?.canvasTexture ?? 'none'}
              onChange={(e) => handleTokenChange('gradients', 'canvasTexture', e.target.value)}
            >
              {CANVAS_TEXTURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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
          {renderControlEditor('supportControl')}
          {renderTokenValueEditor('fieldPadding')}
          {renderTokenValueEditor('fieldBorderRadius')}
        </div>
      );
    }

    if (componentId === 'cardGeneral' && variantId === 'shared' && elementId === 'overlayBackground') {
      return renderOverlayBackgroundEditor('coveredFade', 'Background');
    }

    if (componentId === 'cardGeneral' && variantId === 'shared' && elementId === 'galleryOverlay') {
      return renderOverlayBackgroundEditor('galleryOverlay', 'Background');
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
        return renderTypographyEditor('storyOverlayTitle');
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
        return renderTypographyEditor('galleryOverlayTitle');
      }
    }

    if (componentId === 'lightbox' && variantId === 'fullscreen') {
      if (elementId === 'backdrop') {
        return renderOverlayBackgroundEditor('lightboxBackdrop', 'Background');
      }

      if (elementId === 'control') {
        return renderControlEditor('lightboxControl');
      }

      if (elementId === 'caption') {
        return renderTypographyEditor('caption');
      }
    }

    if (componentId === 'window' && variantId === 'floating') {
      if (elementId === 'surface') {
        return renderSurfaceEditor('windowSurface', ['background']);
      }
      if (elementId === 'frame') {
        return renderSurfaceEditor('windowFrame', ['border', 'radius']);
      }
      if (elementId === 'elevation') {
        return renderSurfaceEditor('windowElevation', ['shadow']);
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
          {renderTokenValueEditor('calloutBulletLineHeight')}
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
            key: 'supportChip',
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
  const selectedComponentDescription = selectedComponent?.description ?? '';
  const selectedAttributeImpact = selectedComponent && selectedVariant && selectedElement
    ? [
      ATTRIBUTE_IMPACT_NOTES[`${selectedComponent.id}.${selectedVariant.id}.${selectedElement.id}`] ?? selectedElement.description ?? '',
      ATTRIBUTE_VALUE_NOTES[`${selectedComponent.id}.${selectedVariant.id}.${selectedElement.id}`] ?? '',
    ].filter(Boolean).join(' ')
    : '';
  const selectedAttributeOwnership = selectedComponent && selectedVariant && selectedElement
    ? getAttributeOwnership(selectedComponent.id, selectedVariant.id, selectedElement.id)
    : null;
  const relevantValueSectionIds = selectedComponent && selectedVariant && selectedElement
    ? getRelevantValueSectionIds(
      selectedComponent.id,
      selectedVariant.id,
      selectedElement.id,
      selectedKind,
      selectedKey,
    )
    : [];
  const getAssignmentValueLabel = (value: string): string => (
    value.includes('/') ? formatEditorOptionLabel(value) : value
  );
  const getAttributeAssignments = (
    kind: string,
    key: string,
  ): AttributeAssignment[] => {
    if (!activeThemeData) return [];

    if (selectedComponent?.id === 'workbenchHeader') {
      switch (selectedElement?.id) {
        case 'surface':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.components.header.backgroundColor) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.components.header.borderColor) },
          ];
        case 'text':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.components.header.textColor) }];
        case 'icon':
          return [{ label: 'Icon color', value: getAssignmentValueLabel(activeThemeData.components.header.iconColor) }];
        case 'height':
          return [{ label: 'Height', value: getAssignmentValueLabel(activeThemeData.components.header.height) }];
        default:
          break;
      }
    }

    if (selectedComponent?.id === 'workbenchSidebar') {
      switch (selectedElement?.id) {
        case 'surface':
          return [{ label: 'Background', value: getAssignmentValueLabel(activeThemeData.layout.background2Color) }];
        case 'border':
          return [{ label: 'Border', value: getAssignmentValueLabel(activeThemeData.layout.border1Color) }];
        case 'width':
          return [
            { label: 'Desktop width', value: getAssignmentValueLabel(activeThemeData.layout.sidebarWidth) },
            { label: 'Mobile width', value: getAssignmentValueLabel(activeThemeData.layout.sidebarWidthMobile) },
          ];
        default:
          break;
      }
    }

    if (selectedComponent?.id === 'workbenchShell') {
      switch (selectedElement?.id) {
        case 'surface':
          return [{ label: 'Background', value: getAssignmentValueLabel(activeThemeData.layout.background1Color) }];
        case 'frame':
          return [
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.layout.border1Color) },
            { label: 'Radius', value: getAssignmentValueLabel(activeThemeData.borders.radius.md) },
          ];
        case 'elevation':
          return [{ label: 'Shadow', value: getAssignmentValueLabel(activeThemeData.shadows.lg) }];
        case 'text':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text1) }];
        case 'meta':
          return [{ label: 'Meta color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text2) }];
        default:
          break;
      }
    }

    if (selectedComponent?.id === 'workbenchTabs') {
      switch (selectedElement?.id) {
        case 'text':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text1) }];
        case 'meta':
          return [{ label: 'Meta color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text2) }];
        case 'activeTab':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.components.button.solid.backgroundColor) },
            { label: 'Text', value: getAssignmentValueLabel(activeThemeData.components.button.solid.textColor) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.components.button.solid.borderColor) },
          ];
        case 'icon':
          return [{ label: 'Icon color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text1) }];
        default:
          break;
      }
    }

    if (selectedComponent?.id === 'workbenchControls') {
      switch (selectedElement?.id) {
        case 'title':
        case 'label':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text1) }];
        case 'meta':
        case 'hint':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text2) }];
        case 'control':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.components.input.backgroundColor) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.components.input.borderColor) },
          ];
        case 'controlText':
          return [{ label: 'Text', value: getAssignmentValueLabel(activeThemeData.components.input.textColor) }];
        case 'controlStrong':
        case 'chip':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.components.button.solid.backgroundColor) },
            { label: 'Text', value: getAssignmentValueLabel(activeThemeData.components.button.solid.textColor) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.components.button.solid.borderColor) },
          ];
        default:
          break;
      }
    }

    if (selectedComponent?.id === 'workbenchFeedback') {
      switch (selectedElement?.id) {
        case 'surface':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.layout.background2Color) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.layout.border1Color) },
          ];
        case 'title':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text1) }];
        case 'meta':
        case 'hint':
          return [{ label: 'Text color', value: getAssignmentValueLabel(activeThemeData.typography.textColors.text2) }];
        case 'action':
          return [
            { label: 'Background', value: getAssignmentValueLabel(activeThemeData.components.input.backgroundColor) },
            { label: 'Text', value: getAssignmentValueLabel(activeThemeData.components.input.textColor) },
            { label: 'Border', value: getAssignmentValueLabel(activeThemeData.components.input.borderColor) },
          ];
        case 'colors':
          return [
            { label: 'Success', value: getAssignmentValueLabel(activeThemeData.states.success.backgroundColor) },
            { label: 'Warning', value: getAssignmentValueLabel(activeThemeData.states.warning.backgroundColor) },
            { label: 'Error', value: getAssignmentValueLabel(activeThemeData.states.error.backgroundColor) },
            { label: 'Info', value: getAssignmentValueLabel(activeThemeData.states.info.backgroundColor) },
          ];
        default:
          break;
      }
    }

    switch (kind) {
      case 'typography': {
        const recipe = readerRecipes.typography[key as keyof ReaderThemeRecipes['typography']];
        if (!recipe) return [];
        return [
          { label: 'Family', value: getAssignmentValueLabel(recipe.family) },
          { label: 'Size', value: getAssignmentValueLabel(recipe.size) },
          { label: 'Weight', value: getAssignmentValueLabel(recipe.weight) },
          { label: 'Line height', value: getAssignmentValueLabel(recipe.lineHeight) },
          { label: 'Color', value: getAssignmentValueLabel(recipe.color) },
          { label: 'Style', value: recipe.fontStyle ?? 'Normal' },
        ];
      }
      case 'surface':
      case 'sharedSurface': {
        const recipe = readerRecipes.surfaces[key as keyof ReaderThemeRecipes['surfaces']];
        if (!recipe) return [];
        const assignments: AttributeAssignment[] = [
          { label: 'Background', value: getAssignmentValueLabel(recipe.background) },
          { label: 'Border', value: getAssignmentValueLabel(recipe.border) },
        ];
        if (recipe.radius) assignments.push({ label: 'Radius', value: getAssignmentValueLabel(recipe.radius) });
        if (recipe.shadow) assignments.push({ label: 'Shadow', value: getAssignmentValueLabel(recipe.shadow) });
        if (recipe.shadowHover) assignments.push({ label: 'Hover shadow', value: getAssignmentValueLabel(recipe.shadowHover) });
        if (recipe.padding) assignments.push({ label: 'Padding', value: getAssignmentValueLabel(recipe.padding) });
        return assignments;
      }
      case 'control': {
        if (key === 'focusRing') {
          return [{ label: 'Color', value: getAssignmentValueLabel(readerRecipes.controls.focusRing.color) }];
        }
        if (key === 'inlineLink') {
          const recipe = readerRecipes.controls.inlineLink;
          return [
            { label: 'Text', value: getAssignmentValueLabel(recipe.text) },
            { label: 'Hover text', value: getAssignmentValueLabel(recipe.hoverText ?? '') },
            { label: 'Hover background', value: getAssignmentValueLabel(recipe.hoverBackground ?? '') },
          ].filter((item) => item.value);
        }

        const recipe = readerRecipes.controls[key as keyof ReaderThemeRecipes['controls']] as Exclude<ReaderThemeRecipes['controls'][keyof ReaderThemeRecipes['controls']], { color: ThemeRecipeTokenRef }>;
        if (!recipe) return [];
        const assignments: AttributeAssignment[] = [
          { label: 'Background', value: getAssignmentValueLabel(recipe.background) },
          { label: 'Text', value: getAssignmentValueLabel(recipe.text) },
          { label: 'Border', value: getAssignmentValueLabel(recipe.border) },
        ];
        if (recipe.hoverBackground) assignments.push({ label: 'Hover background', value: getAssignmentValueLabel(recipe.hoverBackground) });
        if ('hoverText' in recipe && recipe.hoverText) assignments.push({ label: 'Hover text', value: getAssignmentValueLabel(recipe.hoverText) });
        return assignments;
      }
      case 'overlay': {
        const recipe = readerRecipes.overlays[key as keyof ReaderThemeRecipes['overlays']];
        if (!recipe) return [];
        return [
          { label: 'Background', value: getAssignmentValueLabel(recipe.background) },
          { label: 'Text', value: getAssignmentValueLabel(recipe.text) },
          { label: 'Border', value: getAssignmentValueLabel(recipe.border ?? '') },
        ].filter((item) => item.value);
      }
      case 'layout':
        if (key === 'sidebarWidth') {
          return [
            { label: 'Desktop width', value: themeData.layout.sidebarWidth },
            { label: 'Mobile width', value: themeData.layout.sidebarWidthMobile },
          ];
        }
        return [];
      case 'token':
        switch (key) {
          case 'foundationBorderColor':
            return [{ label: 'Border 1', value: getAssignmentValueLabel(themeData.layout.border1Color) }];
          case 'foundationBorderStrongColor':
            return [{ label: 'Border 2', value: getAssignmentValueLabel(themeData.layout.border2Color) }];
          case 'headerTextColor':
            return [{ label: 'Header text', value: getAssignmentValueLabel(themeData.components.header.textColor) }];
          case 'headerIconColor':
            return [{ label: 'Header icon', value: getAssignmentValueLabel(themeData.components.header.iconColor) }];
          case 'headerHeight':
            return [{ label: 'Header height', value: themeData.components.header.height }];
          case 'logoMaxHeight':
            return [{ label: 'Logo max height', value: themeData.layout.logoMaxHeight }];
          case 'fieldPadding':
            return [{ label: 'Input padding', value: getAssignmentValueLabel(themeData.components.input.padding) }];
          case 'fieldBorderRadius':
            return [{ label: 'Input radius', value: getAssignmentValueLabel(themeData.components.input.borderRadius) }];
          case 'storyClosedPadding':
            return [{ label: 'Story padding', value: getAssignmentValueLabel(readerRecipes.surfaces.storyCardClosed.padding ?? 'component/card/padding') }];
          case 'storyClosedExcerptLineHeight':
            return [{ label: 'Story excerpt line height', value: getAssignmentValueLabel(readerRecipes.typography.storyExcerpt.lineHeight) }];
          case 'questionClosedPadding':
            return [{ label: 'Question padding', value: getAssignmentValueLabel(readerRecipes.surfaces.qaCardClosed.padding ?? 'component/card/padding') }];
          case 'galleryClosedPadding':
            return [{ label: 'Gallery padding', value: getAssignmentValueLabel(readerRecipes.surfaces.galleryCardClosed.padding ?? 'component/card/padding') }];
          case 'calloutBulletLineHeight':
            return [{ label: 'Callout bullet line height', value: getAssignmentValueLabel(readerRecipes.treatments.calloutBodyListLineHeight) }];
          default:
            return [];
        }
      case 'feedbackStates':
        if (
          !readerRecipes.surfaces.feedbackSuccessPanel ||
          !readerRecipes.surfaces.feedbackWarningPanel ||
          !readerRecipes.surfaces.feedbackErrorPanel ||
          !readerRecipes.surfaces.feedbackInfoPanel
        ) {
          return [];
        }
        return [
          { label: 'Success', value: getAssignmentValueLabel(readerRecipes.surfaces.feedbackSuccessPanel.background) },
          { label: 'Warning', value: getAssignmentValueLabel(readerRecipes.surfaces.feedbackWarningPanel.background) },
          { label: 'Error', value: getAssignmentValueLabel(readerRecipes.surfaces.feedbackErrorPanel.background) },
          { label: 'Info', value: getAssignmentValueLabel(readerRecipes.surfaces.feedbackInfoPanel.background) },
        ];
      default:
        return [];
    }
  };
  const selectedAttributeAssignments = selectedComponent && selectedVariant && selectedElement
    ? getAttributeAssignments(selectedKind, selectedKey)
    : [];

  const workspaceColumns = `minmax(${MIN_SYSTEM_PANE_WIDTH}px, 1fr) minmax(${MIN_ADVANCED_PANE_WIDTH}px, 1fr)`;
  const valuesThemeData = activeThemeData;

  const renderRecoveredValuesWorkspace = () => {
    if (!valuesThemeData) {
      return <span className={styles.architectureEmptyState}>Theme values are unavailable.</span>;
    }

    return (
      <>
        <section className={`${styles.section} ${styles.advancedSection}`}>
          {selectedComponent && selectedVariant && selectedElement ? (
            <div className={styles.valueGuidanceCard}>
              <div className={styles.valueGuidanceHeader}>
                <strong>Relevant values</strong>
                <span>{selectedAttributeLabel}</span>
              </div>
              <p className={styles.valueGuidanceText}>
                {selectedAttributeImpact || 'These value groups are the most relevant to the selected attribute.'}
              </p>
              <div className={styles.valueGuidanceChips}>
                {relevantValueSectionIds.map((sectionId) => (
                  <span key={sectionId} className={styles.valueGuidanceChip}>
                    {VALUE_SECTION_LABELS[sectionId]}
                  </span>
                ))}
              </div>
              {selectedAttributeAssignments.length ? (
                <div className={styles.assignmentSummary}>
                  <strong className={styles.assignmentSummaryTitle}>Current binding</strong>
                  <div className={styles.assignmentSummaryList}>
                    {selectedAttributeAssignments.map((assignment) => (
                      <div key={`${assignment.label}:${assignment.value}`} className={styles.assignmentSummaryRow}>
                        <span>{assignment.label}</span>
                        <code>{assignment.value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className={styles.tokenGrid3Column}>
            <div className={styles.tokenCategory}>
              <h3>Colors</h3>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('colors.core') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Named colors</h4>
                <ExtendedTokenInput
                  label="Body background"
                  value={valuesThemeData.layout.bodyBackgroundColor}
                  onChange={(v) => handleTokenChange('layout', 'bodyBackgroundColor', v)}
                />
                <ExtendedTokenInput
                  label="Background 1"
                  value={valuesThemeData.layout.background1Color}
                  onChange={(v) => handleTokenChange('layout', 'background1Color', v)}
                />
                <ExtendedTokenInput
                  label="Background 2"
                  value={valuesThemeData.layout.background2Color}
                  onChange={(v) => handleTokenChange('layout', 'background2Color', v)}
                />
                <ExtendedTokenInput
                  label="Border 1"
                  value={valuesThemeData.layout.border1Color}
                  onChange={(v) => handleTokenChange('layout', 'border1Color', v)}
                />
                <ExtendedTokenInput
                  label="Border 2"
                  value={valuesThemeData.layout.border2Color}
                  onChange={(v) => handleTokenChange('layout', 'border2Color', v)}
                />
                <ExtendedTokenInput
                  label="Text 1"
                  value={valuesThemeData.typography.textColors.text1}
                  onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text1', v)}
                />
                <ExtendedTokenInput
                  label="Text 2"
                  value={valuesThemeData.typography.textColors.text2}
                  onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text2', v)}
                />
              </div>
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
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('colors.overlays') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Overlays</h4>
                <label className={styles.architectureField}>
                  <span>Canvas texture</span>
                  <select
                    value={valuesThemeData.gradients.canvasTexture ?? 'none'}
                    onChange={(e) => handleTokenChange('gradients', 'canvasTexture', e.target.value)}
                  >
                    {CANVAS_TEXTURE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <ExtendedTokenInput
                  label="Gradient Fade"
                  value={valuesThemeData.gradients.bottomOverlay}
                  onChange={(v) => handleTokenChange('gradients', 'bottomOverlay', v)}
                />
                <ExtendedTokenInput
                  label="Gradient Fade Strong"
                  value={valuesThemeData.gradients.bottomOverlayStrong}
                  onChange={(v) => handleTokenChange('gradients', 'bottomOverlayStrong', v)}
                />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('colors.states') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>State colors</h4>
                <ExtendedTokenInput
                  label="Success background"
                  value={valuesThemeData.states.success.backgroundColor}
                  onChange={(v) => handleNestedTokenChange('states', 'success', 'backgroundColor', v)}
                />
                <ExtendedTokenInput
                  label="Success border"
                  value={valuesThemeData.states.success.borderColor}
                  onChange={(v) => handleNestedTokenChange('states', 'success', 'borderColor', v)}
                />
                <ExtendedTokenInput
                  label="Error background"
                  value={valuesThemeData.states.error.backgroundColor}
                  onChange={(v) => handleNestedTokenChange('states', 'error', 'backgroundColor', v)}
                />
                <ExtendedTokenInput
                  label="Error border"
                  value={valuesThemeData.states.error.borderColor}
                  onChange={(v) => handleNestedTokenChange('states', 'error', 'borderColor', v)}
                />
                <ExtendedTokenInput
                  label="Warning background"
                  value={valuesThemeData.states.warning.backgroundColor}
                  onChange={(v) => handleNestedTokenChange('states', 'warning', 'backgroundColor', v)}
                />
                <ExtendedTokenInput
                  label="Warning border"
                  value={valuesThemeData.states.warning.borderColor}
                  onChange={(v) => handleNestedTokenChange('states', 'warning', 'borderColor', v)}
                />
                <ExtendedTokenInput
                  label="Info background"
                  value={valuesThemeData.states.info.backgroundColor}
                  onChange={(v) => handleNestedTokenChange('states', 'info', 'backgroundColor', v)}
                />
                <ExtendedTokenInput
                  label="Info border"
                  value={valuesThemeData.states.info.borderColor}
                  onChange={(v) => handleNestedTokenChange('states', 'info', 'borderColor', v)}
                />
              </div>
            </div>

            <div className={styles.tokenCategory}>
              <h3>Typography</h3>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('typography.families') ? styles.tokenSubsectionRelevant : ''}`}>
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
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('typography.sizes') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Sizes</h4>
                <FontSizeTokenInput label="XXS" value={valuesThemeData.typography.fontSizes.xxs} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xxs', v)} />
                <FontSizeTokenInput label="XS" value={valuesThemeData.typography.fontSizes.xs} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xs', v)} />
                <FontSizeTokenInput label="SM" value={valuesThemeData.typography.fontSizes.sm} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'sm', v)} tokenPath="font-size/sm" />
                <FontSizeTokenInput label="Base" value={valuesThemeData.typography.fontSizes.base} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'base', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.typography.fontSizes.lg} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.typography.fontSizes.xl} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xl', v)} />
                <FontSizeTokenInput label="2XL" value={valuesThemeData.typography.fontSizes['2xl']} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '2xl', v)} />
                <FontSizeTokenInput label="3XL" value={valuesThemeData.typography.fontSizes['3xl']} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '3xl', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('typography.weights') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Weights</h4>
                <FontWeightInput label="Normal" value={valuesThemeData.typography.fontWeights.normal} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'normal', v)} />
                <FontWeightInput label="Medium" value={valuesThemeData.typography.fontWeights.medium} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'medium', v)} />
                <FontWeightInput label="Semibold" value={valuesThemeData.typography.fontWeights.semibold} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'semibold', v)} />
                <FontWeightInput label="Bold" value={valuesThemeData.typography.fontWeights.bold} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'bold', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('typography.fluid') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Fluid Sizes</h4>
                <ExtendedTokenInput label="Fld1" value={valuesThemeData.typography.fluidFontSizes.size1} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size1', v)} />
                <ExtendedTokenInput label="Fld2" value={valuesThemeData.typography.fluidFontSizes.size2} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size2', v)} />
                <ExtendedTokenInput label="Fld3" value={valuesThemeData.typography.fluidFontSizes.size3} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size3', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('typography.lineHeights') ? styles.tokenSubsectionRelevant : ''}`}>
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
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.layout') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Layout metrics</h4>
                <FontSizeTokenInput label="Container max" value={valuesThemeData.layout.containerMaxWidth} onChange={(v) => handleTokenChange('layout', 'containerMaxWidth', v)} />
                <FontSizeTokenInput label="Sidebar width" value={valuesThemeData.layout.sidebarWidth} onChange={(v) => handleTokenChange('layout', 'sidebarWidth', v)} />
                <FontSizeTokenInput label="Sidebar mobile" value={valuesThemeData.layout.sidebarWidthMobile} onChange={(v) => handleTokenChange('layout', 'sidebarWidthMobile', v)} />
                <FontSizeTokenInput label="Logo max height" value={valuesThemeData.layout.logoMaxHeight} onChange={(v) => handleTokenChange('layout', 'logoMaxHeight', v)} />
                <FontSizeTokenInput label="Form min width" value={valuesThemeData.layout.formMinWidth} onChange={(v) => handleTokenChange('layout', 'formMinWidth', v)} />
                <FontSizeTokenInput label="Button min width" value={valuesThemeData.layout.buttonMinWidth} onChange={(v) => handleTokenChange('layout', 'buttonMinWidth', v)} />
                <FontSizeTokenInput label="Icon min width" value={valuesThemeData.layout.iconMinWidth} onChange={(v) => handleTokenChange('layout', 'iconMinWidth', v)} />
                <FontSizeTokenInput label="Spinner size" value={valuesThemeData.layout.spinnerSize} onChange={(v) => handleTokenChange('layout', 'spinnerSize', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.spacing') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Card Spacing</h4>
                <FontSizeTokenInput label="Unit" value={valuesThemeData.spacing.unit} onChange={(v) => handleTokenChange('spacing', 'unit', v)} />
                <SpacingMultiplierInput label="SM Factor" value={valuesThemeData.spacing.smMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'smMultiplier', v)} />
                <SpacingMultiplierInput label="MD Factor" value={valuesThemeData.spacing.mdMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'mdMultiplier', v)} />
                <SpacingMultiplierInput label="LG Factor" value={valuesThemeData.spacing.lgMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'lgMultiplier', v)} />
                <SpacingMultiplierInput label="XL Factor" value={valuesThemeData.spacing.xlMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'xlMultiplier', v)} />
                <FontSizeTokenInput label="SM" value={valuesThemeData.spacing.sm} onChange={(v) => handleTokenChange('spacing', 'sm', v)} tokenPath="spacing/sm" />
                <FontSizeTokenInput label="MD" value={valuesThemeData.spacing.md} onChange={(v) => handleTokenChange('spacing', 'md', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.spacing.lg} onChange={(v) => handleTokenChange('spacing', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.spacing.xl} onChange={(v) => handleTokenChange('spacing', 'xl', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.spacing') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Control Spacing</h4>
                <SpacingMultiplierInput label="XS Factor" value={valuesThemeData.spacing.xsMultiplier || ''} onChange={(v) => handleTokenChange('spacing', 'xsMultiplier', v)} />
                <FontSizeTokenInput label="XS" value={valuesThemeData.spacing.xs} onChange={(v) => handleTokenChange('spacing', 'xs', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.borders') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Border</h4>
                <FontSizeTokenInput label="Thin" value={valuesThemeData.borders.widths.thin} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thin', v)} />
                <FontSizeTokenInput label="Medium" value={valuesThemeData.borders.widths.medium} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'medium', v)} />
                <FontSizeTokenInput label="Thick" value={valuesThemeData.borders.widths.thick} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thick', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.radii') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Radii</h4>
                <FontSizeTokenInput label="SM" value={valuesThemeData.borders.radius.sm} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'sm', v)} tokenPath="border/radius/sm" />
                <FontSizeTokenInput label="MD" value={valuesThemeData.borders.radius.md} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'md', v)} />
                <FontSizeTokenInput label="LG" value={valuesThemeData.borders.radius.lg} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={valuesThemeData.borders.radius.xl} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'xl', v)} />
                <FontSizeTokenInput label="Full" value={valuesThemeData.borders.radius.full} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'full', v)} />
              </div>
              <div className={`${styles.tokenSubsection} ${relevantValueSectionIds.includes('structure.shadows') ? styles.tokenSubsectionRelevant : ''}`}>
                <h4>Shadows</h4>
                <FontSizeTokenInput label="Strength Light" value={valuesThemeData.shadows.strength} onChange={(v) => handleTokenChange('shadows', 'strength', v)} />
                <FontSizeTokenInput label="Strength Dark" value={valuesThemeData.shadows.strengthDark} onChange={(v) => handleTokenChange('shadows', 'strengthDark', v)} />
                <ExtendedTokenInput label="Color" value={valuesThemeData.shadows.color} onChange={(v) => handleTokenChange('shadows', 'color', v)} />
                <ExtendedTokenInput label="SM" value={valuesThemeData.shadows.sm} onChange={(v) => handleTokenChange('shadows', 'sm', v)} tokenPath="shadow/sm" />
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
            <div className={styles.toggleGroup} aria-label="Theme target">
              <button
                type="button"
                className={selectedThemeTarget === 'reader' ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => setSelectedThemeTarget('reader')}
              >
                Reader
              </button>
              <button
                type="button"
                className={selectedThemeTarget === 'workbench' ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => setSelectedThemeTarget('workbench')}
              >
                Workbench
              </button>
            </div>
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
            {selectedThemeTarget === 'reader' ? (
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
            ) : (
              <div className={styles.draftStatus}>
                Workbench preset: {activeAdminPresetId === 'admin' ? 'Admin' : 'Custom'}
              </div>
            )}
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
                <p className={styles.architectureText}>
                  {selectedThemeTarget === 'reader'
                    ? 'Choose the reader surfaces you want to shape, then edit their visible attributes.'
                    : 'Choose the workbench surfaces you want to shape, then edit the admin-side values that drive them.'}
                </p>
              </div>
            </div>
            <div className={styles.paneBody}>
              <section className={styles.architectureCard}>
                <div className={styles.componentSelectorGroups}>
                  <section className={styles.componentSelectorGroup}>
                    <div className={styles.componentSelectorGroupHeader}>
                      <strong>{selectedThemeTarget === 'reader' ? 'Reader navigator' : 'Workbench navigator'}</strong>
                    </div>
                    <div className={styles.navigatorSectionTabs}>
                      {selectedThemeTarget === 'reader' ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.navigatorSectionTabActive}
                        >
                          Workbench
                        </button>
                      )}
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
                    <div className={styles.componentHeaderCopy}>
                      <strong>{selectedComponent ? (COMPONENT_TAB_LABELS[selectedComponent.id] ?? selectedComponent.label) : 'Component'}</strong>
                      {selectedComponentDescription ? <span className={styles.componentHeaderDescription}>{selectedComponentDescription}</span> : null}
                    </div>
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
                      <div className={styles.componentHeaderCopy}>
                        <div className={styles.componentHeaderTitleRow}>
                          <strong>{selectedAttributeLabel}</strong>
                          {selectedAttributeOwnership ? (
                            <span className={selectedAttributeOwnership === 'Shared' ? styles.sharedBadge : styles.localBadge}>
                              {selectedAttributeOwnership}
                            </span>
                          ) : null}
                        </div>
                        {selectedAttributeImpact ? <span className={styles.componentHeaderDescription}>{selectedAttributeImpact}</span> : null}
                      </div>
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
                <p className={styles.architectureText}>
                  {selectedThemeTarget === 'reader'
                    ? 'These values feed reader components and reader-side shared roles.'
                    : 'These values feed workbench components and the saved admin-scoped theme.'}
                </p>
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

