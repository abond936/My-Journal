export type BrowserPreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const BROWSER_PREFERENCE_KEYS = {
  studioWorkspaceLayout: 'myjournal:studio:workspace-layout:v1',
} as const;

export function getBrowserPreferenceStorage(): BrowserPreferenceStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readJsonBrowserPreference<T>(
  key: string,
  options: {
    parse: (value: unknown) => T | null;
    storage?: BrowserPreferenceStorage | null;
  }
): T | null {
  const storage = options.storage ?? getBrowserPreferenceStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return options.parse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeJsonBrowserPreference<T>(
  key: string,
  value: T,
  options?: {
    storage?: BrowserPreferenceStorage | null;
  }
): boolean {
  const storage = options?.storage ?? getBrowserPreferenceStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
