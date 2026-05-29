import {
  BROWSER_PREFERENCE_KEYS,
  readJsonBrowserPreference,
  writeJsonBrowserPreference,
  type BrowserPreferenceStorage,
} from '@/lib/preferences/browserPreferences';

describe('browserPreferences', () => {
  function createStorage(seed?: Record<string, string>): BrowserPreferenceStorage {
    const map = new Map<string, string>(Object.entries(seed ?? {}));
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
  }

  it('reads a JSON preference through a supplied parser', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout]: JSON.stringify({ ok: true }),
    });

    const value = readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout, {
      storage,
      parse: (raw) => (raw && typeof raw === 'object' && 'ok' in raw ? raw as { ok: boolean } : null),
    });

    expect(value).toEqual({ ok: true });
  });

  it('writes a JSON preference to storage', () => {
    const storage = createStorage();
    const didWrite = writeJsonBrowserPreference(
      BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout,
      { ok: true },
      { storage }
    );

    expect(didWrite).toBe(true);
    expect(
      readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout, {
        storage,
        parse: (raw) => (raw && typeof raw === 'object' && 'ok' in raw ? raw as { ok: boolean } : null),
      })
    ).toEqual({ ok: true });
  });
});
