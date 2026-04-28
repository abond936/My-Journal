import { promises as fs } from 'fs';
import * as path from 'path';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  StructuredThemeData,
  TypographyTokens,
  SpacingTokens,
  BorderTokens,
  ShadowTokens,
  ZIndexTokens,
  LayoutTokens,
  ComponentTokens,
  StateTokens,
  GradientTokens,
  PersistedThemeDocumentData,
  ThemeColor,
  ResolvedScopedThemeDocumentData,
  ResolvedScopedThemeSettings,
  ReaderThemeRecipes,
  ThemeRecipeTokenRef,
} from '@/lib/types/theme';
import { getDefaultScopedThemeDocument, READER_PRESET_ALIAS_GROUPS } from '@/lib/theme/themePresets';
import { DEFAULT_READER_THEME_RECIPES, normalizeReaderThemeRecipes } from '@/lib/theme/readerThemeSystem';
import { scopeThemeTokensCss } from '@/lib/theme/scopeThemeTokensCss';

/**
 * Server-side theme service: JSON backup, Firestore runtime source, CSS token generation.
 * Do not import from client components.
 */

const THEME_FIRESTORE_COLLECTION = 'app_settings';
const THEME_FIRESTORE_DOC = 'theme';

/**
 * Converts a HEX color to HSL components.
 * This utility matches the frontend hexToHsl function exactly.
 */
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  // Remove the hash if present
  const cleanHex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

function getEmptyThemeData(): StructuredThemeData {
  return {
    palette: [],
    themeColors: [],
    typography: {} as TypographyTokens,
    spacing: {} as SpacingTokens,
    borders: {} as BorderTokens,
    shadows: {} as ShadowTokens,
    zIndex: {} as ZIndexTokens,
    layout: {} as LayoutTokens,
    components: {} as ComponentTokens,
    states: {} as StateTokens,
    gradients: {} as GradientTokens,
  };
}

async function readThemeJsonFile(): Promise<unknown> {
  const jsonPath = path.join(process.cwd(), 'theme-data.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  return JSON.parse(jsonContent);
}

function coerceStructuredThemeData(
  data: unknown
): StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes } {
  const normalized = normalizeThemeDocument(data);
  return {
    ...normalized.reader.data,
    activePresetId: normalized.reader.activePresetId,
    recipes: normalized.reader.recipes,
  };
}

/**
 * Reads reader theme data from the JSON file.
 * Accepts either the legacy flat shape or the scoped persisted document.
 */
export const getThemeData = async (): Promise<StructuredThemeData> => {
  try {
    return coerceStructuredThemeData(await readThemeJsonFile());
  } catch (error) {
    console.error('Failed to read theme JSON file:', error);
    return getEmptyThemeData();
  }
};

/**
 * Helper function to generate 3-shade color scales for theme colors
 */
const generateColorScales = (themeColors: ThemeColor[]): string => {
  let css = '';
  
  themeColors.forEach(color => {
    // Use HEX values and convert to HSL, matching the interface exactly
    const lightHsl = hexToHsl(color.light.hex);
    const lightL = lightHsl.l;
    
    if (color.id === 1) {
      // Color 1 (Background): 100=darkest, 200=medium, 300=lightest (consistent layering)
      const step1 = Math.min(100, lightL + 10); // 10% lighter
      const step2 = Math.min(100, lightL + 20); // 20% lighter
      
      css += `  /* Color ${color.id} Light Mode Scale */\n`;
      css += `  --color${color.id}-100: hsl(${lightHsl.h}, ${lightHsl.s}%, ${lightHsl.l}%);\n`;
      css += `  --color${color.id}-200: hsl(${lightHsl.h}, ${lightHsl.s}%, ${step1}%);\n`;
      css += `  --color${color.id}-300: hsl(${lightHsl.h}, ${lightHsl.s}%, ${step2}%);\n`;
    } else if (color.id === 2) {
      // Color 2 (Text): 100=lightest, 200=medium, 300=darkest (consistent layering)
      const step1 = Math.max(0, lightL - 10); // 10% darker
      const step2 = Math.max(0, lightL - 20); // 20% darker
      
      css += `  /* Color ${color.id} Light Mode Scale */\n`;
      css += `  --color${color.id}-100: hsl(${lightHsl.h}, ${lightHsl.s}%, ${lightHsl.l}%);\n`;
      css += `  --color${color.id}-200: hsl(${lightHsl.h}, ${lightHsl.s}%, ${step1}%);\n`;
      css += `  --color${color.id}-300: hsl(${lightHsl.h}, ${lightHsl.s}%, ${step2}%);\n`;
    }
  });
  
  return css;
};

/**
 * Helper function to generate dark mode color scale overrides
 */
const generateDarkModeColorScales = (themeColors: ThemeColor[]): string => {
  let css = '';
  
  themeColors.forEach(color => {
    // Use HEX values and convert to HSL, matching the interface exactly
    const darkHsl = hexToHsl(color.dark.hex);
    const darkL = darkHsl.l;
    
    if (color.id === 1) {
      // Color 1 (Background): 100=darkest, 200=medium, 300=lightest (consistent layering)
      const step1 = Math.min(100, darkL + 10); // 10% lighter
      const step2 = Math.min(100, darkL + 20); // 20% lighter
      
      css += `  /* Color ${color.id} Dark Mode Scale */\n`;
      css += `  --color${color.id}-100: hsl(${darkHsl.h}, ${darkHsl.s}%, ${darkHsl.l}%);\n`;
      css += `  --color${color.id}-200: hsl(${darkHsl.h}, ${darkHsl.s}%, ${step1}%);\n`;
      css += `  --color${color.id}-300: hsl(${darkHsl.h}, ${darkHsl.s}%, ${step2}%);\n`;
    } else if (color.id === 2) {
      // Color 2 (Text): 100=lightest, 200=medium, 300=darkest (consistent layering)
      const step1 = Math.max(0, darkL - 10); // 10% darker
      const step2 = Math.max(0, darkL - 20); // 20% darker
      
      css += `  /* Color ${color.id} Dark Mode Scale */\n`;
      css += `  --color${color.id}-100: hsl(${darkHsl.h}, ${darkHsl.s}%, ${darkHsl.l}%);\n`;
      css += `  --color${color.id}-200: hsl(${darkHsl.h}, ${darkHsl.s}%, ${step1}%);\n`;
      css += `  --color${color.id}-300: hsl(${darkHsl.h}, ${darkHsl.s}%, ${step2}%);\n`;
    }
  });
  
  return css;
};

const generateThemeColorHslAliases = (themeColors: ThemeColor[], variant: 'light' | 'dark'): string => {
  let css = '';

  themeColors.forEach(color => {
    if (color.id !== 1 && color.id !== 2) return;
    const hsl = hexToHsl(color[variant].hex);
    css += `  --h${color.id}: ${hsl.h}; /* Color ${color.id} ${variant} compatibility alias */\n`;
    css += `  --s${color.id}: ${hsl.s}%;\n`;
    css += `  --l${color.id}: ${hsl.l}%;\n`;
  });

  return css;
};

const generatePaletteColorHslAliases = (palette: StructuredThemeData['palette']): string => {
  let css = '';

  palette.forEach((color) => {
    const hsl = hexToHsl(color.hex);
    css += `  --h${color.id}: ${hsl.h}; /* ${color.name} */\n`;
    css += `  --s${color.id}: ${hsl.s}%;\n`;
    css += `  --l${color.id}: ${hsl.l}%;\n`;
  });

  return css;
};

function generateReaderPresetAliasCss(activePresetId?: string): string {
  if (activePresetId !== 'journal' && activePresetId !== 'editorial') return '';

  const groups = READER_PRESET_ALIAS_GROUPS[activePresetId];
  let css = `
  /* Reader preset role aliases (${activePresetId}) */
`;

  Object.entries(groups).forEach(([role, aliases]) => {
    const entries = Object.entries(aliases);
    if (!entries.length) return;
    css += `  /* ${role} */\n`;
    entries.forEach(([name, value]) => {
      css += `  ${name}: ${value};\n`;
    });
  });

  return css;
}

/**
 * CSS variable blocks for :root and [data-theme="dark"] only (no global element rules).
 * Injected in RootLayout so tokens work on serverless without writing the repo.
 */
/** `color5` → `5` for var(--color${n}); safe if ref is missing (matches prior .replace('color', '') semantics). */
function stripColorRefForVar(ref: string | undefined, fallback: string): string {
  const s = typeof ref === 'string' && ref.trim() ? ref.trim() : fallback;
  return s.replace('color', '');
}

function tokenValue(ref: string | undefined, fallback: string): string {
  const s = typeof ref === 'string' && ref.trim() ? ref.trim() : fallback;
  if (s.includes(' ') && !/[(),]/.test(s)) {
    return s
      .split(/\s+/)
      .map((part) => tokenValue(part, part))
      .join(' ');
  }
  if (/^color\d+(-\d+)?$/.test(s)) return `var(--${s})`;
  if (/^[a-z-]+\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(s)) return `var(--${s.replace(/\//g, '-')})`;
  if (/^[a-z-]+\/[a-z0-9-]+$/i.test(s)) return `var(--${s.replace(/\//g, '-')})`;
  if (/^font-family-/.test(s)) return `var(--${s})`;
  return s;
}

function getThemeRecipeRefValue(themeData: StructuredThemeData, ref: ThemeRecipeTokenRef): string {
  const parts = ref.split('/');
  switch (parts[0]) {
    case 'font-family': {
      const familyKey = parts[1];
      if (familyKey === 'sans') return themeData.typography.fontFamilies.sans1;
      if (familyKey === 'serif') return themeData.typography.fontFamilies.serif1;
      if (familyKey === 'handwriting') return themeData.typography.fontFamilies.handwriting1;
      return themeData.typography.fontFamilies[familyKey as keyof StructuredThemeData['typography']['fontFamilies']];
    }
    case 'font-size':
      return themeData.typography.fontSizes[parts[1] as keyof StructuredThemeData['typography']['fontSizes']];
    case 'font-weight': {
      const map: Record<string, keyof StructuredThemeData['typography']['fontWeights']> = {
        normal: 'normal',
        medium: 'medium',
        semibold: 'semibold',
        bold: 'bold',
      };
      return themeData.typography.fontWeights[map[parts[1]]];
    }
    case 'line-height':
      return themeData.typography.lineHeights[parts[1] as keyof StructuredThemeData['typography']['lineHeights']];
    case 'spacing':
      return `var(--spacing-${parts[1]})`;
    case 'border':
      return parts[1] === 'radius' ? themeData.borders.radius[parts[2] as keyof StructuredThemeData['borders']['radius']] : '';
    case 'shadow':
      return themeData.shadows[parts[1] as keyof StructuredThemeData['shadows']];
    case 'palette':
      return `var(--color${parts[1]})`;
    case 'theme-color':
      return themeData.themeColors.find((color) => String(color.id) === parts[1])?.[parts[2] as 'light' | 'dark']?.hex ?? '';
    case 'layout': {
      const path = parts.slice(1);
      const layoutValue = path.reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), themeData.layout);
      return typeof layoutValue === 'string' ? tokenValue(layoutValue, layoutValue) : '';
    }
    case 'component': {
      const path = parts.slice(1);
      const componentValue = path.reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), themeData.components);
      return typeof componentValue === 'string' ? tokenValue(componentValue, componentValue) : '';
    }
    case 'semantic': {
      const semanticKey = parts.slice(1).join('/');
      switch (semanticKey) {
        case 'reader/tonal-text-primary':
          return 'var(--reader-page-text-color)';
        case 'reader/tonal-text-secondary':
          return 'var(--reader-chrome-muted-color)';
        case 'reader/contrast-on-fill-text':
          return 'var(--reader-contrast-on-fill-text-color)';
        case 'reader/overlay-contrast-text':
          return 'var(--reader-overlay-contrast-text-color)';
        case 'reader/accent':
          return 'var(--reader-accent-color)';
        case 'reader/focus-ring':
          return 'var(--reader-focus-ring-color)';
        case 'reader/canvas-surface':
          return 'var(--reader-page-background-color)';
        case 'reader/canvas-border':
          return 'var(--reader-page-border-color)';
        case 'reader/chrome-surface':
          return 'var(--reader-chrome-background-color)';
        case 'reader/chrome-border':
          return 'var(--reader-chrome-border-color)';
        case 'reader/field-surface':
          return 'var(--reader-support-control-background-color)';
        case 'reader/field-border':
          return 'var(--reader-support-control-border-color)';
        case 'reader/feedback-surface':
          return 'var(--reader-feedback-panel-background-color)';
        case 'reader/feedback-border':
          return 'var(--reader-feedback-panel-border-color)';
        case 'reader/media-frame-surface':
          return 'var(--reader-media-frame-background-color)';
        case 'reader/media-frame-border':
          return 'var(--reader-media-frame-border-color)';
        case 'reader/discovery-surface':
          return 'var(--reader-discovery-card-background-color)';
        case 'reader/discovery-border':
          return 'var(--reader-discovery-border-color)';
        case 'reader/media-control-surface':
          return 'var(--reader-media-control-background-color)';
        case 'reader/media-control-border':
          return 'var(--reader-media-control-border-color)';
        case 'reader/lightbox-control-surface':
          return 'var(--reader-lightbox-control-background-color)';
        case 'reader/lightbox-control-border':
          return 'var(--reader-lightbox-control-border-color)';
        case 'reader/overlay-scrim':
          return 'var(--reader-overlay-scrim-color)';
        case 'reader/overlay-scrim-strong':
          return 'var(--reader-overlay-strong-scrim-color)';
        case 'reader/overlay-border':
          return 'var(--reader-overlay-border-color)';
        default:
          return '';
      }
    }
    case 'state': {
      const tone = parts[1] as keyof StructuredThemeData['states'];
      const field = parts[2] === 'background' ? 'backgroundColor' : 'borderColor';
      return tokenValue(themeData.states[tone][field], themeData.states[tone][field]);
    }
    case 'gradient':
      return themeData.gradients[parts[1] as keyof StructuredThemeData['gradients']];
    case 'literal': {
      const literalPath = parts.slice(1).join('/');
      if (literalPath === 'transparent') return 'transparent';
      const value = literalPath.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), themeData as unknown as Record<string, unknown>);
      return typeof value === 'string' ? tokenValue(value, value) : literalPath;
    }
    default:
      return '';
  }
}

function resolveTypographyFontStyle(
  themeData: StructuredThemeData,
  fontStyle: 'normal' | 'italic' | undefined
): string {
  const styleKey = fontStyle ?? 'normal';
  return themeData.typography.styles?.[styleKey] ?? styleKey;
}

function mergeReaderThemeRecipes(recipes?: ReaderThemeRecipes): ReaderThemeRecipes {
  const normalized = normalizeReaderThemeRecipes(recipes);
  return {
    ...DEFAULT_READER_THEME_RECIPES,
    ...normalized,
    typography: { ...DEFAULT_READER_THEME_RECIPES.typography, ...normalized?.typography },
    surfaces: { ...DEFAULT_READER_THEME_RECIPES.surfaces, ...normalized?.surfaces },
    controls: { ...DEFAULT_READER_THEME_RECIPES.controls, ...normalized?.controls },
    tags: { ...DEFAULT_READER_THEME_RECIPES.tags, ...normalized?.tags },
    overlays: { ...DEFAULT_READER_THEME_RECIPES.overlays, ...normalized?.overlays },
    iconography: { ...DEFAULT_READER_THEME_RECIPES.iconography, ...normalized?.iconography },
    treatments: { ...DEFAULT_READER_THEME_RECIPES.treatments, ...normalized?.treatments },
  };
}

function resolveReaderSemanticClassValues(
  themeData: StructuredThemeData
): {
  tonalTextPrimaryColor: string;
  tonalTextSecondaryColor: string;
  contrastOnFillTextColor: string;
  overlayContrastTextColor: string;
  overlayScrimColor: string;
  overlayBorderColor: string;
  overlayStrongScrimColor: string;
} {
  const resolveSemanticRecipeValue = (
    ref: ThemeRecipeTokenRef | undefined,
    semanticRef: ThemeRecipeTokenRef,
    fallback: string
  ): string => {
    if (!ref || ref === semanticRef) {
      return tokenValue(fallback, fallback);
    }
    return getThemeRecipeRefValue(themeData, ref);
  };

  const recipes = mergeReaderThemeRecipes(themeData.recipes);

  return {
    tonalTextPrimaryColor: 'var(--text1-color)',
    tonalTextSecondaryColor: 'var(--text2-color)',
    contrastOnFillTextColor: resolveSemanticRecipeValue(
      recipes.controls.chromeActiveTab.text,
      'semantic/reader/contrast-on-fill-text',
      'component/button/solid/textColor'
    ),
    overlayContrastTextColor: resolveSemanticRecipeValue(
      recipes.overlays.card.text,
      'semantic/reader/overlay-contrast-text',
      'component/button/solid/textColor'
    ),
    overlayScrimColor: 'color-mix(in srgb, var(--reader-page-text-color) 68%, transparent)',
    overlayBorderColor: 'color-mix(in srgb, var(--reader-page-background-color) 22%, transparent)',
    overlayStrongScrimColor: 'color-mix(in srgb, var(--reader-page-text-color) 92%, transparent)',
  };
}

export function buildThemeTokensCss(
  themeData: StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes }
): string {
  const recipes = mergeReaderThemeRecipes(themeData.recipes);
  const semantic = resolveReaderSemanticClassValues(themeData);
  const resolveConcreteRecipeValue = (
    ref: ThemeRecipeTokenRef | undefined,
    semanticRef: ThemeRecipeTokenRef,
    fallback: string
  ): string => {
    if (!ref || ref === semanticRef) {
      return tokenValue(fallback, fallback);
    }
    return getThemeRecipeRefValue(themeData, ref);
  };
  let cssContent = `/*
  Unified Design System (v2) - Simplified 3-Shade Approach
  ==========================================
  This file represents the single source of truth for all styling tokens,
  built on a simplified 3-shade color system for theme colors 1 and 2.
  
  APPROACH:
  - Color 1: Background (100=darkest, 200=medium, 300=lightest) - consistent layering
  - Color 2: Text/Foreground (100=lightest, 200=medium, 300=darkest) - consistent layering
  - Colors 3-14: Semantic colors with single values
  - Automatic light/dark mode switching with appropriate shade mapping

  Structure:
  1. Base Tokens: Raw, context-agnostic primitive values.
  2. Global Element Tokens: Application-wide styles for foundational HTML elements.
  3. Component Tokens: Scoped styles for specific, reusable components.
*/

/*
 * =================================================================
 * LIGHT THEME (DEFAULT)
 * =================================================================
 */
:root {
  /* --- 1. BASE TOKENS --- */

  /* Color Palette (HEX-based) */
`;

    // Generate HEX color definitions for colors 3-14
    themeData.palette.forEach(color => {
      if (color.id > 2) { // Only colors 3-14
        cssContent += `  --hex${color.id}: ${color.hex}; /* ${color.name} */\n`;
      }
    });
    
    cssContent += `  /* --color15: */
  
  /* Color Palette (HSL aliases derived from HEX) */
`;

    cssContent += generatePaletteColorHslAliases(themeData.palette || []);
    
    cssContent += `  /* --hue15: */

  /* Theme Colors 3-Shade Scales (Light Mode) */
`;

    // Generate 3-shade color scales for theme colors (1 and 2)
    cssContent += generateColorScales(themeData.themeColors || []);

    cssContent += `
  /* Compatibility HSL aliases for legacy component overlays */
`;
    cssContent += generateThemeColorHslAliases(themeData.themeColors || [], 'light');

    // Generate base color definitions for colors 3-14
    cssContent += `
  /* Base Color Definitions (Colors 3-14) */
`;
    themeData.palette.forEach(color => {
      if (color.id > 2) { // Only colors 3-14 get base color definitions
        cssContent += `  --color${color.id}: var(--hex${color.id});\n`;
      }
    });

    // Add the rest of the CSS structure
    cssContent += `
  /* Breakpoints (Mobile-First) */
  --breakpoint-sm: ${themeData.layout.breakpoints.sm};
  --breakpoint-md: ${themeData.layout.breakpoints.md};
  --breakpoint-lg: ${themeData.layout.breakpoints.lg};
  --breakpoint-xl: ${themeData.layout.breakpoints.xl};

  /* Typography Scale */
  --font-family-sans1: ${themeData.typography.fontFamilies.sans1};
  --font-family-sans2: ${themeData.typography.fontFamilies.sans2};
  --font-family-sans3: ${themeData.typography.fontFamilies.sans3};
  --font-family-serif1: ${themeData.typography.fontFamilies.serif1};
  --font-family-serif2: ${themeData.typography.fontFamilies.serif2};
  --font-family-serif3: ${themeData.typography.fontFamilies.serif3};
  --font-family-handwriting1: ${themeData.typography.fontFamilies.handwriting1};
  --font-family-handwriting2: ${themeData.typography.fontFamilies.handwriting2};
  --font-family-sans: var(--font-family-sans1);
  --font-family-serif: var(--font-family-serif1);
  --font-family-handwriting: var(--font-family-handwriting1);

  /* Fluid Typography */
  --font-size1-fluid: ${themeData.typography.fluidFontSizes.size1};
  --font-size2-fluid: ${themeData.typography.fluidFontSizes.size2};
  --font-size3-fluid: ${themeData.typography.fluidFontSizes.size3};

  /* Fluid Spacing */
  --spacing1-fluid: ${themeData.spacing.fluidSpacing.spacing1};
  --spacing2-fluid: ${themeData.spacing.fluidSpacing.spacing2};
  --spacing3-fluid: ${themeData.spacing.fluidSpacing.spacing3};

  /* Static Typography */
  --font-size-xs: ${themeData.typography.fontSizes.xs};
  --font-size-sm: ${themeData.typography.fontSizes.sm};
  --font-size-base: ${themeData.typography.fontSizes.base};
  --font-size-lg: ${themeData.typography.fontSizes.lg};
  --font-size-xl: ${themeData.typography.fontSizes.xl};
  --font-size-2xl: ${themeData.typography.fontSizes['2xl']};
  --font-size-3xl: ${themeData.typography.fontSizes['3xl']};
  --font-size-4xl: ${themeData.typography.fontSizes['4xl']};
  --font-size-5xl: ${themeData.typography.fontSizes['5xl']};
  --font-size-6xl: ${themeData.typography.fontSizes['6xl']};

  --font-weight-normal: ${themeData.typography.fontWeights.normal};
  --font-weight-medium: ${themeData.typography.fontWeights.medium};
  --font-weight-semibold: ${themeData.typography.fontWeights.semibold};
  --font-weight-bold: ${themeData.typography.fontWeights.bold};

  /* Card/media admin grid thumbnail overlays — not in theme JSON; must live in injected CSS */
  --font-size-admin-grid-overlay: 0.5rem;
  --admin-grid-overlay-font: var(--font-weight-medium) var(--font-size-admin-grid-overlay) / 1.2 var(--font-family-sans);

  --line-height-base: ${themeData.typography.lineHeights.base};
  --line-height-tight: ${themeData.typography.lineHeights.tight};
  --line-height-relaxed: ${themeData.typography.lineHeights.relaxed};

  /* Spacing Scale */
  --spacing-unit: ${themeData.spacing.unit};
  --spacing-xs: calc(${themeData.spacing.xs} * var(--spacing-unit));
  --spacing-sm: calc(${themeData.spacing.sm} * var(--spacing-unit));
  --spacing-md: calc(${themeData.spacing.md} * var(--spacing-unit));
  --spacing-lg: calc(${themeData.spacing.lg} * var(--spacing-unit));
  --spacing-xl: calc(${themeData.spacing.xl} * var(--spacing-unit));
  --spacing-2xl: calc(${themeData.spacing['2xl']} * var(--spacing-unit));
  --spacing-3xl: calc(${themeData.spacing['3xl']} * var(--spacing-unit));
  --spacing-4xl: calc(${themeData.spacing['4xl']} * var(--spacing-unit));

  /* Border & Radius Scale */
  --border-width-thin: ${themeData.borders.widths.thin};
  --border-width-medium: ${themeData.borders.widths.medium};
  --border-width-thick: ${themeData.borders.widths.thick};
  
  --border-radius-sm: ${themeData.borders.radius.sm};
  --border-radius-md: ${themeData.borders.radius.md};
  --border-radius-lg: ${themeData.borders.radius.lg};
  --border-radius-xl: ${themeData.borders.radius.xl};
  --border-radius-full: ${themeData.borders.radius.full};

  /* Shadow Scale (For Light Theme) */
  --shadow-strength: ${themeData.shadows.strength};
  --shadow-color: ${themeData.shadows.color};
  --shadow-sm: ${themeData.shadows.sm};
  --shadow-md: ${themeData.shadows.md};
  --shadow-lg: ${themeData.shadows.lg};
  --shadow-xl: ${themeData.shadows.xl};

  /* Z-Index Scale */
  --z-index-default: ${themeData.zIndex.default};
  --z-index-content: ${themeData.zIndex.content};
  --z-index-sticky: ${themeData.zIndex.sticky};
  --z-index-modal-backdrop: ${themeData.zIndex.modalBackdrop};
  --z-index-sidebar: ${themeData.zIndex.sidebar};
  --z-index-header: ${themeData.zIndex.header};
  --z-index-modal: ${themeData.zIndex.modal};
  --z-index-tooltip: ${themeData.zIndex.tooltip};

  /* --- 2. GLOBAL ELEMENT TOKENS (LIGHT THEME) --- */
  
  /* Global Body Background */
  --body-background-color: ${tokenValue(themeData.layout.bodyBackgroundColor, 'color1-100')};
  
  /* Layout */
  --layout-container-max-width: ${themeData.layout.containerMaxWidth};
  --body-font-family: var(--${themeData.layout.bodyFontFamily});
  --layout-background1-color: ${tokenValue(themeData.layout.background1Color, 'color1-100')};
  --layout-background2-color: ${tokenValue(themeData.layout.background2Color, 'color1-200')};
  --sidebar-width: ${themeData.layout.sidebarWidth};
  --sidebar-width-mobile: ${themeData.layout.sidebarWidthMobile};
  --logo-max-height: ${themeData.layout.logoMaxHeight};
  --spinner-size: ${themeData.layout.spinnerSize};
  --form-min-width: ${themeData.layout.formMinWidth};
  --button-min-width: ${themeData.layout.buttonMinWidth};
  --icon-min-width: ${themeData.layout.iconMinWidth};
  --transition-short: ${themeData.layout.transitionShort};

  /* Borders */
  --border1-color: ${tokenValue(themeData.layout.border1Color, 'color1-200')};
  --border2-color: ${tokenValue(themeData.layout.border2Color, 'color1-300')};

  /* States */
  --state-success-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.success?.backgroundColor, 'color11')}) / 0.15);
  --state-success-background-color-hover: hsl(var(--h${stripColorRefForVar(themeData.states?.success?.backgroundColor, 'color11')}) / 0.24);
  --state-success-border-color: var(--color${stripColorRefForVar(themeData.states?.success?.borderColor, 'color11')});
  --state-success-text-color: var(--color${stripColorRefForVar(themeData.states?.success?.borderColor, 'color11')});
  --state-success-color: var(--state-success-text-color);
  --state-error-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.error?.backgroundColor, 'color12')}) / 0.15);
  --state-error-background-color-hover: hsl(var(--h${stripColorRefForVar(themeData.states?.error?.backgroundColor, 'color12')}) / 0.24);
  --state-error-border-color: var(--color${stripColorRefForVar(themeData.states?.error?.borderColor, 'color12')});
  --state-error-text-color: var(--color${stripColorRefForVar(themeData.states?.error?.borderColor, 'color12')});
  --state-error-color: var(--state-error-text-color);
  --state-warning-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.warning?.backgroundColor, 'color13')}) / 0.15);
  --state-warning-background-color-hover: hsl(var(--h${stripColorRefForVar(themeData.states?.warning?.backgroundColor, 'color13')}) / 0.24);
  --state-warning-border-color: var(--color${stripColorRefForVar(themeData.states?.warning?.borderColor, 'color13')});
  --state-warning-text-color: var(--color${stripColorRefForVar(themeData.states?.warning?.borderColor, 'color13')});
  --state-warning-color: var(--state-warning-text-color);
  --state-info-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.info?.backgroundColor, 'color14')}) / 0.15);
  --state-info-background-color-hover: hsl(var(--h${stripColorRefForVar(themeData.states?.info?.backgroundColor, 'color14')}) / 0.24);
  --state-info-border-color: var(--color${stripColorRefForVar(themeData.states?.info?.borderColor, 'color14')});
  --state-info-text-color: var(--color${stripColorRefForVar(themeData.states?.info?.borderColor, 'color14')});
  --state-info-color: var(--state-info-text-color);

  /* Typography */
  --text1-color: ${tokenValue(themeData.typography.textColors.text1, 'color2-300')};
  --text2-color: ${tokenValue(themeData.typography.textColors.text2, 'color2-200')};

  /* --- 3. COMPONENT TOKENS --- */
  
  /* Header */
  --header-height: ${themeData.components.header.height};
  --header-background-color: ${tokenValue(themeData.components.header.backgroundColor, 'color1-100')};
  --header-border-color: ${tokenValue(themeData.components.header.borderColor, 'border1-color')};
  --header-border-width: ${tokenValue(themeData.components.header.borderWidth, 'border/width/thin')};
  --header-text-color: ${tokenValue(themeData.components.header.textColor, 'color2-300')};
  --header-icon-color: ${tokenValue(themeData.components.header.iconColor, themeData.components.header.textColor || 'color2-300')};

  /* Button: Solid */
  --button-solid-background-color: ${tokenValue(themeData.components.button.solid.backgroundColor, 'color3')};
  --button-solid-background-color-hover: ${tokenValue(themeData.components.button.solid.backgroundColorHover, 'color3')};
  --button-solid-border-color: ${tokenValue(themeData.components.button.solid.borderColor, 'color3')};
  --button-solid-text-color: ${tokenValue(themeData.components.button.solid.textColor, 'white')};
  
  /* Button: Outline */
  --button-outline-background-color: ${tokenValue(themeData.components.button.outline.backgroundColor, 'transparent')};
  --button-outline-background-color-hover: ${tokenValue(themeData.components.button.outline.backgroundColorHover, 'hsla(var(--h3), var(--s3), var(--l3), 0.1)')};
  --button-outline-border-color: ${tokenValue(themeData.components.button.outline.borderColor, 'border1-color')};
  --button-outline-text-color: ${tokenValue(themeData.components.button.outline.textColor, 'color2-300')};
  --button-outline-border-width: ${tokenValue(themeData.components.button.outline.borderWidth, 'border/width/medium')};

  /* Card */
  --card-background-color: ${tokenValue(themeData.components.card.backgroundColor, 'color1-200')};
  --card-padding: ${tokenValue(themeData.components.card.padding, 'spacing/lg')};
  --card-border-color: ${tokenValue(themeData.components.card.borderColor, 'border1-color')};
  --card-border-width: ${tokenValue(themeData.components.card.borderWidth, 'border/width/medium')};
  --card-border-radius: ${tokenValue(themeData.components.card.borderRadius, 'border/radius/lg')};
  --card-shadow: ${tokenValue(themeData.components.card.shadow, 'shadow/sm')};
  --card-shadow-hover: ${tokenValue(themeData.components.card.shadowHover, 'shadow/md')};
  
  /* Tag */
  --tag-padding: ${tokenValue(themeData.components.tag.padding, 'spacing/xs spacing/sm')};
  --tag-border-radius: ${tokenValue(themeData.components.tag.borderRadius, 'border/radius/full')};
  --tag-font-weight: ${tokenValue(themeData.components.tag.fontWeight, 'font/weight/medium')};
  --tag-font-size: ${tokenValue(themeData.components.tag.fontSize, 'font/size/sm')};
  --tag-font-family: ${tokenValue(themeData.components.tag.fontFamily, 'font/family/sans')};
  --tag-text-color: ${tokenValue(themeData.components.tag.textColor, 'color1-100')};
  --tag-who-bg-color: var(--color${stripColorRefForVar(themeData.components?.tag?.backgrounds?.who, 'color5')});
  --tag-what-bg-color: var(--color${stripColorRefForVar(themeData.components?.tag?.backgrounds?.what, 'color6')});
  --tag-when-bg-color: var(--color${stripColorRefForVar(themeData.components?.tag?.backgrounds?.when, 'color7')});
  --tag-where-bg-color: var(--color${stripColorRefForVar(themeData.components?.tag?.backgrounds?.where, 'color8')});
  
  /* Form & Input */
  --input-background-color: ${tokenValue(themeData.components.input.backgroundColor, 'color1-100')};
  --input-border-color: ${tokenValue(themeData.components.input.borderColor, 'border1-color')};
  --input-border-color-focus: ${tokenValue(themeData.components.input.borderColorFocus, 'color3')};
  --input-text-color: ${tokenValue(themeData.components.input.textColor, 'color2-300')};
  --input-border-radius: ${tokenValue(themeData.components.input.borderRadius, 'border/radius/sm')};
  --input-padding: ${tokenValue(themeData.components.input.padding, 'spacing/sm spacing/md')};

  /* Link */
  --link-text-color: ${tokenValue(themeData.components.link.textColor, 'color3')};
  --link-text-color-hover: ${tokenValue(themeData.components.link.textColorHover, 'color3')};
  --link-decoration-hover: ${themeData.components.link.decorationHover || 'underline'};

  /* Gradients */
  --gradient-bottom-overlay: ${themeData.gradients.bottomOverlay};
  --gradient-bottom-overlay-strong: ${themeData.gradients.bottomOverlayStrong};

  /* Flat-tile raster watermarks (e.g. callout pushpin) */
  --card-watermark-raster-filter: none;

  /* Reader semantic aliases */
  --reader-page-background-color: ${resolveConcreteRecipeValue(recipes.surfaces.canvasPage.background, 'semantic/reader/canvas-surface', 'layout/background1Color')};
  --reader-page-text-color: ${getThemeRecipeRefValue(themeData, recipes.typography.body.color)};
  --reader-page-border-color: ${resolveConcreteRecipeValue(recipes.surfaces.canvasPage.border, 'semantic/reader/canvas-border', 'layout/border1Color')};
  --reader-chrome-background-color: ${resolveConcreteRecipeValue(recipes.surfaces.chromeSidebar.background, 'semantic/reader/chrome-surface', 'layout/background1Color')};
  --reader-chrome-panel-color: ${resolveConcreteRecipeValue(recipes.surfaces.chromeSidebar.background, 'semantic/reader/chrome-surface', 'layout/background1Color')};
  --reader-chrome-border-color: ${resolveConcreteRecipeValue(recipes.surfaces.chromeSidebar.border, 'semantic/reader/chrome-border', 'layout/border1Color')};
  --reader-chrome-text-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.color)};
  --reader-chrome-muted-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.color)};
  --reader-chrome-control-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.chromeSidebar.background)};
  --reader-chrome-control-hover-background-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControl.hoverBackground ?? recipes.controls.fieldControl.background)};
  --reader-chrome-control-subtle-hover-background-color: color-mix(in srgb, var(--reader-chrome-text-color) 15%, transparent);
  --reader-solid-background-color: ${getThemeRecipeRefValue(themeData, recipes.controls.chromeActiveTab.background)};
  --reader-solid-text-color: ${getThemeRecipeRefValue(themeData, recipes.controls.chromeActiveTab.text)};
  --reader-solid-border-color: ${getThemeRecipeRefValue(themeData, recipes.controls.chromeActiveTab.border)};
  --reader-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.title.color)};
  --reader-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.title.family)};
  --reader-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.title.size)};
  --reader-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.title.weight)};
  --reader-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.title.lineHeight)};
  --reader-story-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.storyTitle.color)};
  --reader-story-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.storyTitle.family)};
  --reader-story-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.storyTitle.size)};
  --reader-story-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.storyTitle.weight)};
  --reader-story-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.storyTitle.lineHeight)};
  --reader-story-overlay-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.storyOverlayTitle.color)};
  --reader-story-overlay-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.storyOverlayTitle.family)};
  --reader-story-overlay-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.storyOverlayTitle.size)};
  --reader-story-overlay-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.storyOverlayTitle.weight)};
  --reader-story-overlay-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.storyOverlayTitle.lineHeight)};
  --reader-story-excerpt-color: ${getThemeRecipeRefValue(themeData, recipes.typography.storyExcerpt.color)};
  --reader-story-excerpt-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.storyExcerpt.family)};
  --reader-story-excerpt-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.storyExcerpt.size)};
  --reader-story-excerpt-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.storyExcerpt.weight)};
  --reader-story-excerpt-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.storyExcerpt.lineHeight)};
  --reader-story-card-padding: ${getThemeRecipeRefValue(themeData, recipes.surfaces.storyCardClosed.padding ?? recipes.surfaces.card.padding ?? 'component/card/padding')};
  --reader-question-card-padding: ${getThemeRecipeRefValue(themeData, recipes.surfaces.qaCardClosed.padding ?? recipes.surfaces.card.padding ?? 'component/card/padding')};
  --reader-gallery-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryTitle.color)};
  --reader-gallery-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryTitle.family)};
  --reader-gallery-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryTitle.size)};
  --reader-gallery-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryTitle.weight)};
  --reader-gallery-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryTitle.lineHeight)};
  --reader-gallery-overlay-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryOverlayTitle.color)};
  --reader-gallery-overlay-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryOverlayTitle.family)};
  --reader-gallery-overlay-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryOverlayTitle.size)};
  --reader-gallery-overlay-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryOverlayTitle.weight)};
  --reader-gallery-overlay-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryOverlayTitle.lineHeight)};
  --reader-gallery-card-padding: ${getThemeRecipeRefValue(themeData, recipes.surfaces.galleryCardClosed.padding ?? recipes.surfaces.card.padding ?? 'component/card/padding')};
  --reader-gallery-header-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryHeaderTitle.color)};
  --reader-gallery-header-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryHeaderTitle.family)};
  --reader-gallery-header-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryHeaderTitle.size)};
  --reader-gallery-header-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryHeaderTitle.weight)};
  --reader-gallery-header-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryHeaderTitle.lineHeight)};
  --reader-title-small-color: ${getThemeRecipeRefValue(themeData, recipes.typography.titleCompact.color)};
  --reader-title-small-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.titleCompact.family)};
  --reader-title-small-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.titleCompact.size)};
  --reader-title-small-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.titleCompact.weight)};
  --reader-title-small-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.titleCompact.lineHeight)};
  --reader-detail-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.detailTitle.color)};
  --reader-detail-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.detailTitle.family)};
  --reader-detail-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.detailTitle.size)};
  --reader-detail-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.detailTitle.weight)};
  --reader-detail-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.detailTitle.lineHeight)};
  --reader-story-detail-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.storyDetailTitle.color)};
  --reader-story-detail-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.storyDetailTitle.family)};
  --reader-story-detail-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.storyDetailTitle.size)};
  --reader-story-detail-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.storyDetailTitle.weight)};
  --reader-story-detail-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.storyDetailTitle.lineHeight)};
  --reader-gallery-detail-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryDetailTitle.color)};
  --reader-gallery-detail-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryDetailTitle.family)};
  --reader-gallery-detail-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryDetailTitle.size)};
  --reader-gallery-detail-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryDetailTitle.weight)};
  --reader-gallery-detail-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.galleryDetailTitle.lineHeight)};
  --reader-discovery-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryTitle.color)};
  --reader-discovery-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryTitle.family)};
  --reader-discovery-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryTitle.size)};
  --reader-discovery-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryTitle.weight)};
  --reader-discovery-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryTitle.lineHeight)};
  --reader-discovery-meta-color: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryMeta.color)};
  --reader-discovery-meta-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryMeta.family)};
  --reader-discovery-meta-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryMeta.size)};
  --reader-discovery-meta-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryMeta.weight)};
  --reader-discovery-meta-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.discoveryMeta.lineHeight)};
  --reader-rail-section-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.railSectionTitle.color)};
  --reader-rail-section-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.railSectionTitle.family)};
  --reader-rail-section-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.railSectionTitle.size)};
  --reader-rail-section-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.railSectionTitle.weight)};
  --reader-rail-section-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.railSectionTitle.lineHeight)};
  --reader-rail-card-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.railCardTitle.color)};
  --reader-rail-card-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.railCardTitle.family)};
  --reader-rail-card-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.railCardTitle.size)};
  --reader-rail-card-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.railCardTitle.weight)};
  --reader-rail-card-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.railCardTitle.lineHeight)};
  --reader-subtitle-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.subtitle.family)};
  --reader-subtitle-color: ${getThemeRecipeRefValue(themeData, recipes.typography.subtitle.color)};
  --reader-subtitle-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.subtitle.size)};
  --reader-subtitle-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.subtitle.weight)};
  --reader-subtitle-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.subtitle.lineHeight)};
  --reader-subtitle-font-style: ${resolveTypographyFontStyle(themeData, recipes.typography.subtitle.fontStyle)};
  --reader-excerpt-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.excerpt.family)};
  --reader-excerpt-color: ${getThemeRecipeRefValue(themeData, recipes.typography.excerpt.color)};
  --reader-excerpt-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.excerpt.size)};
  --reader-excerpt-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.excerpt.weight)};
  --reader-excerpt-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.excerpt.lineHeight)};
  --reader-body-color: ${getThemeRecipeRefValue(themeData, recipes.typography.body.color)};
  --reader-body-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.body.family)};
  --reader-body-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.body.size)};
  --reader-body-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.body.weight)};
  --reader-body-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.body.lineHeight)};
  --reader-meta-color: ${getThemeRecipeRefValue(themeData, recipes.typography.meta.color)};
  --reader-meta-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.meta.family)};
  --reader-meta-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.meta.size)};
  --reader-meta-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.meta.weight)};
  --reader-meta-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.meta.lineHeight)};
  --reader-accent-color: ${getThemeRecipeRefValue(themeData, recipes.controls.inlineLink.text)};
  --reader-focus-ring-color: ${getThemeRecipeRefValue(themeData, recipes.controls.focusRing.color)};
  --reader-contrast-text-color: ${semantic.contrastOnFillTextColor};
  --reader-contrast-on-fill-text-color: ${semantic.contrastOnFillTextColor};
  --reader-overlay-contrast-text-color: ${semantic.overlayContrastTextColor};
  --reader-overlay-scrim-color: ${semantic.overlayScrimColor};
  --reader-overlay-border-color: ${semantic.overlayBorderColor};
  --reader-overlay-strong-scrim-color: ${semantic.overlayStrongScrimColor};
  --reader-card-hover-border-color: var(--reader-accent-color);
  --reader-card-overlay-background: ${getThemeRecipeRefValue(themeData, recipes.overlays.card.background)};
  --reader-card-overlay-strong-background: ${getThemeRecipeRefValue(themeData, recipes.overlays.cardStrong.background)};
  --reader-card-overlay-text-color: ${getThemeRecipeRefValue(themeData, recipes.overlays.card.text)};
  --reader-card-badge-background-color: ${getThemeRecipeRefValue(themeData, recipes.overlays.card.background)};
  --reader-card-badge-text-color: ${getThemeRecipeRefValue(themeData, recipes.overlays.card.text)};
  --reader-card-badge-border-color: ${getThemeRecipeRefValue(themeData, recipes.overlays.card.border)};
  --reader-card-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.background)};
  --reader-card-flat-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasPage.background)};
  --reader-card-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.border)};
  --reader-card-border-width: var(--card-border-width);
  --reader-card-border-radius: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.radius ?? 'component/card/borderRadius')};
  --reader-card-shadow: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.shadow ?? 'component/card/shadow')};
  --reader-card-shadow-hover: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.shadowHover ?? 'component/card/shadowHover')};
  --reader-card-padding: ${getThemeRecipeRefValue(themeData, recipes.surfaces.card.padding ?? 'component/card/padding')};
  --reader-detail-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasDetail.background)};
  --reader-detail-cover-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasMediaFrame.background)};
  --reader-detail-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasDetail.border)};
  --reader-detail-border-radius: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasDetail.radius ?? 'border/radius/md')};
  --reader-detail-shadow: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasDetail.shadow ?? 'shadow/md')};
  --reader-detail-padding-x: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasDetail.padding ?? 'spacing/xl')};
  --reader-detail-padding-bottom: var(--spacing-2xl);
  --reader-question-color: ${getThemeRecipeRefValue(themeData, recipes.typography.question.color)};
  --reader-question-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.question.family)};
  --reader-question-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.question.size)};
  --reader-question-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.question.weight)};
  --reader-question-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.question.lineHeight)};
  --reader-question-overlay-color: ${getThemeRecipeRefValue(themeData, recipes.typography.questionOverlay.color)};
  --reader-question-overlay-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.questionOverlay.family)};
  --reader-question-overlay-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.questionOverlay.size)};
  --reader-question-overlay-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.questionOverlay.weight)};
  --reader-question-overlay-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.questionOverlay.lineHeight)};
  --reader-question-watermark-color: var(--reader-title-color);
  --reader-question-watermark-opacity: ${recipes.treatments.questionWatermarkOpacity};
  --reader-callout-watermark-opacity: ${recipes.treatments.calloutWatermarkOpacity};
  --reader-quote-color: ${getThemeRecipeRefValue(themeData, recipes.typography.quote.color)};
  --reader-quote-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.quote.family)};
  --reader-quote-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.quote.size)};
  --reader-quote-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.quote.weight)};
  --reader-quote-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.quote.lineHeight)};
  --reader-quote-font-style: ${resolveTypographyFontStyle(themeData, recipes.typography.quote.fontStyle)};
  --reader-quote-watermark-opacity: ${recipes.treatments.quoteWatermarkOpacity};
  --reader-caption-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.caption.family)};
  --reader-caption-color: ${getThemeRecipeRefValue(themeData, recipes.typography.caption.color)};
  --reader-caption-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.caption.size)};
  --reader-caption-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.caption.weight)};
  --reader-caption-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.caption.lineHeight)};
  --reader-support-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeTitle.color)};
  --reader-support-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeTitle.family)};
  --reader-support-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeTitle.size)};
  --reader-support-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeTitle.weight)};
  --reader-support-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeTitle.lineHeight)};
  --reader-support-label-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.color)};
  --reader-support-label-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.family)};
  --reader-support-label-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.size)};
  --reader-support-label-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.weight)};
  --reader-support-label-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeLabel.lineHeight)};
  --reader-support-meta-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.color)};
  --reader-support-meta-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.family)};
  --reader-support-meta-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.size)};
  --reader-support-meta-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.weight)};
  --reader-support-meta-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeMeta.lineHeight)};
  --reader-support-hint-color: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeHint.color)};
  --reader-support-hint-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeHint.family)};
  --reader-support-hint-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeHint.size)};
  --reader-support-hint-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeHint.weight)};
  --reader-support-hint-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.chromeHint.lineHeight)};
  --reader-support-control-text-color: ${getThemeRecipeRefValue(themeData, recipes.typography.fieldControl.color)};
  --reader-support-control-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.fieldControl.family)};
  --reader-support-control-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.fieldControl.size)};
  --reader-support-control-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.fieldControl.weight)};
  --reader-support-control-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.fieldControl.lineHeight)};
  --reader-support-control-background-color: ${resolveConcreteRecipeValue(recipes.controls.fieldControl.background, 'semantic/reader/field-surface', 'component/input/backgroundColor')};
  --reader-support-control-border-color: ${resolveConcreteRecipeValue(recipes.controls.fieldControl.border, 'semantic/reader/field-border', 'component/input/borderColor')};
  --reader-support-control-hover-background-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControl.hoverBackground ?? recipes.controls.fieldControl.background)};
  --reader-support-control-strong-background-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControlStrong.background)};
  --reader-support-control-strong-text-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControlStrong.text)};
  --reader-support-control-strong-border-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControlStrong.border)};
  --reader-support-control-strong-hover-background-color: ${getThemeRecipeRefValue(themeData, recipes.controls.fieldControlStrong.hoverBackground ?? recipes.controls.fieldControlStrong.background)};
  --reader-feedback-panel-background-color: ${resolveConcreteRecipeValue(recipes.surfaces.feedbackPanel.background, 'semantic/reader/feedback-surface', 'layout/background1Color')};
  --reader-feedback-panel-border-color: ${resolveConcreteRecipeValue(recipes.surfaces.feedbackPanel.border, 'semantic/reader/feedback-border', 'layout/border1Color')};
  --reader-feedback-success-panel-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackSuccessPanel.background)};
  --reader-feedback-success-panel-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackSuccessPanel.border)};
  --reader-feedback-warning-panel-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackWarningPanel.background)};
  --reader-feedback-warning-panel-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackWarningPanel.border)};
  --reader-feedback-error-panel-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackErrorPanel.background)};
  --reader-feedback-error-panel-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackErrorPanel.border)};
  --reader-feedback-info-panel-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackInfoPanel.background)};
  --reader-feedback-info-panel-border-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.feedbackInfoPanel.border)};
  --reader-callout-title-color: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutTitle.color)};
  --reader-callout-title-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutTitle.family)};
  --reader-callout-title-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutTitle.size)};
  --reader-callout-title-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutTitle.weight)};
  --reader-callout-title-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutTitle.lineHeight)};
  --reader-callout-body-color: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutBody.color)};
  --reader-callout-body-font-family: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutBody.family)};
  --reader-callout-body-font-size: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutBody.size)};
  --reader-callout-body-font-weight: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutBody.weight)};
  --reader-callout-body-line-height: ${getThemeRecipeRefValue(themeData, recipes.typography.calloutBody.lineHeight)};
  --reader-tag-background-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.background)};
  --reader-tag-text-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.text)};
  --reader-tag-border-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.border)};
  --reader-tag-muted-background-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.background)};
  --reader-tag-muted-text-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.text)};
  --reader-tag-muted-border-color: ${getThemeRecipeRefValue(themeData, recipes.tags.muted.border)};
  --reader-media-frame-background-color: ${resolveConcreteRecipeValue(recipes.surfaces.canvasMediaFrame.background, 'semantic/reader/media-frame-surface', 'layout/background2Color')};
  --reader-media-frame-border-color: ${resolveConcreteRecipeValue(recipes.surfaces.canvasMediaFrame.border, 'semantic/reader/media-frame-border', 'layout/border1Color')};
  --reader-media-placeholder-background-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasMediaFrame.background)};
  --reader-media-control-background-color: ${resolveConcreteRecipeValue(recipes.controls.mediaControl.background, 'semantic/reader/media-control-surface', 'layout/background2Color')};
  --reader-media-control-border-color: ${resolveConcreteRecipeValue(recipes.controls.mediaControl.border, 'semantic/reader/media-control-border', 'layout/border1Color')};
  --reader-media-control-background-color-hover: ${getThemeRecipeRefValue(themeData, recipes.controls.mediaControl.hoverBackground ?? recipes.controls.mediaControl.background)};
  --reader-media-control-text-color: ${getThemeRecipeRefValue(themeData, recipes.controls.mediaControl.text)};
  --reader-media-scrollbar-track-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasMediaFrame.background)};
  --reader-media-scrollbar-thumb-color: ${getThemeRecipeRefValue(themeData, recipes.surfaces.canvasMediaFrame.border)};
  --reader-media-scrollbar-thumb-hover-color: var(--text2-color);
  --reader-lightbox-overlay-background-color: ${getThemeRecipeRefValue(themeData, recipes.overlays.lightbox.background)};
  --reader-lightbox-control-background-color: ${resolveConcreteRecipeValue(recipes.controls.lightboxControl.background, 'semantic/reader/lightbox-control-surface', 'gradient/bottomOverlayStrong')};
  --reader-lightbox-control-border-color: ${resolveConcreteRecipeValue(recipes.controls.lightboxControl.border, 'semantic/reader/lightbox-control-border', 'layout/border1Color')};
  --reader-lightbox-control-text-color: ${getThemeRecipeRefValue(themeData, recipes.controls.lightboxControl.text)};
  --reader-lightbox-caption-text-color: var(--reader-overlay-contrast-text-color);
  --reader-discovery-border-color: ${resolveConcreteRecipeValue(recipes.surfaces.cardDiscovery.border, 'semantic/reader/discovery-border', 'layout/border1Color')};
  --reader-discovery-card-background-color: ${resolveConcreteRecipeValue(recipes.surfaces.cardDiscovery.background, 'semantic/reader/discovery-surface', 'layout/background1Color')};
  --reader-discovery-card-border-color: var(--reader-discovery-border-color);
  --reader-discovery-card-hover-border-color: var(--reader-accent-color);
`;
    cssContent += generateReaderPresetAliasCss(themeData.activePresetId);
    cssContent += `}

/*
 * =================================================================
 * DARK THEME OVERRIDES
 * =================================================================
 */
[data-theme="dark"] {
  /* --- BASE TOKEN OVERRIDES --- */

  /* Shadow Scale (For Dark Theme) */
  --shadow-strength: ${themeData.shadows.strengthDark};
  --shadow-color: hsl(var(--h1) / var(--shadow-strength));

  /* Theme Colors 3-Shade Scales (Dark Mode) */
`;

    // Generate dark mode color scale overrides
    cssContent += generateDarkModeColorScales(themeData.themeColors || []);

    cssContent += `
  /* Compatibility HSL aliases for legacy component overlays */
`;
    cssContent += generateThemeColorHslAliases(themeData.themeColors || [], 'dark');

    cssContent += `
  /* --- GLOBAL ELEMENT TOKEN OVERRIDES --- */
  --body-background-color: ${tokenValue(themeData.layout.bodyBackgroundColor, 'color1-100')};
  --layout-background1-color: ${tokenValue(themeData.layout.background1Color, 'color1-100')};
  --layout-background2-color: ${tokenValue(themeData.layout.background2Color, 'color1-200')};

  --border1-color: ${tokenValue(themeData.layout.border1Color, 'color1-200')};
  --border2-color: ${tokenValue(themeData.layout.border2Color, 'color1-300')};

  --text1-color: ${tokenValue(themeData.typography.textColors.text1, 'color2-300')};
  --text2-color: ${tokenValue(themeData.typography.textColors.text2, 'color2-200')};

  /* --- COMPONENT TOKEN OVERRIDES --- */
  --header-background-color: var(--color1-100);

  --input-background-color: var(--color1-100);
  --input-border-color: var(--border1-color);
  --input-text-color: var(--text1-color);
  
  --card-background-color: var(--color1-200);

  --card-watermark-raster-filter: invert(1);
}
`;

  return cssContent;
}

/** Shape persisted theme data for `buildThemeTokensCss` while preserving active reader preset id. */
export function themeDataForCssGeneration(
  data: StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes }
): StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes } {
  const rest: StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes } = { ...data };
  return rest;
}

export function buildScopedThemeTokensCss(
  settings: ResolvedScopedThemeSettings,
  scopeSelector: string
): string {
  const raw = buildThemeTokensCss(
    themeDataForCssGeneration({
      ...settings.data,
      activePresetId: settings.activePresetId,
      recipes: settings.recipes,
    })
  );
  return scopeThemeTokensCss(raw, scopeSelector);
}

export function buildScopedDraftThemeCss(
  document: ResolvedScopedThemeDocumentData,
  scopes: {
    reader: string;
    admin: string;
  }
): { readerCss: string; adminCss: string; css: string } {
  const readerCss = buildScopedThemeTokensCss(document.reader, scopes.reader);
  const adminCss = buildScopedThemeTokensCss(document.admin, scopes.admin);
  return {
    readerCss,
    adminCss,
    css: `${readerCss}\n${adminCss}`,
  };
}

type LegacyFlatThemeData =
  StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes };

type PersistedThemeData =
  | LegacyFlatThemeData
  | PersistedThemeDocumentData;

/** Firestore can hold a partial `data` object; building CSS from it throws or yields broken vars. */
function isThemeDataViable(
  data: StructuredThemeData | null | undefined
): boolean {
  if (!data?.palette?.length || !data.themeColors?.length) return false;
  const hasBg = data.themeColors.some((c) => c.id === 1);
  const hasText = data.themeColors.some((c) => c.id === 2);
  if (!hasBg || !hasText) return false;
  if (!data.layout?.breakpoints?.sm) return false;
  if (!data.typography?.fontFamilies?.sans1) return false;
  if (!data.spacing?.unit) return false;
  if (!data.shadows?.strengthDark) return false;
  return true;
}

export function isPersistedThemeDocument(data: unknown): data is PersistedThemeDocumentData {
  const row = data as Partial<PersistedThemeDocumentData> | null | undefined;
  return row?.version === 2 && !!row.reader?.data && !!row.admin?.data;
}

function themeSettingsFromFlat(
  data: (StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes }) | null | undefined,
  fallback: ResolvedScopedThemeSettings
): ResolvedScopedThemeSettings {
  if (!isThemeDataViable(data)) return fallback;
  const {
    activePresetId,
    recipes,
    ...themeData
  } = data;

  return {
    data: themeData as StructuredThemeData,
    activePresetId:
      activePresetId === 'journal' ||
      activePresetId === 'editorial' ||
      activePresetId === 'admin' ||
      activePresetId === 'custom'
        ? activePresetId
        : fallback.activePresetId ?? 'custom',
    recipes: recipes ?? fallback.recipes,
  };
}

export function normalizeThemeDocument(data: unknown): ResolvedScopedThemeDocumentData {
  const fallback = getDefaultScopedThemeDocument();
  if (isPersistedThemeDocument(data)) {
    return {
      version: 2,
      reader: themeSettingsFromFlat(
        {
          ...data.reader.data,
          activePresetId: data.reader.activePresetId,
          recipes: data.reader.recipes,
        },
        fallback.reader
      ),
      admin: themeSettingsFromFlat(
        {
          ...data.admin.data,
          activePresetId: data.admin.activePresetId,
          recipes: data.admin.recipes,
        },
        fallback.admin
      ),
    };
  }

  return {
    ...fallback,
    reader: themeSettingsFromFlat(
      data as LegacyFlatThemeData | null | undefined,
      fallback.reader
    ),
  };
}

export function toPersistedThemeDocument(
  data: PersistedThemeDocumentData | ResolvedScopedThemeDocumentData
): PersistedThemeDocumentData {
  const reader = {
    data: data.reader.data,
    activePresetId: data.reader.activePresetId,
    ...(data.reader.recipes ? { recipes: data.reader.recipes } : {}),
  };
  const admin = {
    data: data.admin.data,
    activePresetId: data.admin.activePresetId,
    ...(data.admin.recipes ? { recipes: data.admin.recipes } : {}),
  };

  return {
    version: 2,
    reader,
    admin,
  };
}

export async function getPersistedThemeDocumentFromJson(): Promise<PersistedThemeDocumentData> {
  try {
    return toPersistedThemeDocument(normalizeThemeDocument(await readThemeJsonFile()));
  } catch (error) {
    console.error('Failed to read persisted theme JSON document:', error);
    return toPersistedThemeDocument(getDefaultScopedThemeDocument());
  }
}

/**
 * Theme for SSR: Firestore `app_settings/theme` when present and complete, else `theme-data.json`.
 */
export async function getResolvedThemeData(): Promise<
  StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes }
> {
  const scoped = await getResolvedScopedThemeDocument();
  return {
    ...scoped.reader.data,
    activePresetId: scoped.reader.activePresetId,
    recipes: scoped.reader.recipes,
  };
}

/**
 * Theme admin document: Firestore `app_settings/theme` when present and complete,
 * else `theme-data.json` as reader + Admin preset as admin.
 */
export async function getResolvedScopedThemeDocument(): Promise<ResolvedScopedThemeDocumentData> {
  const fromFile = normalizeThemeDocument(await getPersistedThemeDocumentFromJson());
  try {
    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection(THEME_FIRESTORE_COLLECTION).doc(THEME_FIRESTORE_DOC).get();
    if (snap.exists) {
      const row = snap.data();
      const data = row?.data as PersistedThemeData | undefined;
      if (isPersistedThemeDocument(data)) {
        return normalizeThemeDocument(data);
      }
      if (isThemeDataViable(data as StructuredThemeData | undefined)) {
        return normalizeThemeDocument(data as StructuredThemeData);
      }
      if ((data as StructuredThemeData | undefined)?.palette?.length) {
        console.warn(
          '[theme] Firestore app_settings/theme is incomplete; using theme-data.json. Re-save from Theme admin or run npm run seed:theme-firestore.'
        );
      }
    }
  } catch (e) {
    console.warn('[theme] Firestore load failed; falling back to theme-data.json:', e);
  }
  return fromFile;
}

async function persistThemeToFirestore(
  themeData: PersistedThemeData
): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  await db.collection(THEME_FIRESTORE_COLLECTION).doc(THEME_FIRESTORE_DOC).set({
    data: themeData,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** One-off / CI: push `theme-data.json` to Firestore so production matches repo without opening Theme admin. */
export async function syncThemeFromJsonToFirestore(): Promise<void> {
  const data = await getPersistedThemeDocumentFromJson();
  if (!data.reader.data.palette?.length) {
    throw new Error('theme-data.json has no reader palette; cannot sync to Firestore');
  }
  await persistThemeToFirestore(data);
}

async function writeThemeBackupFile(themeData: PersistedThemeDocumentData): Promise<void> {
  const jsonPath = path.join(process.cwd(), 'theme-data.json');
  await fs.writeFile(jsonPath, JSON.stringify(themeData, null, 2), 'utf-8');
}

export type ThemeSaveResult = {
  firestoreSaved: true;
  backupSaved: boolean;
  backupError?: string;
};

/** Writes the save-ready scoped theme document to Firestore first, then updates the JSON backup best-effort. */
export const saveThemeData = async (
  themeData: PersistedThemeDocumentData
): Promise<ThemeSaveResult> => {
  try {
    await persistThemeToFirestore(themeData);
    try {
      await writeThemeBackupFile(themeData);
      console.log('Theme saved to Firestore; theme-data.json backup updated.');
      return {
        firestoreSaved: true,
        backupSaved: true,
      };
    } catch (backupError) {
      console.warn('[theme] Firestore save succeeded, but theme-data.json backup write failed:', backupError);
      return {
        firestoreSaved: true,
        backupSaved: false,
        backupError: backupError instanceof Error ? backupError.message : String(backupError),
      };
    }
  } catch (error) {
    console.error('Failed to save theme data:', error);
    throw error;
  }
};
