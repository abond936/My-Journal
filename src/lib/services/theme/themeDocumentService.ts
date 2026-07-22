import type {
  PersistedThemeDocumentData,
  ReaderThemeRecipes,
  ResolvedScopedThemeDocumentData,
  ResolvedScopedThemeSettings,
  ScopedThemeSettings,
  StructuredThemeData,
} from '@/lib/types/theme';
import { getDefaultScopedThemeDocument } from '@/lib/theme/themePresets';

type LegacyFlatThemeData = StructuredThemeData & {
  activePresetId?: string;
  recipes?: ReaderThemeRecipes;
};

export type PersistedThemeData = LegacyFlatThemeData | PersistedThemeDocumentData;

function normalizeLegacyContrastTextToken(themeData: StructuredThemeData): StructuredThemeData {
  if (themeData.components?.button?.solid?.textColor !== 'color1-100') return themeData;

  return {
    ...themeData,
    components: {
      ...themeData.components,
      button: {
        ...themeData.components.button,
        solid: {
          ...themeData.components.button.solid,
          textColor: 'theme-color/2/dark',
        },
      },
    },
  };
}

function normalizeLegacyReaderRecipes(recipes?: ReaderThemeRecipes): ReaderThemeRecipes | undefined {
  if (!recipes) return recipes;

  if (
    recipes.controls?.chromeActiveTab?.text !== 'semantic/reader/tonal-text-secondary' ||
    recipes.controls?.supportControlStrong?.text !== 'semantic/reader/contrast-on-fill-text'
  ) {
    return recipes;
  }

  return {
    ...recipes,
    controls: {
      ...recipes.controls,
      chromeActiveTab: {
        ...recipes.controls.chromeActiveTab,
        text: 'semantic/reader/contrast-on-fill-text',
      },
    },
  };
}

function resolveScopedThemeSettings(
  settings: ScopedThemeSettings,
  fallbackPreset: ResolvedScopedThemeSettings['activePresetId']
): ResolvedScopedThemeSettings {
  return {
    data: normalizeLegacyContrastTextToken(settings.data),
    activePresetId: settings.activePresetId ?? fallbackPreset,
    recipes: normalizeLegacyReaderRecipes(settings.recipes),
  };
}

/** Firestore can hold a partial `data` object; building CSS from it throws or yields broken vars. */
export function isThemeDataViable(data: StructuredThemeData | null | undefined): boolean {
  if (!data?.palette?.length || !data.themeColors?.length) return false;
  const hasBg = data.themeColors.some((color) => color.id === 1);
  const hasText = data.themeColors.some((color) => color.id === 2);
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
  data: LegacyFlatThemeData | null | undefined,
  fallback: ResolvedScopedThemeSettings
): ResolvedScopedThemeSettings {
  if (!isThemeDataViable(data)) return fallback;
  const { activePresetId, recipes, ...rawThemeData } = data;

  return {
    data: normalizeLegacyContrastTextToken(rawThemeData as StructuredThemeData),
    activePresetId:
      activePresetId === 'journal' ||
      activePresetId === 'editorial' ||
      activePresetId === 'admin' ||
      activePresetId === 'custom'
        ? activePresetId
        : fallback.activePresetId ?? 'custom',
    recipes: normalizeLegacyReaderRecipes(recipes) ?? fallback.recipes,
  };
}

export function normalizeThemeDocument(data: unknown): ResolvedScopedThemeDocumentData {
  const defaultScoped = getDefaultScopedThemeDocument();
  const fallback: ResolvedScopedThemeDocumentData = {
    version: 2,
    reader: resolveScopedThemeSettings(defaultScoped.reader, 'journal'),
    admin: resolveScopedThemeSettings(defaultScoped.admin, 'admin'),
  };

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
    reader: themeSettingsFromFlat(data as LegacyFlatThemeData | null | undefined, fallback.reader),
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

  return { version: 2, reader, admin };
}
