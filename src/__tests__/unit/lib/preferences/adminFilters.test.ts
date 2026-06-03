import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES,
  DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES,
  DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES,
  DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES,
  readStoredMediaAdminLocalFilterPreferences,
  readStoredMediaAdminStoredFilterPreferences,
  readStoredStudioCardBankLocalFilterPreferences,
  readStoredStudioCardBankSharedFilterPreferences,
  writeStoredMediaAdminLocalFilterPreferences,
  writeStoredMediaAdminStoredFilterPreferences,
  writeStoredStudioCardBankLocalFilterPreferences,
  writeStoredStudioCardBankSharedFilterPreferences,
} from '@/lib/preferences/adminFilters';
import { BROWSER_PREFERENCE_KEYS, type BrowserPreferenceStorage } from '@/lib/preferences/browserPreferences';

describe('adminFilters preferences', () => {
  function createStorage(seed?: Record<string, string>): BrowserPreferenceStorage {
    const map = new Map<string, string>(Object.entries(seed ?? {}));
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
  }

  it('reads Studio card-bank shared filters with defaults for missing values', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.studioCardBankSharedFilters]: JSON.stringify({ search: 'summer' }),
    });

    expect(readStoredStudioCardBankSharedFilterPreferences(storage)).toEqual({
      ...DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES,
      search: 'summer',
    });
  });

  it('reads Studio card-bank local filters and normalizes invalid values', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.studioCardBankLocalFilters]: JSON.stringify({
        typeFilter: 'gallery',
        displayModeFilter: 'invalid',
        filterTagIds: ['tag-1', '', 4],
        dimensionFilters: {
          who: { mode: 'matches', tagId: 'tag-who' },
          what: { mode: 'bad-mode', tagId: 'tag-what' },
        },
      }),
    });

    expect(readStoredStudioCardBankLocalFilterPreferences(storage)).toEqual({
      typeFilter: 'gallery',
      displayModeFilter: 'all',
      filterTagIds: ['tag-1'],
      tagFilterScope: 'all',
      dimensionFilters: {
        who: { mode: 'matches', tagId: 'tag-who' },
        what: { mode: 'any', tagId: 'tag-what' },
        when: DEFAULT_ADMIN_DIMENSION_FILTERS.when,
        where: DEFAULT_ADMIN_DIMENSION_FILTERS.where,
      },
    });
  });

  it('reads media-admin stored filters and dimensional tag overlay', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.mediaAdminStoredFilters]: JSON.stringify({
        filters: {
          source: 'local',
          dimensions: 'portrait',
          hasCaption: 'with',
          search: 'portraits',
          assignment: 'assigned',
        },
        dimensionalQueryOverlay: {
          who: ['tag-1'],
          where: ['tag-2', 'tag-3'],
        },
      }),
    });

    expect(readStoredMediaAdminStoredFilterPreferences(storage)).toEqual({
      filters: {
        source: 'local',
        dimensions: 'portrait',
        hasCaption: 'with',
        search: 'portraits',
        assignment: 'assigned',
        tagScope: 'all',
      },
      dimensionalQueryOverlay: {
        who: ['tag-1'],
        where: ['tag-2', 'tag-3'],
      },
    });
  });

  it('reads media-admin local filters and falls back safely', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.mediaAdminLocalFilters]: JSON.stringify({
        duplicateTriageMode: true,
        dimensionFilters: {
          when: { mode: 'isEmpty', tagId: 'ignored' },
        },
      }),
    });

    expect(readStoredMediaAdminLocalFilterPreferences(storage)).toEqual({
      duplicateTriageMode: true,
      dimensionFilters: {
        who: DEFAULT_ADMIN_DIMENSION_FILTERS.who,
        what: DEFAULT_ADMIN_DIMENSION_FILTERS.what,
        when: { mode: 'isEmpty', tagId: 'ignored' },
        where: DEFAULT_ADMIN_DIMENSION_FILTERS.where,
      },
    });
  });

  it('writes all admin filter preference shapes', () => {
    const storage = createStorage();

    expect(writeStoredStudioCardBankSharedFilterPreferences(DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES, storage)).toBe(true);
    expect(writeStoredStudioCardBankLocalFilterPreferences(DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES, storage)).toBe(true);
    expect(writeStoredMediaAdminStoredFilterPreferences(DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES, storage)).toBe(true);
    expect(writeStoredMediaAdminLocalFilterPreferences(DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES, storage)).toBe(true);

    expect(readStoredStudioCardBankSharedFilterPreferences(storage)).toEqual(DEFAULT_STUDIO_CARD_BANK_SHARED_FILTER_PREFERENCES);
    expect(readStoredStudioCardBankLocalFilterPreferences(storage)).toEqual(DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES);
    expect(readStoredMediaAdminStoredFilterPreferences(storage)).toEqual(DEFAULT_MEDIA_ADMIN_STORED_FILTER_PREFERENCES);
    expect(readStoredMediaAdminLocalFilterPreferences(storage)).toEqual(DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES);
  });
});
