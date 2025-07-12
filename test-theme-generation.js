// Test script to generate sample CSS using the backend theme generation logic
const fs = require('fs').promises;
const path = require('path');

// Sample theme data that matches the current structure
const sampleThemeData = {
  palette: [
    { id: 1, hex: '#0D0D0D', name: 'Near Black - Dark BG', h: '0', s: '0%', l: '5%' },
    { id: 2, hex: '#F2F2F2', name: 'Near White - Light BG', h: '0', s: '0%', l: '95%' },
    { id: 3, hex: '#135b96', name: 'principal', h: '211', s: '76%', l: '33%' },
    { id: 4, hex: '#E6B85A', name: 'accent', h: '42', s: '76%', l: '62%' },
    { id: 5, hex: '#8A3A0E', name: 'alt1', h: '20', s: '80%', l: '30%' },
    { id: 6, hex: '#0E3A4A', name: 'alt2', h: '198', s: '63%', l: '18%' },
    { id: 7, hex: '#2C5A1F', name: 'alt3', h: '102', s: '50%', l: '24%' },
    { id: 8, hex: '#5A1F4F', name: 'alt4', h: '311', s: '49%', l: '24%' },
    { id: 9, hex: '#6A4F29', name: 'alt5', h: '35', s: '44%', l: '29%' },
    { id: 10, hex: '#B08A3E', name: 'alt6', h: '41', s: '49%', l: '47%' },
    { id: 11, hex: '#059669', name: 'success', h: '160', s: '94%', l: '30%' },
    { id: 12, hex: '#dc2626', name: 'error', h: '0', s: '71%', l: '50%' },
    { id: 13, hex: '#d97706', name: 'warning', h: '34', s: '96%', l: '43%' },
    { id: 14, hex: '#2563eb', name: 'info', h: '221', s: '81%', l: '55%' }
  ],
  typography: {
    fontFamilies: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: '"Georgia", serif',
      handwriting: '"Ink Free", cursive'
    },
    fluidFontSizes: {
      size1: 'clamp(1.5rem, 1rem + 2.5vw, 3rem)',
      size2: 'clamp(1.25rem, 0.8rem + 2.25vw, 2.25rem)',
      size3: 'clamp(1rem, 0.75rem + 1.25vw, 1.5rem)'
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeights: {
      normal: '400',
      increment: '100',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeights: {
      base: '1.5',
      increment: '0.25',
      tight: '1.25',
      relaxed: '1.75'
    },
    textColors: {
      text1: '1/900',
      text2: '1/700'
    }
  },
  spacing: {
    unit: '4px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
    fluidSpacing: {
      spacing1: 'clamp(1rem, 0.5rem + 2.5vw, 2rem)',
      spacing2: 'clamp(2rem, 1rem + 5vw, 4rem)',
      spacing3: 'clamp(4rem, 2rem + 10vw, 8rem)'
    }
  },
  borders: {
    widths: {
      thin: '1px',
      medium: '2px',
      thick: '3px'
    },
    radius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px'
    }
  },
  shadows: {
    strength: '25%',
    color: 'hsl(var(--h1) / var(--shadow-strength))',
    sm: '0 1px 2px -1px var(--shadow-color)',
    md: '0 3px 4px -2px var(--shadow-color), 0 7px 10px -4px var(--shadow-color)',
    lg: '0 5px 8px -3px var(--shadow-color), 0 12px 18px -5px var(--shadow-color)',
    xl: '0 10px 15px -5px var(--shadow-color), 0 25px 35px -10px var(--shadow-color)'
  },
  zIndex: {
    default: '1',
    content: '10',
    sticky: '100',
    modalBackdrop: '1000',
    sidebar: '1100',
    header: '1200',
    modal: '1300',
    tooltip: '1400'
  },
  layout: {
    containerMaxWidth: '1200px',
    background1Color: '1',
    background2Color: '1/050',
    border1Color: '1/100',
    border2Color: '1/200',
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px'
    }
  },
  components: {
    header: {
      height: '60px',
      backgroundColor: '1/050',
      borderColor: '1/100',
      borderWidth: '1px'
    },
    button: {
      solid: {
        backgroundColor: '3',
        backgroundColorHover: '3',
        borderColor: '3',
        textColor: '2'
      },
      outline: {
        backgroundColor: 'transparent',
        backgroundColorHover: 'hsla(var(--h3), var(--s3), var(--l3), 0.1)',
        borderColor: '1/100',
        textColor: '1/900',
        borderWidth: '2px'
      }
    },
    card: {
      backgroundColor: '1/050',
      padding: '24px',
      borderColor: '1/200',
      borderWidth: '2px',
      borderRadius: '0.75rem',
      shadow: '0 1px 2px -1px var(--shadow-color)',
      shadowHover: '0 3px 4px -2px var(--shadow-color), 0 7px 10px -4px var(--shadow-color)'
    },
    tag: {
      padding: '4px 8px',
      borderRadius: '9999px',
      font: '500 0.875rem/1.2 var(--font-family-sans)',
      textColor: '2',
      backgrounds: {
        who: '5',
        what: '6',
        when: '7',
        where: '8',
        reflection: '9'
      }
    },
    input: {
      backgroundColor: '1/050',
      borderColor: '1/200',
      borderColorFocus: '3',
      textColor: '1/900',
      borderRadius: '0.25rem',
      padding: '8px 16px'
    },
    link: {
      textColor: '3',
      textColorHover: '3',
      decorationHover: 'underline'
    }
  },
  darkModeShift: 5
};

// Color reference resolution function (simplified version)
const resolveColorReference = (reference, palette) => {
  if (!reference || reference.trim() === '') {
    return '';
  }

  const trimmed = reference.trim();
  
  if (trimmed.includes('/')) {
    const [colorPart, stepPart] = trimmed.split('/');
    const colorNum = parseInt(colorPart, 10);
    const step = stepPart.trim();
    return `var(--color${colorNum}-${step})`;
  } else {
    const colorNum = parseInt(trimmed, 10);
    return `var(--color${colorNum})`;
  }
};

// Color scale generation function (matches backend)
const generateColorScaleCSS = (color, darkModeShift = 5) => {
  const { id, h, s, l } = color;
  const sVal = parseInt(s.replace('%', ''), 10);
  
  let css = '';
  
  // Colors 1 and 2 get 10-box spectrum (050-900)
  if (id === 1 || id === 2) {
    const colorSteps = [
      { value: 50, label: '050' },
      { value: 100, label: '100' },
      { value: 200, label: '200' },
      { value: 300, label: '300' },
      { value: 400, label: '400' },
      { value: 500, label: '500' },
      { value: 600, label: '600' },
      { value: 700, label: '700' },
      { value: 800, label: '800' },
      { value: 900, label: '900' }
    ];
    
    colorSteps.forEach(({ value, label }) => {
      const adjustedL = Math.max(0, Math.min(100, 95 - (value / 10)));
      css += `  --color${id}-${label}: hsl(var(--h${id}), var(--s${id}), ${adjustedL}%);\n`;
    });
  } else {
    // Colors 3-14 get mathematical conditional logic
    css += `  --color${id}: hsl(var(--h${id}), var(--s${id}), calc(var(--l${id}) + (var(--light-dark-variance) * (1 - var(--is-light-theme)))));\n`;
  }
  
  return css;
};

// Main CSS generation function (matches backend)
const generateSampleCSS = async () => {
  const darkModeShift = sampleThemeData.darkModeShift || 5;
  
  let cssContent = `/*
  Unified Design System (v2)
  ==========================================
  This file represents the single source of truth for all styling tokens,
  built on a hierarchical model and an abstract, HSL-based color palette.
  The HSL system is used to programmatically generate color variations for
  light and dark themes.

  Structure:
  1. Base Tokens: Raw, context-agnostic primitive values.
  2. Global Element Tokens: Application-wide styles for foundational HTML elements.
  3. Component Tokens: Scoped styles for specific, reusable components.
Naming requires a nesting of two concepts: Elements and Properties.
    - One element's properties are another property's element. 
    - One property's element is another property's element.

Elements
  - app - the highest level element
   - pages are elements, and properties of the app - home, view, admin
    - components are elements and properties of the page - header, footer, sidebar, container, button, field, 
     - component elements are the properties of the component - background, text, border, space, shadow
      - what we call properties are elements and properties of the components - color, font, family, 
       - metrics are elements and properities of properties - size, weight, height, width, z-index
        - measures are elements and properties of metrics - rem, px, in, 
         - values are elements and properties of measures -  a value - number - the lowest level property
        Properties

*/

/*
 * =================================================================
 * DARK THEME (DEFAULT)
 * =================================================================
 */
:root {
  /* --- 1. BASE TOKENS --- */

  /* Color Palette (HEX-based) */
`;

  // Generate HEX color definitions
  sampleThemeData.palette.forEach(color => {
    cssContent += `  --hex${color.id}: ${color.hex}; /* hsl(${color.h}, ${color.s}, ${color.l})      ${color.name} */\n`;
  });
  
  cssContent += `  /* --color15: */
  
  /* Color Palette (HSL-based) */
`;

  // Generate HSL component definitions
  sampleThemeData.palette.forEach(color => {
    cssContent += `  --h${color.id}: ${color.h};    /* ${color.name} */\n`;
    cssContent += `  --s${color.id}: ${color.s};\n`;
    cssContent += `  --l${color.id}: ${color.l};\n`;
  });
  
  cssContent += `  /* --hue15: */
  
  --is-light-theme: 0; /* 0 = dark theme, 1 = light theme (mathematical conditional) */
  --light-dark-variance: ${darkModeShift}%; /* The amount to lighten/darken colors for states */

  /* Base Color Definitions */
`;

  // Generate base color definitions and scales
  sampleThemeData.palette.forEach(color => {
    cssContent += generateColorScaleCSS(color, darkModeShift);
  });

  // Add the rest of the CSS structure
  cssContent += `
  /* Breakpoints (Mobile-First) */
  /* Used for major layout changes, e.g., @media (min-width: var(--breakpoint-md)) */
  --breakpoint-sm: ${sampleThemeData.layout.breakpoints.sm};
  --breakpoint-md: ${sampleThemeData.layout.breakpoints.md};
  --breakpoint-lg: ${sampleThemeData.layout.breakpoints.lg};
  --breakpoint-xl: ${sampleThemeData.layout.breakpoints.xl};

  /* Typography Scale */
  --font-family-sans: ${sampleThemeData.typography.fontFamilies.sans};
  --font-family-serif: ${sampleThemeData.typography.fontFamilies.serif};
  --font-family-handwriting: ${sampleThemeData.typography.fontFamilies.handwriting};

  /* Fluid Typography */
  /* clamp(MIN, PREFERRED, MAX) */
  --font-size1-fluid: ${sampleThemeData.typography.fluidFontSizes.size1};
  --font-size2-fluid: ${sampleThemeData.typography.fluidFontSizes.size2};
  --font-size3-fluid: ${sampleThemeData.typography.fluidFontSizes.size3};

  /* Fluid Spacing */
  /* Use for padding, margins, gaps, etc. */
  --spacing1-fluid: ${sampleThemeData.spacing.fluidSpacing.spacing1};
  --spacing2-fluid: ${sampleThemeData.spacing.fluidSpacing.spacing2};
  --spacing3-fluid: ${sampleThemeData.spacing.fluidSpacing.spacing3};

  /* Static Typography */
  --font-size-xs: ${sampleThemeData.typography.fontSizes.xs};
  --font-size-sm: ${sampleThemeData.typography.fontSizes.sm};
  --font-size-base: ${sampleThemeData.typography.fontSizes.base};
  --font-size-lg: ${sampleThemeData.typography.fontSizes.lg};
  --font-size-xl: ${sampleThemeData.typography.fontSizes.xl};
  --font-size-2xl: ${sampleThemeData.typography.fontSizes['2xl']};
  --font-size-3xl: ${sampleThemeData.typography.fontSizes['3xl']};
  --font-size-4xl: ${sampleThemeData.typography.fontSizes['4xl']};

  --font-weight-normal: ${sampleThemeData.typography.fontWeights.normal};
  --font-weight-increment: ${sampleThemeData.typography.fontWeights.increment};
  --font-weight-medium: calc(var(--font-weight-normal) + var(--font-weight-increment)); /* 500 */
  --font-weight-semibold: calc(var(--font-weight-normal) + (2 * var(--font-weight-increment))); /* 600 */
  --font-weight-bold: calc(var(--font-weight-normal) + (3 * var(--font-weight-increment))); /* 700 */

  --line-height-base: ${sampleThemeData.typography.lineHeights.base};
  --line-height-increment: ${sampleThemeData.typography.lineHeights.increment};
  --line-height-tight: calc(var(--line-height-base) - var(--line-height-increment));
  --line-height-relaxed: calc(var(--line-height-base) + var(--line-height-increment));

  /* Spacing Scale */
  --spacing-unit: ${sampleThemeData.spacing.unit};
  --spacing-xs: calc(1 * var(--spacing-unit)); 
  --spacing-sm: calc(2 * var(--spacing-unit));   
  --spacing-md: calc(4 * var(--spacing-unit));   
  --spacing-lg: calc(6 * var(--spacing-unit));   
  --spacing-xl: calc(8 * var(--spacing-unit));   
  --spacing-2xl: calc(12 * var(--spacing-unit)); 
  --spacing-3xl: calc(16 * var(--spacing-unit)); 
  --spacing-4xl: calc(24 * var(--spacing-unit)); 

  /* Border & Radius Scale */
  /* used generically for all components */
  --border-width-thin: ${sampleThemeData.borders.widths.thin};
  --border-width-medium: ${sampleThemeData.borders.widths.medium};
  --border-width-thick: ${sampleThemeData.borders.widths.thick};
  
  --border-radius-sm: ${sampleThemeData.borders.radius.sm};
  --border-radius-md: ${sampleThemeData.borders.radius.md};
  --border-radius-lg: ${sampleThemeData.borders.radius.lg};
  --border-radius-xl: ${sampleThemeData.borders.radius.xl};
  --border-radius-full: ${sampleThemeData.borders.radius.full};

  /* Shadow Scale (For Dark Theme) */
  --shadow-strength: ${sampleThemeData.shadows.strength};
  --shadow-color: ${sampleThemeData.shadows.color};
  --shadow-sm: ${sampleThemeData.shadows.sm};
  --shadow-md: ${sampleThemeData.shadows.md};
  --shadow-lg: ${sampleThemeData.shadows.lg};
  --shadow-xl: ${sampleThemeData.shadows.xl};

  /* Z-Index Scale */
  --z-index-default: ${sampleThemeData.zIndex.default};
  --z-index-content: ${sampleThemeData.zIndex.content};
  --z-index-sticky: ${sampleThemeData.zIndex.sticky};
  --z-index-modal-backdrop: ${sampleThemeData.zIndex.modalBackdrop};
  --z-index-sidebar: ${sampleThemeData.zIndex.sidebar};
  --z-index-header: ${sampleThemeData.zIndex.header};
  --z-index-modal: ${sampleThemeData.zIndex.modal};
  --z-index-tooltip: ${sampleThemeData.zIndex.tooltip};

  /* --- 2. GLOBAL ELEMENT TOKENS (DARK THEME) --- */
  
  /* Layout */
  --layout-container-max-width: ${sampleThemeData.layout.containerMaxWidth};
  --layout-background1-color: ${resolveColorReference(sampleThemeData.layout.background1Color, sampleThemeData.palette)};
  --layout-background2-color: ${resolveColorReference(sampleThemeData.layout.background2Color, sampleThemeData.palette)};

  /* Borders */
  --border1-color: ${resolveColorReference(sampleThemeData.layout.border1Color, sampleThemeData.palette)};
  --border2-color: ${resolveColorReference(sampleThemeData.layout.border2Color, sampleThemeData.palette)};

  /* States */
  --state-success-background-color: hsl(var(--h11) / 0.15);
  --state-success-border-color: hsl(var(--h11) );
  --state-error-background-color: hsl(var(--h12) / 0.15);
  --state-error-border-color: hsl(var(--h12));
  --state-warning-background-color: hsl(var(--h13) / 0.15);
  --state-warning-border-color: hsl(var(--h13));
  --state-info-background-color: hsl(var(--h14) / 0.15);
  --state-info-border-color: hsl(var(--h14) );
  --state-text-color: var(--color1-900);

  /* Typography */
  --ui: var(--font-weight-normal) var(--font-size-base)/var(--line-height-base) var(--font-family-sans);
  --text1-color: ${resolveColorReference(sampleThemeData.typography.textColors.text1, sampleThemeData.palette)};
  --text2-color: ${resolveColorReference(sampleThemeData.typography.textColors.text2, sampleThemeData.palette)};

  --content: var(--font-weight-normal) var(--font-size-base)/var(--line-height-relaxed) var(--font-family-handwriting);
  --heading1: var(--font-weight-bold) var(--font-size-4xl)/var(--line-height-tight) var(--font-family-sans);
  --heading2: var(--font-weight-bold) var(--font-size-3xl)/var(--line-height-tight) var(--font-family-sans);
  --body: var(--font-weight-normal) var(--font-size-base)/var(--line-height-normal) var(--font-family-sans);
/* do we need more styles for content? */

  /* --- 3. COMPONENT TOKENS --- */
  
  /* Header */
  --header-height: ${sampleThemeData.components.header.height};
  --header-background-color: ${resolveColorReference(sampleThemeData.components.header.backgroundColor, sampleThemeData.palette)};
  --header-border-color: ${resolveColorReference(sampleThemeData.components.header.borderColor, sampleThemeData.palette)};
  --header-border-width: ${sampleThemeData.components.header.borderWidth};

  /* Button: Solid */
  --button-solid-background-color: ${resolveColorReference(sampleThemeData.components.button.solid.backgroundColor, sampleThemeData.palette)};
  --button-solid-background-color-hover: ${resolveColorReference(sampleThemeData.components.button.solid.backgroundColorHover, sampleThemeData.palette)};
  --button-solid-border-color: ${resolveColorReference(sampleThemeData.components.button.solid.borderColor, sampleThemeData.palette)};
  --button-solid-text-color: ${resolveColorReference(sampleThemeData.components.button.solid.textColor, sampleThemeData.palette)};
  
  /* Button: Outline */
  --button-outline-background-color: ${sampleThemeData.components.button.outline.backgroundColor};
  --button-outline-background-color-hover: ${sampleThemeData.components.button.outline.backgroundColorHover};
  --button-outline-border-color: ${resolveColorReference(sampleThemeData.components.button.outline.borderColor, sampleThemeData.palette)};
  --button-outline-text-color: ${resolveColorReference(sampleThemeData.components.button.outline.textColor, sampleThemeData.palette)};
  --button-outline-border-width: ${sampleThemeData.components.button.outline.borderWidth};

  /* Card */
  --card-background-color: ${resolveColorReference(sampleThemeData.components.card.backgroundColor, sampleThemeData.palette)};
  --card-padding: ${sampleThemeData.components.card.padding};
  --card-border-color: ${resolveColorReference(sampleThemeData.components.card.borderColor, sampleThemeData.palette)};
  --card-border-width: ${sampleThemeData.components.card.borderWidth};
  --card-border-radius: ${sampleThemeData.components.card.borderRadius};
  --card-shadow: ${sampleThemeData.components.card.shadow};
  --card-shadow-hover: ${sampleThemeData.components.card.shadowHover};
  
  /* Tag */
  --tag-padding: ${sampleThemeData.components.tag.padding};
  --tag-border-radius: ${sampleThemeData.components.tag.borderRadius};
  --tag-font: ${sampleThemeData.components.tag.font};
  --tag-who-bg-color: ${resolveColorReference(sampleThemeData.components.tag.backgrounds.who, sampleThemeData.palette)};
  --tag-what-bg-color: ${resolveColorReference(sampleThemeData.components.tag.backgrounds.what, sampleThemeData.palette)};
  --tag-when-bg-color: ${resolveColorReference(sampleThemeData.components.tag.backgrounds.when, sampleThemeData.palette)};
  --tag-where-bg-color: ${resolveColorReference(sampleThemeData.components.tag.backgrounds.where, sampleThemeData.palette)};
  --tag-reflection-bg-color: ${resolveColorReference(sampleThemeData.components.tag.backgrounds.reflection, sampleThemeData.palette)};
  --tag-text-color: ${resolveColorReference(sampleThemeData.components.tag.textColor, sampleThemeData.palette)};
  
  /* Form & Input */
  --form-label-font: var(--font-weight-medium) var(--font-size-sm)/1 var(--font-family-sans);
  --form-label-color: var(--text2-color);
  --input-background-color: ${resolveColorReference(sampleThemeData.components.input.backgroundColor, sampleThemeData.palette)};
  --input-border-color: ${resolveColorReference(sampleThemeData.components.input.borderColor, sampleThemeData.palette)};
  --input-border-color-focus: ${resolveColorReference(sampleThemeData.components.input.borderColorFocus, sampleThemeData.palette)};
  --input-text-color: ${resolveColorReference(sampleThemeData.components.input.textColor, sampleThemeData.palette)};
  --input-border-radius: ${sampleThemeData.components.input.borderRadius};
  --input-padding: ${sampleThemeData.components.input.padding};

  /* Link */
  --link-text-color: ${resolveColorReference(sampleThemeData.components.link.textColor, sampleThemeData.palette)};
  --link-text-color-hover: ${resolveColorReference(sampleThemeData.components.link.textColorHover, sampleThemeData.palette)};
  --link-decoration-hover: ${sampleThemeData.components.link.decorationHover};
  
  /* Disabled State */
  --disabled-background-color: var(--color1-200);
  --disabled-text-color: var(--color1-500);
  --disabled-border-color: var(--color1-200);
  --disabled-opacity: 0.6;
}

/*
 * =================================================================
 * LIGHT THEME OVERRIDES
 * =================================================================
 */
[data-theme="light"] {
  /* --- BASE TOKEN OVERRIDES --- */

  /* Mathematical Conditional: Activate light theme calculations */
  --is-light-theme: 1;

  /* Grayscale Palette (Light Theme: Lighter shades have lower numbers) */
  --color1-050: hsl(var(--h1), var(--s1), 98%);
  --color1-100: hsl(var(--h1), var(--s1), 95%);
  --color1-200: hsl(var(--h1), var(--s1), 90%);
  --color1-300: hsl(var(--h1), var(--s1), 80%);
  --color1-400: hsl(var(--h1), var(--s1), 70%);
  --color1-500: hsl(var(--h1), var(--s1), 60%);
  --color1-600: hsl(var(--h1), var(--s1), 50%);
  --color1-700: hsl(var(--h1), var(--s1), 40%);
  --color1-800: hsl(var(--h1), var(--s1), 20%);
  --color1-900: hsl(var(--h1), var(--s1), 10%);
  
  /* Shadow Scale (For Light Theme) */
  --shadow-strength: 10%;
  --shadow-color: hsl(var(--h1) / var(--shadow-strength));

  /* --- GLOBAL ELEMENT TOKEN OVERRIDES --- */
  --layout-background1-color: var(--color2);      /* Main background, near white */
  --layout-background2-color: var(--color1-050);   /* Secondary background, off white */

  --border1-color: var(--color1-200);
  --border2-color: var(--color1-300);

  --text1-color: var(--color1-900); /* Primary text, near black */
  --text2-color: var(--color1-700); /* Secondary text, dark gray */

  /* --- COMPONENT TOKEN OVERRIDES --- */
  --header-background-color: var(--layout-background1-color);

  /* Note: Colors 3-14 now use mathematical conditional logic and don't need manual overrides */
  --button-outline-background-color-hover: hsla(var(--h3), var(--s3), var(--l3), 0.1);

  --input-background-color: var(--color2);
  --input-border-color: var(--border1-color);
  --input-text-color: var(--text1-color);
}
`;

  return cssContent;
};

// Generate and save the sample CSS
const main = async () => {
  try {
    console.log('Generating sample CSS using backend theme generation logic...');
    const sampleCSS = await generateSampleCSS();
    
    const outputPath = path.join(process.cwd(), 'sample-theme-output.css');
    await fs.writeFile(outputPath, sampleCSS, 'utf-8');
    
    console.log(`✅ Sample CSS generated successfully!`);
    console.log(`📄 File saved to: ${outputPath}`);
    console.log(`🔍 You can now open this file in your editor to see exactly what the backend generates.`);
    
    // Show key differences
    console.log('\n🎯 Key Features to Look For:');
    console.log('- Mathematical conditional colors (colors 3-14 use calc() formulas)');
    console.log('- --is-light-theme variable (0 for dark, 1 for light)');
    console.log('- No separate -light/-dark variants for colors 3-14');
    console.log('- Automatic brightness adjustment in dark mode');
    console.log('- Clean, standardized formatting');
    
  } catch (error) {
    console.error('❌ Error generating sample CSS:', error);
  }
};

main(); 