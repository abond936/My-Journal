/**
 * Client-safe theme types and utilities
 * This file contains no server-side dependencies and can be imported by client components
 */

/**
 * Represents a single base color from the palette, linking its
 * HEX value to its HSL components.
 */
export interface BaseColor {
  id: number; // The number from the variable name, e.g., 3 for --hex3
  name: string; // The descriptive name from the comment, e.g., "principal"
  hex: string;
  h: string;
  s: string;
  l: string;
}

/**
 * Represents a theme color with light and dark mode variants
 */
export interface ThemeColor {
  id: number;
  name: string;
  light: {
    hex: string;
    h: string;
    s: string;
    l: string;
  };
  dark: {
    hex: string;
    h: string;
    s: string;
    l: string;
  };
}

/**
 * Typography tokens
 */
export interface TypographyTokens {
  textColors: {
    text1: string;
    text2: string;
  };
  fontFamilies: {
    sans: string;
    serif: string;
    handwriting: string;
  };
  fontSizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
  };
  fluidFontSizes: {
    size1: string;
    size2: string;
    size3: string;
  };
  fontWeights: {
    normal: string;
    increment: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeights: {
    base: string;
    tight: string;
    relaxed: string;
  };
}

/**
 * Spacing tokens
 */
export interface SpacingTokens {
  unit: string;
  /** Optional scale multipliers (theme admin UI); computed pixel steps may live in xs–4xl */
  xsMultiplier?: string;
  smMultiplier?: string;
  mdMultiplier?: string;
  lgMultiplier?: string;
  xlMultiplier?: string;
  '2xlMultiplier'?: string;
  '3xlMultiplier'?: string;
  '4xlMultiplier'?: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  fluidSpacing: {
    spacing1: string;
    spacing2: string;
    spacing3: string;
  };
}

/**
 * Border and radius tokens
 */
export interface BorderTokens {
  colors: {
    border1: string;
    border2: string;
  };
  widths: {
    thin: string;
    medium: string;
    thick: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

/**
 * Shadow tokens
 */
export interface ShadowTokens {
  strength: string;
  strengthDark: string;
  color: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * Z-index tokens
 */
export interface ZIndexTokens {
  default: string;
  content: string;
  sticky: string;
  modalBackdrop: string;
  sidebar: string;
  header: string;
  modal: string;
  tooltip: string;
}

/**
 * Gradient tokens
 */
export interface GradientTokens {
  bottomOverlay: string;
  bottomOverlayStrong: string;
}

/**
 * Layout tokens
 */
export interface LayoutTokens {
  containerMaxWidth: string;
  bodyFontFamily: string;
  bodyBackgroundColor: string;
  background1Color: string;
  background2Color: string;
  border1Color: string;
  border2Color: string;
  sidebarWidth: string;
  sidebarWidthMobile: string;
  logoMaxHeight: string;
  spinnerSize: string;
  formMinWidth: string;
  buttonMinWidth: string;
  iconMinWidth: string;
  transitionShort: string;
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Component tokens for specific UI elements
 */
export interface ComponentTokens {
  header: {
    height: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: string;
  };
  button: {
    solid: {
      backgroundColor: string;
      backgroundColorHover: string;
      borderColor: string;
      textColor: string;
    };
    outline: {
      backgroundColor: string;
      backgroundColorHover: string;
      borderColor: string;
      textColor: string;
      borderWidth: string;
    };
  };
  card: {
    backgroundColor: string;
    padding: string;
    borderColor: string;
    borderWidth: string;
    borderRadius: string;
    shadow: string;
    shadowHover: string;
  };
  tag: {
    padding: string;
    borderRadius: string;
    /** Optional shorthand used by theme admin UI */
    font?: string;
    fontWeight: string;
    fontSize: string;
    fontFamily: string;
    textColor: string;
    backgrounds: {
      who: string;
      what: string;
      when: string;
      where: string;
    };
  };
  input: {
    backgroundColor: string;
    borderColor: string;
    borderColorFocus: string;
    textColor: string;
    borderRadius: string;
    padding: string;
  };
  link: {
    textColor: string;
    textColorHover: string;
    decorationHover: string;
  };
}

/**
 * State tokens for success, error, warning, and info states
 */
export interface StateTokens {
  success: {
    backgroundColor: string;
    borderColor: string;
  };
  error: {
    backgroundColor: string;
    borderColor: string;
  };
  warning: {
    backgroundColor: string;
    borderColor: string;
  };
  info: {
    backgroundColor: string;
    borderColor: string;
  };
}

/**
 * The complete structured representation of theme data
 */
export interface StructuredThemeData {
  palette: BaseColor[];
  themeColors: ThemeColor[]; // Colors 1 and 2 with light/dark variants
  typography: TypographyTokens;
  spacing: SpacingTokens;
  borders: BorderTokens;
  shadows: ShadowTokens;
  zIndex: ZIndexTokens;
  layout: LayoutTokens;
  components: ComponentTokens;
  states: StateTokens;
  gradients: GradientTokens;
}

export type ReaderThemePresetId = 'journal' | 'editorial';
export type AdminThemePresetId = 'admin';
export type ThemeScopeId = 'reader' | 'admin';

export type ThemeRecipeTokenRef =
  | `font-family/${'sans' | 'serif' | 'handwriting'}`
  | `font-size/${'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'}`
  | `font-weight/${'normal' | 'medium' | 'semibold' | 'bold'}`
  | `line-height/${'base' | 'tight' | 'relaxed'}`
  | `spacing/${'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'}`
  | `border/radius/${'sm' | 'md' | 'lg' | 'xl' | 'full'}`
  | `shadow/${'sm' | 'md' | 'lg' | 'xl'}`
  | `theme-color/${1 | 2}/${'light' | 'dark'}`
  | `palette/${number}`
  | `layout/${string}`
  | `component/${string}`
  | `state/${'success' | 'error' | 'warning' | 'info'}/${'background' | 'border'}`
  | `gradient/${'bottomOverlay' | 'bottomOverlayStrong'}`
  | `literal/${string}`;

export interface ReaderTypographyRoleRecipe {
  family: ThemeRecipeTokenRef;
  size: ThemeRecipeTokenRef;
  weight: ThemeRecipeTokenRef;
  lineHeight: ThemeRecipeTokenRef;
  color: ThemeRecipeTokenRef;
  fontStyle?: 'normal' | 'italic';
}

export interface ReaderSurfaceRoleRecipe {
  background: ThemeRecipeTokenRef;
  border: ThemeRecipeTokenRef;
  radius?: ThemeRecipeTokenRef;
  shadow?: ThemeRecipeTokenRef;
  shadowHover?: ThemeRecipeTokenRef;
  padding?: ThemeRecipeTokenRef;
}

export interface ReaderControlRoleRecipe {
  background: ThemeRecipeTokenRef;
  text: ThemeRecipeTokenRef;
  border: ThemeRecipeTokenRef;
  hoverBackground?: ThemeRecipeTokenRef;
  hoverText?: ThemeRecipeTokenRef;
}

export interface ReaderOverlayRoleRecipe {
  background: ThemeRecipeTokenRef;
  text: ThemeRecipeTokenRef;
  border?: ThemeRecipeTokenRef;
}

export interface ReaderThemeRecipes {
  typography: {
    title: ReaderTypographyRoleRecipe;
    storyTitle: ReaderTypographyRoleRecipe;
    galleryTitle: ReaderTypographyRoleRecipe;
    titleCompact: ReaderTypographyRoleRecipe;
    detailTitle: ReaderTypographyRoleRecipe;
    storyDetailTitle: ReaderTypographyRoleRecipe;
    galleryDetailTitle: ReaderTypographyRoleRecipe;
    subtitle: ReaderTypographyRoleRecipe;
    body: ReaderTypographyRoleRecipe;
    excerpt: ReaderTypographyRoleRecipe;
    meta: ReaderTypographyRoleRecipe;
    caption: ReaderTypographyRoleRecipe;
    quote: ReaderTypographyRoleRecipe;
    question: ReaderTypographyRoleRecipe;
    calloutTitle: ReaderTypographyRoleRecipe;
    calloutBody: ReaderTypographyRoleRecipe;
    tagLabel: ReaderTypographyRoleRecipe;
  };
  surfaces: {
    page: ReaderSurfaceRoleRecipe;
    chrome: ReaderSurfaceRoleRecipe;
    card: ReaderSurfaceRoleRecipe;
    detail: ReaderSurfaceRoleRecipe;
    discovery: ReaderSurfaceRoleRecipe;
    mediaFrame: ReaderSurfaceRoleRecipe;
  };
  controls: {
    solid: ReaderControlRoleRecipe;
    filterChip: ReaderControlRoleRecipe;
    mediaControl: ReaderControlRoleRecipe;
    lightboxControl: ReaderControlRoleRecipe;
    link: Pick<ReaderControlRoleRecipe, 'text' | 'hoverBackground' | 'hoverText'>;
    focusRing: {
      color: ThemeRecipeTokenRef;
    };
  };
  tags: {
    who: ReaderControlRoleRecipe;
    what: ReaderControlRoleRecipe;
    when: ReaderControlRoleRecipe;
    where: ReaderControlRoleRecipe;
    muted: ReaderControlRoleRecipe;
  };
  overlays: {
    card: ReaderOverlayRoleRecipe;
    cardStrong: ReaderOverlayRoleRecipe;
    lightbox: ReaderOverlayRoleRecipe;
  };
  iconography: {
    chrome: ThemeRecipeTokenRef;
    solid: ThemeRecipeTokenRef;
    overlay: ThemeRecipeTokenRef;
    accent: ThemeRecipeTokenRef;
  };
  treatments: {
    quoteWatermarkOpacity: string;
    questionWatermarkOpacity: string;
    calloutWatermarkOpacity: string;
  };
}

export interface ScopedThemeSettings {
  data: StructuredThemeData;
  activePresetId?: ReaderThemePresetId | AdminThemePresetId | 'custom';
  darkModeShift?: number;
  recipes?: ReaderThemeRecipes;
}

export interface ScopedThemeDocumentData {
  version: 2;
  reader: ScopedThemeSettings;
  admin: ScopedThemeSettings;
}

/**
 * Converts a HEX color to HSL components.
 * This utility is used to automatically sync HEX and HSL values in the admin interface.
 */
export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
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
