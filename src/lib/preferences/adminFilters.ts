import type { Card } from '@/lib/types/card';
import {
  BROWSER_PREFERENCE_KEYS,
  getBrowserPreferenceStorage,
  readJsonBrowserPreference,
  writeJsonBrowserPreference,
  type BrowserPreferenceStorage,
} from '@/lib/preferences/browserPreferences';
import { DIMENSION_KEYS, type DimensionalTagIdMap } from '@/lib/utils/tagUtils';

export type AdminDimensionKey = 'who' | 'what' | 'when' | 'where';
export type AdminDimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
export type AdminDimensionFilterState = Record<
  AdminDimensionKey,
  {
    mode: AdminDimensionFilterMode;
    tagId: string;
  }
>;

export type StudioCardBankStatusFilter = 'all' | 'draft' | 'published';
export type StudioCardBankCardTypeFilter = 'all' | NonNullable<Card['type']>;
export type StudioCardBankDisplayModeFilter = 'all' | NonNullable<Card['displayMode']>;

export type StudioCardBankSharedFilterPreferences = {
  search: string;
  statusFilter: StudioCardBankStatusFilter;
};

export type StudioCardBankLocalFilterPreferences = {
  typeFilter: StudioCardBankCardTypeFilter;
  displayModeFilter: StudioCardBankDisplayModeFilter;
  filterTagIds: string[];
  dimensionFilters: AdminDimensionFilterState;
};

export type MediaAdminStoredFilters = {
  source: string;
  dimensions: string;
  hasCaption: string;
  search: string;
  assignment: string;
};

export type MediaAdminStoredFilterPreferences = {
  filters: MediaAdminStoredFilters;
  dimensionalQueryOverlay: DimensionalTagIdMap;
};

export type MediaAdminLocalFilterPreferences = {
  duplicateTriageMode: boolean;
  dimensionFilters: AdminDimensionFilterState;
};

const STUDIO_CARD_BANK_STATUS_VALUES = new Set<StudioCardBankStatusFilter>(['all', 'draft', 'published']);
const STUDIO_CARD_BANK_TYPE_VALUES = new Set<StudioCardBankCardTypeFilter>([
  'all',
  'story',
  'qa',
  'quote',
  'callout',
  'gallery',
]);
const STUDIO_CARD_BANK_DISPLAY_MODE_VALUES = new Set<StudioCardBankDisplayModeFilter>([
  'all',
  'inline',
  'navigate',
  'static',
]);
const MEDIA_ADMIN_SOURCE_VALUES = new Set(['all', 'local', 'paste']);
const MEDIA_ADMIN_DIMENSION_VALUES = new Set(['all', 'portrait', 'landscape', 'square']);
const MEDIA_ADMIN_CAPTION_VALUES = new Set(['all', 'with', 'without']);
const MEDIA_ADMIN_ASSIGNMENT_VALUES = new Set(['all', 'unassigned', 'assigned']);
const ADMIN_DIMENSION_FILTER_MODE_VALUES = new Set<AdminDimensionFilterMode>(['any', 'hasAny', 'isEmpty', 'matches']);

export const DEFAULT_ADMIN_DIMENSION_FILTERS: AdminDimensionFilterState = {
  who: { mode: 'any', tagId: '' },
  what: { mode: 'any', tagId: '' },
  when: { mode: 'any', tagId: '' },
  where: { mode: 'any', tagId: '' },
};

export const DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES: StudioCardBankSharedFilterPreferences = {
  search: '',
  statusFilter: 'all',
};

export const DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES: StudioCardBankLocalFilterPreferences = {
  typeFilter: 'all',
  displayModeFilter: 'all',
  filterTagIds: [],
  dimensionFilters: DEFAULT_ADMIN_DIMENSION_FILTERS,
};

export const DEFAULT_MEDIA_ADMIN_STORED_FILTERS: MediaAdminStoredFilters = {
  source: 'all',
  dimensions: 'all',
  hasCaption: 'all',
  search: '',
  assignment: 'all',
};

export const DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES: MediaAdminStoredFilterPreferences = {
  filters: DEFAULT_MEDIA_ADMIN_STORED_FILTERS,
  dimensionalQueryOverlay: {},
};

export const DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES: MediaAdminLocalFilterPreferences = {
  duplicateTriageMode: false,
  dimensionFilters: DEFAULT_ADMIN_DIMENSION_FILTERS,
};

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeEnumValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function normalizeDimensionalTagIdMap(value: unknown): DimensionalTagIdMap {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as Partial<Record<AdminDimensionKey, unknown>>;
  const next: DimensionalTagIdMap = {};
  for (const dimension of DIMENSION_KEYS) {
    const ids = normalizeStringArray(candidate[dimension]);
    if (ids.length > 0) {
      next[dimension] = ids;
    }
  }
  return next;
}

function normalizeAdminDimensionFilterEntry(
  value: unknown,
  fallback: AdminDimensionFilterState[AdminDimensionKey]
): AdminDimensionFilterState[AdminDimensionKey] {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<Record<'mode' | 'tagId', unknown>>;
  return {
    mode: normalizeEnumValue(candidate.mode, ADMIN_DIMENSION_FILTER_MODE_VALUES, fallback.mode),
    tagId: normalizeString(candidate.tagId),
  };
}

function normalizeAdminDimensionFilters(value: unknown): AdminDimensionFilterState {
  if (!value || typeof value !== 'object') return DEFAULT_ADMIN_DIMENSION_FILTERS;
  const candidate = value as Partial<Record<AdminDimensionKey, unknown>>;
  return {
    who: normalizeAdminDimensionFilterEntry(candidate.who, DEFAULT_ADMIN_DIMENSION_FILTERS.who),
    what: normalizeAdminDimensionFilterEntry(candidate.what, DEFAULT_ADMIN_DIMENSION_FILTERS.what),
    when: normalizeAdminDimensionFilterEntry(candidate.when, DEFAULT_ADMIN_DIMENSION_FILTERS.when),
    where: normalizeAdminDimensionFilterEntry(candidate.where, DEFAULT_ADMIN_DIMENSION_FILTERS.where),
  };
}

function parseStudioCardBankSharedFilterPreferences(value: unknown): StudioCardBankSharedFilterPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof StudioCardBankSharedFilterPreferences, unknown>>;
  return {
    search: normalizeString(candidate.search),
    statusFilter: normalizeEnumValue(candidate.statusFilter, STUDIO_CARD_BANK_STATUS_VALUES, 'all'),
  };
}

function parseStudioCardBankLocalFilterPreferences(value: unknown): StudioCardBankLocalFilterPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof StudioCardBankLocalFilterPreferences, unknown>>;
  return {
    typeFilter: normalizeEnumValue(candidate.typeFilter, STUDIO_CARD_BANK_TYPE_VALUES, 'all'),
    displayModeFilter: normalizeEnumValue(candidate.displayModeFilter, STUDIO_CARD_BANK_DISPLAY_MODE_VALUES, 'all'),
    filterTagIds: normalizeStringArray(candidate.filterTagIds),
    dimensionFilters: normalizeAdminDimensionFilters(candidate.dimensionFilters),
  };
}

function parseMediaAdminStoredFilterPreferences(value: unknown): MediaAdminStoredFilterPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof MediaAdminStoredFilterPreferences, unknown>>;
  const rawFilters =
    candidate.filters && typeof candidate.filters === 'object'
      ? (candidate.filters as Partial<Record<keyof MediaAdminStoredFilters, unknown>>)
      : {};

  return {
    filters: {
      source: normalizeEnumValue(rawFilters.source, MEDIA_ADMIN_SOURCE_VALUES, 'all'),
      dimensions: normalizeEnumValue(rawFilters.dimensions, MEDIA_ADMIN_DIMENSION_VALUES, 'all'),
      hasCaption: normalizeEnumValue(rawFilters.hasCaption, MEDIA_ADMIN_CAPTION_VALUES, 'all'),
      search: normalizeString(rawFilters.search),
      assignment: normalizeEnumValue(rawFilters.assignment, MEDIA_ADMIN_ASSIGNMENT_VALUES, 'all'),
    },
    dimensionalQueryOverlay: normalizeDimensionalTagIdMap(candidate.dimensionalQueryOverlay),
  };
}

function parseMediaAdminLocalFilterPreferences(value: unknown): MediaAdminLocalFilterPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof MediaAdminLocalFilterPreferences, unknown>>;
  return {
    duplicateTriageMode: candidate.duplicateTriageMode === true,
    dimensionFilters: normalizeAdminDimensionFilters(candidate.dimensionFilters),
  };
}

export function readStoredStudioCardBankSharedFilterPreferences(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): StudioCardBankSharedFilterPreferences {
  if (!storage) return DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES;
  return (
    readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.studioCardBankSharedFilters, {
      parse: parseStudioCardBankSharedFilterPreferences,
      storage,
    }) ?? DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES
  );
}

export function writeStoredStudioCardBankSharedFilterPreferences(
  preferences: StudioCardBankSharedFilterPreferences,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.studioCardBankSharedFilters,
    parseStudioCardBankSharedFilterPreferences(preferences) ?? DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES,
    { storage }
  );
}

export function readStoredStudioCardBankLocalFilterPreferences(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): StudioCardBankLocalFilterPreferences {
  if (!storage) return DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES;
  return (
    readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.studioCardBankLocalFilters, {
      parse: parseStudioCardBankLocalFilterPreferences,
      storage,
    }) ?? DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES
  );
}

export function writeStoredStudioCardBankLocalFilterPreferences(
  preferences: StudioCardBankLocalFilterPreferences,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.studioCardBankLocalFilters,
    parseStudioCardBankLocalFilterPreferences(preferences) ?? DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES,
    { storage }
  );
}

export function readStoredMediaAdminStoredFilterPreferences(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): MediaAdminStoredFilterPreferences {
  if (!storage) return DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES;
  return (
    readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.mediaAdminStoredFilters, {
      parse: parseMediaAdminStoredFilterPreferences,
      storage,
    }) ?? DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES
  );
}

export function writeStoredMediaAdminStoredFilterPreferences(
  preferences: MediaAdminStoredFilterPreferences,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.mediaAdminStoredFilters,
    parseMediaAdminStoredFilterPreferences(preferences) ?? DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES,
    { storage }
  );
}

export function readStoredMediaAdminLocalFilterPreferences(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): MediaAdminLocalFilterPreferences {
  if (!storage) return DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES;
  return (
    readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.mediaAdminLocalFilters, {
      parse: parseMediaAdminLocalFilterPreferences,
      storage,
    }) ?? DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES
  );
}

export function writeStoredMediaAdminLocalFilterPreferences(
  preferences: MediaAdminLocalFilterPreferences,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.mediaAdminLocalFilters,
    parseMediaAdminLocalFilterPreferences(preferences) ?? DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES,
    { storage }
  );
}
