import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseColor, StructuredThemeData, TypographyTokens, SpacingTokens, BorderTokens, ShadowTokens, ZIndexTokens, LayoutTokens, ComponentTokens, StateTokens, GradientTokens, ThemeColor } from '@/lib/types/theme';

/**
 * Server-side theme service for reading and writing theme data from JSON and generating CSS
 * This file contains server-only operations and should not be imported by client components
 */

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
 * Helper function to resolve color references to CSS variables
 * Handles formats like "1/050" (color1-050) and "3" (color3)
 */
const resolveColorReference = (reference: string, palette: BaseColor[]): string => {
  if (!reference || reference.trim() === '') {
    return '';
  }

  const trimmed = reference.trim();
  
  // Check if it's a color/step format like "1/050"
  if (trimmed.includes('/')) {
    const [colorPart, stepPart] = trimmed.split('/');
    const colorNum = parseInt(colorPart, 10);
    const step = stepPart.trim();
    
    // Validate color exists in palette
    if (!palette.find(c => c.id === colorNum)) {
      throw new Error(`Color ${colorNum} not found in palette`);
    }
    
    // Validate step format for colors 1-2 (10-box scale)
    if (colorNum === 1 || colorNum === 2) {
      const validSteps = ['050', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
      if (!validSteps.includes(step)) {
        throw new Error(`Invalid step "${step}" for color ${colorNum}. Use: ${validSteps.join(', ')}`);
      }
      return `var(--color${colorNum}-${step})`;
    } else {
      throw new Error(`Color ${colorNum} does not support step notation. Use just the color number.`);
    }
  } else {
    // Simple color reference like "3"
    const colorNum = parseInt(trimmed, 10);
    
    // Validate color exists in palette
    if (!palette.find(c => c.id === colorNum)) {
      throw new Error(`Color ${colorNum} not found in palette`);
    }
    
    // Colors 1-2 require step specification
    if (colorNum === 1 || colorNum === 2) {
      throw new Error(`Color ${colorNum} requires step specification (e.g., "${colorNum}/050")`);
    }
    
    return `var(--color${colorNum})`;
  }
};

/**
 * Universal reference resolver for all token types
 * Handles color, spacing, border, shadow, and other token references
 */
const resolveTokenReference = (reference: string, themeData: StructuredThemeData & { darkModeShift?: number }): string => {
  if (!reference || reference.trim() === '') {
    return '';
  }

  const trimmed = reference.trim();
  
  // Handle composite values (multiple references separated by spaces)
  if (trimmed.includes(' ')) {
    return trimmed.split(' ').map(part => resolveTokenReference(part, themeData)).join(' ');
  }
  
  // If it's already a raw value (no slash), return as-is
  if (!trimmed.includes('/')) {
    // Check if it's a color reference (numeric)
    if (/^\d+$/.test(trimmed)) {
      return resolveColorReference(trimmed, themeData.palette);
    }
    // Otherwise return as-is (for values like "transparent", "9999px", etc.)
    return trimmed;
  }

  const parts = trimmed.split('/');
  const [category, ...subParts] = parts;

  switch (category) {
    case '1':
    case '2':
      // Color references like "1/050" or "2/900"
      return resolveColorReference(trimmed, themeData.palette);
    
    case 'spacing':
      // spacing/lg → var(--spacing-lg)
      if (subParts.length === 1) {
        const size = subParts[0];
        const validSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
        if (validSizes.includes(size)) {
          return `var(--spacing-${size})`;
        }
        throw new Error(`Invalid spacing size "${size}". Use: ${validSizes.join(', ')}`);
      }
      break;
    
    case 'border':
      if (subParts.length === 2) {
        const [type, size] = subParts;
        if (type === 'width') {
          const validWidths = ['thin', 'medium', 'thick'];
          if (validWidths.includes(size)) {
            return `var(--border-width-${size})`;
          }
          throw new Error(`Invalid border width "${size}". Use: ${validWidths.join(', ')}`);
        } else if (type === 'radius') {
          const validRadii = ['sm', 'md', 'lg', 'xl', 'full'];
          if (validRadii.includes(size)) {
            return `var(--border-radius-${size})`;
          }
          throw new Error(`Invalid border radius "${size}". Use: ${validRadii.join(', ')}`);
        }
      }
      break;
    
    case 'shadow':
      // shadow/sm → var(--shadow-sm)
      if (subParts.length === 1) {
        const size = subParts[0];
        const validSizes = ['sm', 'md', 'lg', 'xl'];
        if (validSizes.includes(size)) {
          return `var(--shadow-${size})`;
        }
        throw new Error(`Invalid shadow size "${size}". Use: ${validSizes.join(', ')}`);
      }
      break;
    
    case 'font':
      if (subParts.length === 2) {
        const [type, size] = subParts;
        if (type === 'size') {
          const validSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
          if (validSizes.includes(size)) {
            return `var(--font-size-${size})`;
          }
          throw new Error(`Invalid font size "${size}". Use: ${validSizes.join(', ')}`);
        } else if (type === 'weight') {
          const validWeights = ['normal', 'medium', 'semibold', 'bold'];
          if (validWeights.includes(size)) {
            return `var(--font-weight-${size})`;
          }
          throw new Error(`Invalid font weight "${size}". Use: ${validWeights.join(', ')}`);
        } else if (type === 'family') {
          const validFamilies = ['sans', 'serif', 'handwriting'];
          if (validFamilies.includes(size)) {
            return `var(--font-family-${size})`;
          }
          throw new Error(`Invalid font family "${size}". Use: ${validFamilies.join(', ')}`);
        }
      }
      break;
    
    default:
      // Check if it's a numeric color reference like "3", "4", etc.
      if (/^\d+$/.test(category)) {
        return resolveColorReference(trimmed, themeData.palette);
      }
      break;
  }

  throw new Error(`Invalid token reference: "${reference}"`);
};

/**
 * Helper function to generate simplified theme color CSS variables
 */
const generateThemeColorCSS = (themeColors: ThemeColor[]): string => {
  let css = '';
  
  // Generate theme color variables (colors 1 and 2)
  themeColors.forEach(color => {
    // Light mode variables
    css += `  --color${color.id}-light: hsl(${color.light.h}, ${color.light.s}, ${color.light.l});\n`;
    // Dark mode variables  
    css += `  --color${color.id}-dark: hsl(${color.dark.h}, ${color.dark.s}, ${color.dark.l});\n`;
  });
  
  return css;
};

/**
 * Saves theme data to JSON file and generates CSS with light-first approach
 */
export const saveThemeData = async (themeData: StructuredThemeData & { darkModeShift?: number }): Promise<void> => {
  try {
    // Save to JSON file
    const jsonPath = path.join(process.cwd(), 'theme-data.json');
    await fs.writeFile(jsonPath, JSON.stringify(themeData, null, 2), 'utf-8');
    
    // Generate CSS file
    const cssPath = path.join(process.cwd(), 'src', 'app', 'theme.css');
    const darkModeShift = themeData.darkModeShift || 5;
    
    // Generate CSS content with light-first approach
    let cssContent = `/*
  Unified Design System (v2) - Light First Approach
  ==========================================
  This file represents the single source of truth for all styling tokens,
  built on a hierarchical model and an abstract, HSL-based color palette.
  The HSL system is used to programmatically generate color variations for
  light and dark themes.

  APPROACH:
  - Colors are assigned semantic names and adapt their lightness based on theme context
  - Mathematical conditional logic handles automatic light/dark theme switching
  - Color scales are generated programmatically for consistent theming

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

    // Generate HEX color definitions
    themeData.palette.forEach(color => {
      cssContent += `  --hex${color.id}: ${color.hex}; /* ${color.name} */\n`;
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

  /* Theme Colors (Light/Dark Mode) */
`;

    // Generate theme color variables (colors 1 and 2)
    cssContent += generateThemeColorCSS(themeData.themeColors || []);

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
  --font-weight-increment: ${themeData.typography.fontWeights.increment};
  --font-weight-medium: calc(var(--font-weight-normal) + var(--font-weight-increment));
  --font-weight-semibold: calc(var(--font-weight-normal) + (2 * var(--font-weight-increment)));
  --font-weight-bold: calc(var(--font-weight-normal) + (3 * var(--font-weight-increment)));

  --line-height-base: ${themeData.typography.lineHeights.base};
  --line-height-increment: ${themeData.typography.lineHeights.increment};
  --line-height-tight: calc(var(--line-height-base) - var(--line-height-increment));
  --line-height-relaxed: calc(var(--line-height-base) + var(--line-height-increment));

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
  
  /* Layout */
  --layout-container-max-width: ${themeData.layout.containerMaxWidth};
  --layout-background1-color: var(--color1-light);
  --layout-background2-color: var(--color1-light);
  --sidebar-width: ${themeData.layout.sidebarWidth};
  --sidebar-width-mobile: ${themeData.layout.sidebarWidthMobile};
  --logo-max-height: ${themeData.layout.logoMaxHeight};
  --spinner-size: ${themeData.layout.spinnerSize};
  --form-min-width: ${themeData.layout.formMinWidth};
  --button-min-width: ${themeData.layout.buttonMinWidth};
  --icon-min-width: ${themeData.layout.iconMinWidth};
  --transition-short: ${themeData.layout.transitionShort};

  /* Borders */
  --border1-color: hsl(0, 0%, 60%);
  --border2-color: hsl(0, 0%, 50%);

  /* States */
  --state-success-background-color: hsl(var(--h${themeData.states.success.backgroundColor}) / 0.15);
  --state-success-border-color: ${resolveTokenReference(themeData.states.success.borderColor, themeData)};
  --state-error-background-color: hsl(var(--h${themeData.states.error.backgroundColor}) / 0.15);
  --state-error-border-color: ${resolveTokenReference(themeData.states.error.borderColor, themeData)};
  --state-warning-background-color: hsl(var(--h${themeData.states.warning.backgroundColor}) / 0.15);
  --state-warning-border-color: ${resolveTokenReference(themeData.states.warning.borderColor, themeData)};
  --state-info-background-color: hsl(var(--h${themeData.states.info.backgroundColor}) / 0.15);
  --state-info-border-color: ${resolveTokenReference(themeData.states.info.borderColor, themeData)};

  /* Typography */
  --text1-color: var(--color2-light);
  --text2-color: var(--color2-light);

  /* --- 3. COMPONENT TOKENS --- */
  
  /* Header */
  --header-height: ${themeData.components.header.height};
  --header-background-color: ${resolveTokenReference(themeData.components.header.backgroundColor, themeData)};
  --header-border-color: ${resolveTokenReference(themeData.components.header.borderColor, themeData)};
  --header-border-width: ${resolveTokenReference(themeData.components.header.borderWidth, themeData)};

  /* Button: Solid */
  --button-solid-background-color: ${resolveTokenReference(themeData.components.button.solid.backgroundColor, themeData)};
  --button-solid-background-color-hover: ${resolveTokenReference(themeData.components.button.solid.backgroundColorHover, themeData)};
  --button-solid-border-color: ${resolveTokenReference(themeData.components.button.solid.borderColor, themeData)};
  --button-solid-text-color: ${resolveTokenReference(themeData.components.button.solid.textColor, themeData)};
  
  /* Button: Outline */
  --button-outline-background-color: ${resolveTokenReference(themeData.components.button.outline.backgroundColor, themeData)};
  --button-outline-background-color-hover: ${themeData.components.button.outline.backgroundColorHover};
  --button-outline-border-color: ${resolveTokenReference(themeData.components.button.outline.borderColor, themeData)};
  --button-outline-text-color: ${resolveTokenReference(themeData.components.button.outline.textColor, themeData)};
  --button-outline-border-width: ${resolveTokenReference(themeData.components.button.outline.borderWidth, themeData)};

  /* Card */
  --card-background-color: ${resolveTokenReference(themeData.components.card.backgroundColor, themeData)};
  --card-padding: ${resolveTokenReference(themeData.components.card.padding, themeData)};
  --card-border-color: ${resolveTokenReference(themeData.components.card.borderColor, themeData)};
  --card-border-width: ${resolveTokenReference(themeData.components.card.borderWidth, themeData)};
  --card-border-radius: ${resolveTokenReference(themeData.components.card.borderRadius, themeData)};
  --card-shadow: ${resolveTokenReference(themeData.components.card.shadow, themeData)};
  --card-shadow-hover: ${resolveTokenReference(themeData.components.card.shadowHover, themeData)};
  
  /* Tag */
  --tag-padding: ${resolveTokenReference(themeData.components.tag.padding, themeData)};
  --tag-border-radius: ${resolveTokenReference(themeData.components.tag.borderRadius, themeData)};
  --tag-font-weight: ${resolveTokenReference(themeData.components.tag.fontWeight, themeData)};
  --tag-font-size: ${resolveTokenReference(themeData.components.tag.fontSize, themeData)};
  --tag-font-family: ${resolveTokenReference(themeData.components.tag.fontFamily, themeData)};
  --tag-text-color: ${resolveTokenReference(themeData.components.tag.textColor, themeData)};
  --tag-who-bg-color: ${resolveTokenReference(themeData.components.tag.backgrounds.who, themeData)};
  --tag-what-bg-color: ${resolveTokenReference(themeData.components.tag.backgrounds.what, themeData)};
  --tag-when-bg-color: ${resolveTokenReference(themeData.components.tag.backgrounds.when, themeData)};
  --tag-where-bg-color: ${resolveTokenReference(themeData.components.tag.backgrounds.where, themeData)};
  --tag-reflection-bg-color: ${resolveTokenReference(themeData.components.tag.backgrounds.reflection, themeData)};
  
  /* Form & Input */
  --input-background-color: ${resolveTokenReference(themeData.components.input.backgroundColor, themeData)};
  --input-border-color: ${resolveTokenReference(themeData.components.input.borderColor, themeData)};
  --input-border-color-focus: ${resolveTokenReference(themeData.components.input.borderColorFocus, themeData)};
  --input-text-color: ${resolveTokenReference(themeData.components.input.textColor, themeData)};
  --input-border-radius: ${resolveTokenReference(themeData.components.input.borderRadius, themeData)};
  --input-padding: ${resolveTokenReference(themeData.components.input.padding, themeData)};

  /* Link */
  --link-text-color: ${resolveTokenReference(themeData.components.link.textColor, themeData)};
  --link-text-color-hover: ${resolveTokenReference(themeData.components.link.textColorHover, themeData)};
  --link-decoration-hover: ${resolveTokenReference(themeData.components.link.decorationHover, themeData)};

  /* Gradients */
  --gradient-bottom-overlay: ${themeData.gradients.bottomOverlay};
  --gradient-bottom-overlay-strong: ${themeData.gradients.bottomOverlayStrong};
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

  /* --- GLOBAL ELEMENT TOKEN OVERRIDES --- */
  --layout-background1-color: var(--color1-dark);      /* Main background */
  --layout-background2-color: var(--color1-dark);      /* Secondary background */

  --border1-color: hsl(0, 0%, 25%);
  --border2-color: hsl(0, 0%, 35%);

  --text1-color: var(--color2-dark); /* Primary text */
  --text2-color: var(--color2-dark); /* Secondary text */

  /* --- COMPONENT TOKEN OVERRIDES --- */
  --header-background-color: var(--layout-background2-color);

  --input-background-color: var(--color1-dark);
  --input-border-color: var(--border2-color);
  --input-text-color: var(--text1-color);
  
  --card-background-color: var(--color1-dark);
}
`;

    // Write the CSS file
    await fs.writeFile(cssPath, cssContent, 'utf-8');
    console.log('Theme data saved to JSON and CSS generated successfully');
  } catch (error) {
    console.error('Failed to save theme data:', error);
    throw error;
  }
}; 