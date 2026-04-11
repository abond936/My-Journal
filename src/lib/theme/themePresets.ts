import { hexToHsl, type StructuredThemeData } from '@/lib/types/theme';
import baseTheme from '../../../theme-data.json';

export type ThemePresetId = 'journal' | 'editorial';

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
      'Cool neutrals, tighter radii, system sans throughout for a calm product look.',
  },
};

function cloneTheme(data: unknown): StructuredThemeData {
  return JSON.parse(JSON.stringify(data)) as StructuredThemeData;
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

/** Full theme document matching `theme-data.json` + optional `activePresetId` / `darkModeShift`. */
export type ThemeDocumentData = StructuredThemeData & {
  darkModeShift?: number;
  activePresetId?: ThemePresetId | 'custom';
};

export function buildJournalPreset(): ThemeDocumentData {
  const t = cloneTheme(baseTheme) as ThemeDocumentData;
  t.activePresetId = 'journal';
  t.darkModeShift = t.darkModeShift ?? 5;
  // Warmer “paper” surfaces (light); keep dark mode readable
  patchThemeColor(t, 1, 'light', '#e6dfd6');
  patchThemeColor(t, 1, 'dark', '#1c1916');
  patchThemeColor(t, 2, 'light', '#2a2420');
  patchThemeColor(t, 2, 'dark', '#f2ece6');
  // Slightly warmer principal
  patchPaletteHex(t, 3, '#1a5682');
  // Legible UI + body; handwriting kept for rare display use
  t.typography.fontFamilies.sans =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  t.typography.fontFamilies.serif = '"Georgia", "Times New Roman", serif';
  t.typography.fontFamilies.handwriting = '"Ink Free", "Segoe Script", "Brush Script MT", cursive';
  t.borders.radius.sm = '0.3rem';
  t.borders.radius.md = '0.55rem';
  t.borders.radius.lg = '1rem';
  t.borders.radius.xl = '1.125rem';
  t.shadows.strength = '12%';
  t.shadows.strengthDark = '28%';
  t.components.card.borderRadius = 'border/radius/lg';
  t.components.card.shadow = 'shadow/md';
  t.components.card.shadowHover = 'shadow/lg';
  return t;
}

export function buildEditorialPreset(): ThemeDocumentData {
  const t = cloneTheme(baseTheme) as ThemeDocumentData;
  t.activePresetId = 'editorial';
  t.darkModeShift = t.darkModeShift ?? 5;
  patchThemeColor(t, 1, 'light', '#eceef2');
  patchThemeColor(t, 1, 'dark', '#14161c');
  patchThemeColor(t, 2, 'light', '#16181d');
  patchThemeColor(t, 2, 'dark', '#eef0f4');
  patchPaletteHex(t, 3, '#0f4c81');
  patchPaletteHex(t, 4, '#c9a227');
  t.typography.fontFamilies.sans =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  t.typography.fontFamilies.serif = '"Georgia", "Times New Roman", serif';
  t.typography.fontFamilies.handwriting = t.typography.fontFamilies.sans;
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

export function getThemePresetDocument(id: ThemePresetId): ThemeDocumentData {
  return id === 'journal' ? buildJournalPreset() : buildEditorialPreset();
}
