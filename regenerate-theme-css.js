const fs = require('fs').promises;
const path = require('path');

async function regenerateThemeCSS() {
  try {
    console.log('Regenerating theme CSS...');
    
    // Read theme data from JSON file
    const jsonPath = path.join(process.cwd(), 'theme-data.json');
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const themeData = JSON.parse(jsonContent);
    
    // Generate CSS file
    const cssPath = path.join(process.cwd(), 'src', 'app', 'theme.css');
    
    // Generate CSS content with simplified 3-shade approach
    let cssContent = `/*
  Unified Design System (v2) - Simplified 3-Shade Approach
  ==========================================
  This file represents the single source of truth for all styling tokens,
  built on a simplified 3-shade color system for theme colors 1 and 2.
  
  APPROACH:
  - Color 1: Background (100=lightest, 200=medium, 300=darkest)
  - Color 2: Text/Foreground (100=lightest, 200=medium, 300=darkest)
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
    if (themeData.themeColors) {
      themeData.themeColors.forEach(color => {
        // Color 1 Light Mode Scale (Background)
        if (color.id === 1) {
          const h = parseInt(color.light.h, 10);
          const s = parseInt(color.light.s, 10);
          cssContent += `  /* Color ${color.id} Light Mode Scale (Background) */\n`;
          cssContent += `  --color${color.id}-100: hsl(${h}, ${s}%, 100%);\n`;
          cssContent += `  --color${color.id}-200: hsl(${h}, ${s}%, 95%);\n`;
          cssContent += `  --color${color.id}-300: hsl(${h}, ${s}%, 90%);\n`;
        }
        // Color 2 Light Mode Scale (Text)
        else if (color.id === 2) {
          const h = parseInt(color.light.h, 10);
          const s = parseInt(color.light.s, 10);
          cssContent += `  /* Color ${color.id} Light Mode Scale (Text) */\n`;
          cssContent += `  --color${color.id}-100: hsl(${h}, ${s}%, 20%);\n`;
          cssContent += `  --color${color.id}-200: hsl(${h}, ${s}%, 15%);\n`;
          cssContent += `  --color${color.id}-300: hsl(${h}, ${s}%, 10%);\n`;
        }
      });
    }

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
  --shadow-color: hsl(0, 0%, var(--shadow-strength));
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
  --state-success-background-color: hsl(var(--h11) / 0.15);
  --state-success-border-color: var(--color11);
  --state-error-background-color: hsl(var(--h12) / 0.15);
  --state-error-border-color: var(--color12);
  --state-warning-background-color: hsl(var(--h13) / 0.15);
  --state-warning-border-color: var(--color13);
  --state-info-background-color: hsl(var(--h14) / 0.15);
  --state-info-border-color: var(--color14);

  /* Typography */
  --text1-color: var(--color2-300);
  --text2-color: var(--color2-200);

  /* --- 3. COMPONENT TOKENS --- */
  
  /* Header */
  --header-height: 60px;
  --header-background-color: var(--color1-100);
  --header-border-color: var(--border1-color);
  --header-border-width: var(--border-width-thin);

  /* Button: Solid */
  --button-solid-background-color: var(--color3);
  --button-solid-background-color-hover: var(--color3);
  --button-solid-border-color: var(--color3);
  --button-solid-text-color: var(--color1-100);
  
  /* Button: Outline */
  --button-outline-background-color: transparent;
  --button-outline-background-color-hover: hsla(var(--h3), var(--s3), var(--l3), 0.1);
  --button-outline-border-color: var(--border1-color);
  --button-outline-text-color: var(--color2-300);
  --button-outline-border-width: var(--border-width-medium);

  /* Card */
  --card-background-color: var(--color1-200);
  --card-padding: var(--spacing-lg);
  --card-border-color: var(--border1-color);
  --card-border-width: var(--border-width-medium);
  --card-border-radius: var(--border-radius-lg);
  --card-shadow: var(--shadow-sm);
  --card-shadow-hover: var(--shadow-md);
  
  /* Tag */
  --tag-padding: var(--spacing-xs) var(--spacing-sm);
  --tag-border-radius: var(--border-radius-full);
  --tag-font-weight: var(--font-weight-medium);
  --tag-font-size: var(--font-size-sm);
  --tag-font-family: var(--font-family-sans);
  --tag-text-color: var(--color1-100);
  --tag-who-bg-color: var(--color5);
  --tag-what-bg-color: var(--color6);
  --tag-when-bg-color: var(--color7);
  --tag-where-bg-color: var(--color8);
  --tag-reflection-bg-color: var(--color9);
  
  /* Form & Input */
  --input-background-color: var(--color1-100);
  --input-border-color: var(--border1-color);
  --input-border-color-focus: var(--color3);
  --input-text-color: var(--color2-300);
  --input-border-radius: var(--border-radius-sm);
  --input-padding: var(--spacing-sm) var(--spacing-md);

  /* Link */
  --link-text-color: var(--color3);
  --link-text-color-hover: var(--color3);
  --link-decoration-hover: underline;

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
  --shadow-color: hsl(0, 0%, var(--shadow-strength));

  /* Theme Colors 3-Shade Scales (Dark Mode) */
`;

    // Generate dark mode color scale overrides
    if (themeData.themeColors) {
      themeData.themeColors.forEach(color => {
        // Color 1 Dark Mode Scale (Background)
        if (color.id === 1) {
          const h = parseInt(color.dark.h, 10);
          const s = parseInt(color.dark.s, 10);
          cssContent += `  /* Color ${color.id} Dark Mode Scale (Background) */\n`;
          cssContent += `  --color${color.id}-100: hsl(${h}, ${s}%, 10%);\n`;
          cssContent += `  --color${color.id}-200: hsl(${h}, ${s}%, 15%);\n`;
          cssContent += `  --color${color.id}-300: hsl(${h}, ${s}%, 20%);\n`;
        }
        // Color 2 Dark Mode Scale (Text)
        else if (color.id === 2) {
          const h = parseInt(color.dark.h, 10);
          const s = parseInt(color.dark.s, 10);
          cssContent += `  /* Color ${color.id} Dark Mode Scale (Text) */\n`;
          cssContent += `  --color${color.id}-100: hsl(${h}, ${s}%, 90%);\n`;
          cssContent += `  --color${color.id}-200: hsl(${h}, ${s}%, 85%);\n`;
          cssContent += `  --color${color.id}-300: hsl(${h}, ${s}%, 80%);\n`;
        }
      });
    }

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
}
`;

    // Write the CSS file
    await fs.writeFile(cssPath, cssContent, 'utf-8');
    console.log('Theme CSS regenerated successfully!');
    
  } catch (error) {
    console.error('Error regenerating theme CSS:', error);
  }
}

regenerateThemeCSS(); 