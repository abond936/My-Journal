import {
  hexToHsl,
  type PersistedThemeDocumentData,
  type AdminThemePresetId,
  type ReaderThemePresetId,
  type ReaderThemeRecipes,
  type ResolvedScopedThemeSettings,
  type ScopedThemeDocumentData,
  type StructuredThemeData,
} from '@/lib/types/theme';
import { DEFAULT_READER_THEME_RECIPES } from '@/lib/theme/readerThemeSystem';
import baseTheme from '../../../theme-data.json';

export type ThemePresetId = ReaderThemePresetId;
export type ThemeAdminPresetId = AdminThemePresetId;

type ReaderPresetRole =
  | 'page'
  | 'chrome'
  | 'card'
  | 'detail'
  | 'typeTreatments'
  | 'media'
  | 'discovery'
  | 'tags';

type ReaderPresetAliasGroups = Record<ReaderPresetRole, Record<string, string>>;

function cloneReaderRecipes(recipes: ReaderThemeRecipes): ReaderThemeRecipes {
  return JSON.parse(JSON.stringify(recipes)) as ReaderThemeRecipes;
}

const JOURNAL_READER_RECIPES: ReaderThemeRecipes = (() => {
  const recipes = cloneReaderRecipes(DEFAULT_READER_THEME_RECIPES);

  recipes.typography.title.family = 'font-family/serif1';
  recipes.typography.title.weight = 'font-weight/medium';
  recipes.typography.title.lineHeight = 'line-height/base';

  recipes.typography.storyTitle.family = 'font-family/serif1';
  recipes.typography.storyTitle.size = 'font-size/lg';
  recipes.typography.storyTitle.weight = 'font-weight/medium';
  recipes.typography.storyTitle.lineHeight = 'line-height/base';

  recipes.typography.storyOverlayTitle.family = 'font-family/serif1';
  recipes.typography.storyOverlayTitle.size = 'font-size/lg';
  recipes.typography.storyOverlayTitle.weight = 'font-weight/medium';
  recipes.typography.storyOverlayTitle.lineHeight = 'line-height/base';

  recipes.typography.storyExcerpt.lineHeight = 'line-height/base';

  recipes.typography.galleryTitle.family = 'font-family/serif1';
  recipes.typography.galleryTitle.weight = 'font-weight/medium';
  recipes.typography.galleryTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryOverlayTitle.family = 'font-family/serif1';
  recipes.typography.galleryOverlayTitle.weight = 'font-weight/medium';
  recipes.typography.galleryOverlayTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryHeaderTitle.family = 'font-family/serif1';
  recipes.typography.galleryHeaderTitle.weight = 'font-weight/medium';
  recipes.typography.galleryHeaderTitle.lineHeight = 'line-height/base';

  recipes.typography.titleCompact.weight = 'font-weight/medium';
  recipes.typography.titleCompact.lineHeight = 'line-height/base';

  recipes.typography.detailTitle.family = 'font-family/serif1';
  recipes.typography.detailTitle.weight = 'font-weight/semibold';
  recipes.typography.detailTitle.lineHeight = 'line-height/base';

  recipes.typography.storyDetailTitle.family = 'font-family/serif1';
  recipes.typography.storyDetailTitle.weight = 'font-weight/semibold';
  recipes.typography.storyDetailTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryDetailTitle.family = 'font-family/serif1';
  recipes.typography.galleryDetailTitle.size = 'font-size/2xl';
  recipes.typography.galleryDetailTitle.weight = 'font-weight/semibold';
  recipes.typography.galleryDetailTitle.lineHeight = 'line-height/base';

  recipes.typography.discoveryTitle.family = 'font-family/serif1';
  recipes.typography.discoveryTitle.weight = 'font-weight/medium';
  recipes.typography.discoveryTitle.lineHeight = 'line-height/base';

  recipes.typography.discoveryMeta.weight = 'font-weight/normal';
  recipes.typography.discoveryMeta.lineHeight = 'line-height/base';

  recipes.typography.railSectionTitle.family = 'font-family/serif1';
  recipes.typography.railSectionTitle.weight = 'font-weight/medium';
  recipes.typography.railSectionTitle.lineHeight = 'line-height/base';

  recipes.typography.railCardTitle.weight = 'font-weight/normal';
  recipes.typography.railCardTitle.lineHeight = 'line-height/base';

  recipes.typography.subtitle.family = 'font-family/serif1';
  recipes.typography.subtitle.size = 'font-size/lg';
  recipes.typography.subtitle.lineHeight = 'line-height/relaxed';

  recipes.typography.body.size = 'font-size/base';
  recipes.typography.body.lineHeight = 'line-height/relaxed';

  recipes.typography.excerpt.lineHeight = 'line-height/relaxed';

  recipes.typography.caption.lineHeight = 'line-height/relaxed';

  recipes.typography.supportTitle.weight = 'font-weight/medium';
  recipes.typography.supportTitle.lineHeight = 'line-height/base';
  recipes.typography.feedbackTitle.weight = 'font-weight/medium';
  recipes.typography.feedbackTitle.lineHeight = 'line-height/base';

  recipes.typography.supportLabel.weight = 'font-weight/normal';
  recipes.typography.supportMeta.weight = 'font-weight/normal';
  recipes.typography.feedbackMeta.weight = 'font-weight/normal';
  recipes.typography.supportHint.lineHeight = 'line-height/relaxed';
  recipes.typography.feedbackHint.lineHeight = 'line-height/relaxed';

  recipes.typography.quote.weight = 'font-weight/normal';
  recipes.typography.quote.lineHeight = 'line-height/relaxed';

  recipes.typography.question.family = 'font-family/serif1';
  recipes.typography.question.size = 'font-size/xl';
  recipes.typography.question.weight = 'font-weight/medium';
  recipes.typography.question.lineHeight = 'line-height/base';

  recipes.typography.questionOverlay.family = 'font-family/serif1';
  recipes.typography.questionOverlay.size = 'font-size/xl';
  recipes.typography.questionOverlay.weight = 'font-weight/medium';
  recipes.typography.questionOverlay.lineHeight = 'line-height/base';

  recipes.typography.calloutTitle.family = 'font-family/serif1';
  recipes.typography.calloutTitle.weight = 'font-weight/medium';
  recipes.typography.calloutTitle.lineHeight = 'line-height/base';

  recipes.typography.calloutBody.lineHeight = 'line-height/relaxed';

  recipes.surfaces.card.padding = 'spacing/xl';
  recipes.surfaces.canvasDetail.padding = 'spacing/2xl';
  recipes.surfaces.feedbackPanel.padding = 'spacing/2xl';

  recipes.controls.supportControl.hoverBackground = 'layout/background1Color';
  recipes.controls.supportControlStrong.hoverBackground = 'layout/background2Color';
  recipes.controls.feedbackAction.hoverBackground = 'layout/background1Color';
  recipes.controls.supportChip.hoverBackground = 'layout/background2Color';
  recipes.controls.lightboxControl.background = 'layout/background2Color';

  recipes.treatments.quoteWatermarkOpacity = '0.16';
  recipes.treatments.questionWatermarkOpacity = '0.2';
  recipes.treatments.calloutWatermarkOpacity = '0.2';

  return recipes;
})();

const EDITORIAL_READER_RECIPES: ReaderThemeRecipes = (() => {
  const recipes = cloneReaderRecipes(DEFAULT_READER_THEME_RECIPES);

  recipes.typography.title.family = 'font-family/serif1';
  recipes.typography.title.weight = 'font-weight/medium';
  recipes.typography.title.lineHeight = 'line-height/base';

  recipes.typography.storyTitle.family = 'font-family/serif1';
  recipes.typography.storyTitle.size = 'font-size/lg';
  recipes.typography.storyTitle.weight = 'font-weight/medium';
  recipes.typography.storyTitle.lineHeight = 'line-height/base';

  recipes.typography.storyOverlayTitle.family = 'font-family/serif1';
  recipes.typography.storyOverlayTitle.size = 'font-size/lg';
  recipes.typography.storyOverlayTitle.weight = 'font-weight/medium';
  recipes.typography.storyOverlayTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryTitle.family = 'font-family/serif1';
  recipes.typography.galleryTitle.size = 'font-size/lg';
  recipes.typography.galleryTitle.weight = 'font-weight/medium';
  recipes.typography.galleryTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryOverlayTitle.family = 'font-family/serif1';
  recipes.typography.galleryOverlayTitle.size = 'font-size/lg';
  recipes.typography.galleryOverlayTitle.weight = 'font-weight/medium';
  recipes.typography.galleryOverlayTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryHeaderTitle.family = 'font-family/serif1';
  recipes.typography.galleryHeaderTitle.weight = 'font-weight/medium';
  recipes.typography.galleryHeaderTitle.lineHeight = 'line-height/base';

  recipes.typography.titleCompact.family = 'font-family/serif1';
  recipes.typography.titleCompact.weight = 'font-weight/medium';
  recipes.typography.titleCompact.lineHeight = 'line-height/base';

  recipes.typography.detailTitle.family = 'font-family/serif1';
  recipes.typography.detailTitle.weight = 'font-weight/semibold';
  recipes.typography.detailTitle.lineHeight = 'line-height/base';

  recipes.typography.storyDetailTitle.family = 'font-family/serif1';
  recipes.typography.storyDetailTitle.weight = 'font-weight/semibold';
  recipes.typography.storyDetailTitle.lineHeight = 'line-height/base';

  recipes.typography.galleryDetailTitle.family = 'font-family/serif2';
  recipes.typography.galleryDetailTitle.weight = 'font-weight/semibold';
  recipes.typography.galleryDetailTitle.lineHeight = 'line-height/base';

  recipes.typography.discoveryTitle.family = 'font-family/serif1';
  recipes.typography.discoveryTitle.weight = 'font-weight/semibold';
  recipes.typography.discoveryTitle.lineHeight = 'line-height/base';

  recipes.typography.railSectionTitle.family = 'font-family/serif1';
  recipes.typography.railSectionTitle.weight = 'font-weight/medium';
  recipes.typography.railSectionTitle.lineHeight = 'line-height/base';

  recipes.typography.question.family = 'font-family/serif3';
  recipes.typography.question.size = 'font-size/lg';
  recipes.typography.question.weight = 'font-weight/semibold';
  recipes.typography.question.lineHeight = 'line-height/base';

  recipes.typography.questionOverlay.family = 'font-family/serif3';
  recipes.typography.questionOverlay.size = 'font-size/lg';
  recipes.typography.questionOverlay.weight = 'font-weight/semibold';
  recipes.typography.questionOverlay.lineHeight = 'line-height/base';

  recipes.typography.calloutTitle.family = 'font-family/serif1';
  recipes.typography.calloutTitle.weight = 'font-weight/medium';
  recipes.typography.calloutTitle.lineHeight = 'line-height/base';

  recipes.typography.calloutBody.lineHeight = 'line-height/relaxed';
  recipes.typography.quote.lineHeight = 'line-height/relaxed';

  recipes.surfaces.storyCardClosed.background = 'shared/card/background';
  recipes.surfaces.storyCardClosed.border = 'shared/card/border';
  recipes.surfaces.storyCardClosed.radius = 'shared/card/radius';
  recipes.surfaces.storyCardClosed.shadow = 'shared/card/shadow';
  recipes.surfaces.storyCardClosed.shadowHover = 'shared/card/shadowHover';
  recipes.surfaces.storyCardClosed.padding = 'spacing/md';
  recipes.surfaces.qaCardClosed.background = 'shared/card/background';
  recipes.surfaces.qaCardClosed.border = 'shared/card/border';
  recipes.surfaces.qaCardClosed.radius = 'shared/card/radius';
  recipes.surfaces.qaCardClosed.shadow = 'shared/card/shadow';
  recipes.surfaces.qaCardClosed.shadowHover = 'shared/card/shadowHover';
  recipes.surfaces.qaCardClosed.padding = 'spacing/md';
  recipes.surfaces.galleryCardClosed.background = 'shared/card/background';
  recipes.surfaces.galleryCardClosed.border = 'shared/card/border';
  recipes.surfaces.galleryCardClosed.radius = 'shared/card/radius';
  recipes.surfaces.galleryCardClosed.shadow = 'shared/card/shadow';
  recipes.surfaces.galleryCardClosed.shadowHover = 'shared/card/shadowHover';
  recipes.surfaces.galleryCardClosed.padding = 'spacing/xl';
  recipes.surfaces.quoteCardClosed = {
    background: 'layout/background1Color',
    border: 'layout/border1Color',
    radius: 'border/radius/lg',
    shadow: 'shadow/sm',
    padding: 'spacing/xl',
  };
  recipes.surfaces.calloutCardClosed = {
    background: 'layout/background1Color',
    border: 'layout/border1Color',
    radius: 'border/radius/lg',
    shadow: 'shadow/md',
    padding: 'spacing/xl',
  };

  recipes.overlays.coveredFade.background = 'semantic/reader/covered-fade-strong';

  recipes.treatments.quoteWatermarkOpacity = '0.16';
  recipes.treatments.questionWatermarkOpacity = '0.22';
  recipes.treatments.calloutWatermarkOpacity = '0.22';

  return recipes;
})();

export const THEME_PRESET_META: Record<
  ThemePresetId,
  { label: string; description: string }
> = {
  journal: {
    label: 'Journal',
    description:
      'Warmer page tones, softer corners, system UI fonts; handwriting available for display accents only (body stays sans).',
  },
  editorial: {
    label: 'Editorial',
    description:
      'Cool blue-gray neutrals, serif-led content titles, and restrained chrome for a publication-style reading feel.',
  },
};

export const ADMIN_THEME_PRESET_META: Record<
  ThemeAdminPresetId,
  { label: string; description: string }
> = {
  admin: {
    label: 'Admin',
    description:
      'Neutral, higher-contrast authoring theme for dense grids, forms, focus states, and long editing sessions.',
  },
};

export const READER_PRESET_ALIAS_GROUPS: Record<ThemePresetId, ReaderPresetAliasGroups> = {
  journal: {
    page: {},
    chrome: {},
    card: {},
    detail: {
      '--reader-title-font-family': 'var(--font-family-serif)',
      '--reader-detail-title-font-family': 'var(--font-family-serif)',
      '--reader-detail-title-font-weight': 'var(--font-weight-semibold)',
    },
    typeTreatments: {
      '--reader-quote-font-family': 'var(--font-family-serif)',
      '--reader-quote-watermark-opacity': '0.16',
      '--reader-question-watermark-opacity': '0.2',
      '--reader-callout-watermark-opacity': '0.2',
    },
    media: {},
    discovery: {},
    tags: {},
  },
  editorial: {
    page: {},
    chrome: {},
    card: {},
    detail: {
      '--reader-title-font-family': 'var(--font-family-serif)',
      '--reader-detail-title-font-family': 'var(--font-family-serif)',
      '--reader-detail-title-font-weight': 'var(--font-weight-semibold)',
    },
    typeTreatments: {
      '--reader-quote-font-family': 'var(--font-family-serif)',
      '--reader-quote-watermark-opacity': '0.16',
      '--reader-question-watermark-opacity': '0.22',
      '--reader-callout-watermark-opacity': '0.22',
    },
    media: {},
    discovery: {},
    tags: {},
  },
};

function cloneTheme(data: unknown): StructuredThemeData {
  return JSON.parse(JSON.stringify(data)) as StructuredThemeData;
}

function getBaseThemeData(data: unknown): StructuredThemeData {
  const scoped = data as PersistedThemeDocumentData | null | undefined;
  if (scoped?.version === 2 && scoped.reader?.data) {
    return cloneTheme(scoped.reader.data);
  }
  return cloneTheme(data);
}

function patchThemeColor(themeData: StructuredThemeData, id: 1 | 2, variant: 'light' | 'dark', hex: string) {
  const tc = themeData.themeColors.find((c) => c.id === id);
  if (!tc) return;
  const { h, s, l } = hexToHsl(hex);
  tc[variant].hex = hex;
  tc[variant].h = `${h}`;
  tc[variant].s = `${s}%`;
  tc[variant].l = `${l}%`;
}

function patchPaletteHex(themeData: StructuredThemeData, id: number, hex: string) {
  const c = themeData.palette.find((p) => p.id === id);
  if (!c) return;
  const { h, s, l } = hexToHsl(hex);
  c.hex = hex;
  c.h = `${h}`;
  c.s = `${s}%`;
  c.l = `${l}%`;
}

/** Full theme document matching `theme-data.json` + optional `activePresetId`. */
export type ThemeDocumentData = StructuredThemeData & {
  activePresetId?: ThemePresetId | ThemeAdminPresetId | 'custom';
};

export function buildJournalPreset(): ThemeDocumentData {
  const t = getBaseThemeData(baseTheme) as ThemeDocumentData;
  t.activePresetId = 'journal';
  t.gradients.canvasTexture = 'none';
  // Warmer “paper” surfaces (light); keep dark mode readable
  patchThemeColor(t, 1, 'light', '#f3eadf');
  patchThemeColor(t, 1, 'dark', '#1b1613');
  patchThemeColor(t, 2, 'light', '#31261f');
  patchThemeColor(t, 2, 'dark', '#f5ede4');
  // Slightly warmer principal
  patchPaletteHex(t, 3, '#76513a');
  patchPaletteHex(t, 4, '#b89456');
  // Legible UI + body; handwriting kept for rare display use
  t.typography.fontFamilies.sans1 =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  t.typography.fontFamilies.sans2 = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  t.typography.fontFamilies.sans3 = '"Avenir Next", Avenir, "Segoe UI", sans-serif';
  t.typography.fontFamilies.serif1 = '"Georgia", "Times New Roman", serif';
  t.typography.fontFamilies.serif2 = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';
  t.typography.fontFamilies.serif3 = '"Baskerville", "Times New Roman", serif';
  t.typography.fontFamilies.handwriting1 = '"Ink Free", "Segoe Script", "Brush Script MT", cursive';
  t.typography.fontFamilies.handwriting2 = '"Snell Roundhand", "Brush Script MT", cursive';
  t.typography.textColors.text2 = 'color2-100';
  t.typography.fontWeights.medium = '450';
  t.typography.fontWeights.semibold = '550';
  t.typography.fontWeights.bold = '650';
  t.typography.lineHeights.base = '1.6';
  t.typography.lineHeights.tight = '1.3';
  t.typography.lineHeights.relaxed = '1.85';
  t.borders.radius.sm = '0.3rem';
  t.borders.radius.md = '0.55rem';
  t.borders.radius.lg = '1rem';
  t.borders.radius.xl = '1.125rem';
  t.shadows.strength = '10%';
  t.shadows.strengthDark = '24%';
  t.layout.buttonMinWidth = '72px';
  t.layout.sidebarWidthMobile = '272px';
  t.components.button.outline.borderWidth = 'border/width/thin';
  t.components.card.padding = 'spacing/xl';
  t.components.card.borderWidth = 'border/width/thin';
  t.components.card.borderRadius = 'border/radius/lg';
  t.components.card.shadow = 'shadow/md';
  t.components.card.shadowHover = 'shadow/lg';
  t.components.input.borderRadius = 'border/radius/md';
  t.components.input.padding = 'spacing/md spacing/lg';
  return t;
}

export function buildEditorialPreset(): ThemeDocumentData {
  const t = getBaseThemeData(baseTheme) as ThemeDocumentData;
  t.activePresetId = 'editorial';
  t.gradients.canvasTexture = 'none';
  patchThemeColor(t, 1, 'light', '#c0c6d3');
  patchThemeColor(t, 1, 'dark', '#151b28');
  patchThemeColor(t, 2, 'light', '#363e4e');
  patchThemeColor(t, 2, 'dark', '#eef2f6');
  patchPaletteHex(t, 3, '#0f4c81');
  patchPaletteHex(t, 4, '#c9a227');
  t.typography.fontFamilies.sans1 =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  t.typography.fontFamilies.sans2 = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  t.typography.fontFamilies.sans3 = '"Avenir Next", Avenir, "Segoe UI", sans-serif';
  t.typography.fontFamilies.serif1 = '"Georgia", "Times New Roman", serif';
  t.typography.fontFamilies.serif2 = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';
  t.typography.fontFamilies.serif3 = '"Baskerville", "Times New Roman", serif';
  t.typography.fontFamilies.handwriting1 = '"Bradley Hand", "Segoe Print", "Ink Free", cursive';
  t.typography.fontFamilies.handwriting2 = '"Snell Roundhand", "Brush Script MT", cursive';
  t.borders.radius.sm = '0.125rem';
  t.borders.radius.md = '0.375rem';
  t.borders.radius.lg = '0.5rem';
  t.borders.radius.xl = '0.625rem';
  t.shadows.strength = '8%';
  t.shadows.strengthDark = '22%';
  t.components.card.borderRadius = 'border/radius/md';
  t.components.card.shadow = 'shadow/sm';
  t.components.card.shadowHover = 'shadow/md';
  return t;
}

export function buildAdminPreset(): ThemeDocumentData {
  const t = getBaseThemeData(baseTheme) as ThemeDocumentData;
  t.activePresetId = 'admin';
  t.gradients.canvasTexture = 'none';
  patchThemeColor(t, 1, 'light', '#dde3ec');
  patchThemeColor(t, 1, 'dark', '#121926');
  patchThemeColor(t, 2, 'light', '#1f2937');
  patchThemeColor(t, 2, 'dark', '#eef2f7');
  patchPaletteHex(t, 3, '#0f4c81');
  patchPaletteHex(t, 4, '#b08a3e');
  patchPaletteHex(t, 11, '#15803d');
  patchPaletteHex(t, 12, '#b91c1c');
  patchPaletteHex(t, 13, '#b45309');
  patchPaletteHex(t, 14, '#0369a1');
  t.typography.fontFamilies.sans1 =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  t.typography.fontFamilies.sans2 = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  t.typography.fontFamilies.sans3 = '"Avenir Next", Avenir, "Segoe UI", sans-serif';
  t.typography.fontFamilies.serif1 = '"Georgia", "Times New Roman", serif';
  t.typography.fontFamilies.serif2 = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';
  t.typography.fontFamilies.serif3 = '"Baskerville", "Times New Roman", serif';
  t.typography.fontFamilies.handwriting1 = '"Bradley Hand", "Segoe Print", "Ink Free", cursive';
  t.typography.fontFamilies.handwriting2 = '"Snell Roundhand", "Brush Script MT", cursive';
  t.spacing.unit = '4px';
  t.borders.radius.sm = '0.2rem';
  t.borders.radius.md = '0.35rem';
  t.borders.radius.lg = '0.5rem';
  t.borders.radius.xl = '0.625rem';
  t.shadows.strength = '7%';
  t.shadows.strengthDark = '24%';
  t.components.card.borderRadius = 'border/radius/md';
  t.components.card.shadow = 'shadow/sm';
  t.components.card.shadowHover = 'shadow/md';
  t.components.input.borderRadius = 'border/radius-sm';
  t.components.button.outline.borderWidth = 'border/width/thin';
  return t;
}

export function getThemePresetDocument(id: ThemePresetId): ThemeDocumentData {
  return id === 'journal' ? buildJournalPreset() : buildEditorialPreset();
}

export function getAdminThemePresetDocument(id: ThemeAdminPresetId): ThemeDocumentData {
  void id;
  return buildAdminPreset();
}

export function getReaderPresetRecipes(id: ThemePresetId): ReaderThemeRecipes {
  return id === 'journal'
    ? cloneReaderRecipes(JOURNAL_READER_RECIPES)
    : cloneReaderRecipes(EDITORIAL_READER_RECIPES);
}

function toResolvedScopedThemeSettings(
  theme: ThemeDocumentData,
  fallbackPresetId: ThemePresetId | ThemeAdminPresetId,
  recipes?: ReaderThemeRecipes
): ResolvedScopedThemeSettings {
  const {
    activePresetId,
    ...data
  } = theme;

  return {
    data: data as StructuredThemeData,
    activePresetId: activePresetId ?? fallbackPresetId,
    recipes,
  };
}

export function getReaderPresetSettings(
  id: ThemePresetId,
  recipes?: ReaderThemeRecipes
): ResolvedScopedThemeSettings {
  return toResolvedScopedThemeSettings(getThemePresetDocument(id), id, recipes ?? getReaderPresetRecipes(id));
}

export function getAdminPresetSettings(id: ThemeAdminPresetId): ResolvedScopedThemeSettings {
  return toResolvedScopedThemeSettings(getAdminThemePresetDocument(id), id);
}

export function getDefaultScopedThemeDocument(): ScopedThemeDocumentData {
  const reader = getReaderPresetSettings('journal');
  const admin = getAdminPresetSettings('admin');

  return {
    version: 2,
    reader: {
      data: reader.data,
      activePresetId: reader.activePresetId,
      recipes: reader.recipes,
    },
    admin: {
      data: admin.data,
      activePresetId: admin.activePresetId,
    },
  };
}
