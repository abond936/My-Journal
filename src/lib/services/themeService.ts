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
  ThemeColor,
  ScopedThemeDocumentData,
  ScopedThemeSettings,
} from '@/lib/types/theme';
import { getDefaultScopedThemeDocument } from '@/lib/theme/themePresets';

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

/**
 * Reads theme data from the JSON file
 */
export const getThemeData = async (): Promise<StructuredThemeData & { darkModeShift?: number }> => {
  try {
    const jsonPath = path.join(process.cwd(), 'theme-data.json');
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const themeData = JSON.parse(jsonContent);
    
    // Ensure we have the darkModeShift property
    return {
      ...themeData,
      darkModeShift: themeData.darkModeShift || 5
    };
  } catch (error) {
    console.error('Failed to read theme JSON file:', error);
    // On error, return a default structure to prevent crashes
    return {
      palette: [],
      themeColors: [],
      darkModeShift: 5,
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

export function buildThemeTokensCss(themeData: StructuredThemeData & { darkModeShift?: number }): string {
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
  
  /* Color Palette (HSL-based) */
`;

    // Generate HSL component definitions for colors 3-14
    themeData.palette.forEach(color => {
      if (color.id > 2) { // Only colors 3-14 get HSL components
        cssContent += `  --h${color.id}: ${color.h}; /* ${color.name} */\n`;
        cssContent += `  --s${color.id}: ${color.s};\n`;
        cssContent += `  --l${color.id}: ${color.l};\n`;
      }
    });
    
    cssContent += `  /* --hue15: */

  /* Theme Colors 3-Shade Scales (Light Mode) */
`;

    // Generate 3-shade color scales for theme colors (1 and 2)
    cssContent += generateColorScales(themeData.themeColors || []);

    // Generate base color definitions for colors 3-14
    cssContent += `
  /* Base Color Definitions (Colors 3-14) */
`;
    themeData.palette.forEach(color => {
      if (color.id > 2) { // Only colors 3-14 get base color definitions
        cssContent += `  --color${color.id}: hsl(var(--h${color.id}), var(--s${color.id}), var(--l${color.id}));\n`;
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
  --font-family-sans: ${themeData.typography.fontFamilies.sans};
  --font-family-serif: ${themeData.typography.fontFamilies.serif};
  --font-family-handwriting: ${themeData.typography.fontFamilies.handwriting};

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
  --body-background-color: var(--color1-100);
  
  /* Layout */
  --layout-container-max-width: ${themeData.layout.containerMaxWidth};
  --body-font-family: var(--${themeData.layout.bodyFontFamily});
  --layout-background1-color: var(--color1-100);
  --layout-background2-color: var(--color1-200);
  --sidebar-width: ${themeData.layout.sidebarWidth};
  --sidebar-width-mobile: ${themeData.layout.sidebarWidthMobile};
  --logo-max-height: ${themeData.layout.logoMaxHeight};
  --spinner-size: ${themeData.layout.spinnerSize};
  --form-min-width: ${themeData.layout.formMinWidth};
  --button-min-width: ${themeData.layout.buttonMinWidth};
  --icon-min-width: ${themeData.layout.iconMinWidth};
  --transition-short: ${themeData.layout.transitionShort};

  /* Borders - Using color1 shades */
  --border1-color: var(--color1-200);
  --border2-color: var(--color1-300);

  /* States */
  --state-success-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.success?.backgroundColor, 'color11')}) / 0.15);
  --state-success-border-color: var(--color${stripColorRefForVar(themeData.states?.success?.borderColor, 'color11')});
  --state-error-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.error?.backgroundColor, 'color12')}) / 0.15);
  --state-error-border-color: var(--color${stripColorRefForVar(themeData.states?.error?.borderColor, 'color12')});
  --state-warning-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.warning?.backgroundColor, 'color13')}) / 0.15);
  --state-warning-border-color: var(--color${stripColorRefForVar(themeData.states?.warning?.borderColor, 'color13')});
  --state-info-background-color: hsl(var(--h${stripColorRefForVar(themeData.states?.info?.backgroundColor, 'color14')}) / 0.15);
  --state-info-border-color: var(--color${stripColorRefForVar(themeData.states?.info?.borderColor, 'color14')});

  /* Typography */
  --text1-color: var(--color2-300);
  --text2-color: var(--color2-200);

  /* --- 3. COMPONENT TOKENS --- */
  
  /* Header */
  --header-height: ${themeData.components.header.height};
  --header-background-color: ${tokenValue(themeData.components.header.backgroundColor, 'color1-100')};
  --header-border-color: ${tokenValue(themeData.components.header.borderColor, 'border1-color')};
  --header-border-width: ${tokenValue(themeData.components.header.borderWidth, 'border/width/thin')};

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
  --reader-title-color: var(--text1-color);
  --reader-title-font-family: var(--body-font-family);
  --reader-title-font-size: var(--font-size-base);
  --reader-title-font-weight: var(--font-weight-semibold);
  --reader-title-line-height: var(--line-height-tight);
  --reader-body-color: var(--text1-color);
  --reader-body-font-family: var(--body-font-family);
  --reader-body-font-size: var(--font-size-sm);
  --reader-body-line-height: var(--line-height-relaxed);
  --reader-meta-color: var(--text2-color);
  --reader-meta-font-size: var(--font-size-sm);
  --reader-card-background-color: var(--card-background-color);
  --reader-card-flat-background-color: var(--layout-background1-color);
  --reader-card-border-color: var(--card-border-color);
  --reader-card-border-width: var(--card-border-width);
  --reader-card-border-radius: var(--card-border-radius);
  --reader-card-shadow: var(--card-shadow);
  --reader-card-shadow-hover: var(--card-shadow-hover);
  --reader-card-padding: var(--card-padding);
  --reader-detail-background-color: var(--layout-background1-color);
  --reader-detail-cover-background-color: var(--card-background-color);
  --reader-detail-border-color: var(--border1-color);
  --reader-detail-border-radius: var(--border-radius-md);
  --reader-detail-shadow: var(--shadow-md);
  --reader-detail-padding-x: var(--spacing-xl);
  --reader-detail-padding-bottom: var(--spacing-2xl);
  --reader-quote-color: var(--text1-color);
  --reader-quote-font-family: var(--body-font-family);
  --reader-quote-font-size: var(--font-size-lg);
  --reader-quote-line-height: var(--line-height-relaxed);
  --reader-caption-color: var(--text2-color);
  --reader-caption-font-size: var(--font-size-sm);
}

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
  /* --- GLOBAL ELEMENT TOKEN OVERRIDES --- */
  --body-background-color: var(--color1-100);
  --layout-background1-color: var(--color1-100);
  --layout-background2-color: var(--color1-200);

  --border1-color: var(--color1-200);
  --border2-color: var(--color1-300);

  --text1-color: var(--color2-300);
  --text2-color: var(--color2-200);

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

/** Remove persisted-only fields before passing theme JSON into `buildThemeTokensCss`. */
export function themeDataForCssGeneration(
  data: StructuredThemeData & { darkModeShift?: number; activePresetId?: string }
): StructuredThemeData & { darkModeShift?: number } {
  const rest: StructuredThemeData & { darkModeShift?: number; activePresetId?: string } = { ...data };
  delete rest.activePresetId;
  return rest;
}

type PersistedThemeData =
  | (StructuredThemeData & { darkModeShift?: number; activePresetId?: string })
  | ScopedThemeDocumentData;

/** Firestore can hold a partial `data` object; building CSS from it throws or yields broken vars. */
function isThemeDataViable(
  data: (StructuredThemeData & { darkModeShift?: number }) | null | undefined
): boolean {
  if (!data?.palette?.length || !data.themeColors?.length) return false;
  const hasBg = data.themeColors.some((c) => c.id === 1);
  const hasText = data.themeColors.some((c) => c.id === 2);
  if (!hasBg || !hasText) return false;
  if (!data.layout?.breakpoints?.sm) return false;
  if (!data.typography?.fontFamilies?.sans) return false;
  if (!data.spacing?.unit) return false;
  if (!data.shadows?.strengthDark) return false;
  return true;
}

function isScopedThemeDocument(data: unknown): data is ScopedThemeDocumentData {
  const row = data as Partial<ScopedThemeDocumentData> | null | undefined;
  return row?.version === 2 && !!row.reader?.data && !!row.admin?.data;
}

function themeSettingsFromFlat(
  data: (StructuredThemeData & { darkModeShift?: number; activePresetId?: string }) | null | undefined,
  fallback: ScopedThemeSettings
): ScopedThemeSettings {
  if (!isThemeDataViable(data)) return fallback;
  return {
    data,
    activePresetId:
      data.activePresetId === 'journal' ||
      data.activePresetId === 'editorial' ||
      data.activePresetId === 'admin' ||
      data.activePresetId === 'custom'
        ? data.activePresetId
        : fallback.activePresetId ?? 'custom',
    darkModeShift: data.darkModeShift ?? fallback.darkModeShift ?? 5,
  };
}

export function normalizeThemeDocument(data: unknown): ScopedThemeDocumentData {
  const fallback = getDefaultScopedThemeDocument();
  if (isScopedThemeDocument(data)) {
    return {
      version: 2,
      reader: themeSettingsFromFlat(
        {
          ...data.reader.data,
          activePresetId: data.reader.activePresetId,
          darkModeShift: data.reader.darkModeShift,
        },
        fallback.reader
      ),
      admin: themeSettingsFromFlat(
        {
          ...data.admin.data,
          activePresetId: data.admin.activePresetId,
          darkModeShift: data.admin.darkModeShift,
        },
        fallback.admin
      ),
    };
  }

  return {
    ...fallback,
    reader: themeSettingsFromFlat(
      data as (StructuredThemeData & { darkModeShift?: number; activePresetId?: string }) | null | undefined,
      fallback.reader
    ),
  };
}

/**
 * Theme for SSR: Firestore `app_settings/theme` when present and complete, else `theme-data.json`.
 */
export async function getResolvedThemeData(): Promise<
  StructuredThemeData & { darkModeShift?: number; activePresetId?: string }
> {
  const scoped = await getResolvedScopedThemeDocument();
  return {
    ...scoped.reader.data,
    darkModeShift: scoped.reader.darkModeShift ?? 5,
    activePresetId: scoped.reader.activePresetId,
  };
}

/**
 * Theme admin document: Firestore `app_settings/theme` when present and complete,
 * else `theme-data.json` as reader + Admin preset as admin.
 */
export async function getResolvedScopedThemeDocument(): Promise<ScopedThemeDocumentData> {
  const fromFile = normalizeThemeDocument(await getThemeData());
  try {
    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection(THEME_FIRESTORE_COLLECTION).doc(THEME_FIRESTORE_DOC).get();
    if (snap.exists) {
      const row = snap.data();
      const data = row?.data as PersistedThemeData | undefined;
      if (isScopedThemeDocument(data)) {
        return normalizeThemeDocument(data);
      }
      if (isThemeDataViable(data as StructuredThemeData | undefined)) {
        return normalizeThemeDocument({
          ...(data as StructuredThemeData),
          darkModeShift: (data as { darkModeShift?: number }).darkModeShift ?? row?.darkModeShift ?? 5,
        });
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
  const data = await getThemeData();
  if (!data.palette?.length) {
    throw new Error('theme-data.json has no palette; cannot sync to Firestore');
  }
  await persistThemeToFirestore(data);
}

/** Writes `theme-data.json` (git-friendly backup) and Firestore (runtime source of truth). */
export const saveThemeData = async (
  themeData: PersistedThemeData
): Promise<void> => {
  try {
    const jsonPath = path.join(process.cwd(), 'theme-data.json');
    await fs.writeFile(jsonPath, JSON.stringify(themeData, null, 2), 'utf-8');
    await persistThemeToFirestore(themeData);
    console.log('Theme saved to theme-data.json and Firestore');
  } catch (error) {
    console.error('Failed to save theme data:', error);
    throw error;
  }
};
