import {
  DEFAULT_STUDIO_PANE_VISIBILITY,
  createStudioPaneWidthPreference,
  readStoredStudioWorkspaceLayoutPreferences,
  resolveStudioPaneWidthPreference,
  writeStoredStudioWorkspaceLayoutPreferences,
  type StudioWorkspaceLayoutPreferences,
} from '@/lib/preferences/studioWorkspaceLayout';
import { BROWSER_PREFERENCE_KEYS, type BrowserPreferenceStorage } from '@/lib/preferences/browserPreferences';

describe('studioWorkspaceLayout', () => {
  function createStorage(seed?: Record<string, string>): BrowserPreferenceStorage {
    const map = new Map<string, string>(Object.entries(seed ?? {}));
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
  }

  it('reads the new namespaced Studio layout preference shape', () => {
    const storage = createStorage({
      [BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout]: JSON.stringify({
        composeWidth: { px: 360, ratio: 0.3, viewportWidth: 1440, updatedAt: 100 },
        questionsWidth: { px: 280, ratio: 0.2, viewportWidth: 1440, updatedAt: 101 },
        paneVisibility: { composeCollapsed: true, mediaCollapsed: true },
      }),
    });

    expect(readStoredStudioWorkspaceLayoutPreferences(storage)).toEqual({
      composeWidth: { px: 360, ratio: 0.3, viewportWidth: 1440, updatedAt: 100 },
      questionsWidth: { px: 280, ratio: 0.2, viewportWidth: 1440, updatedAt: 101 },
      paneVisibility: {
        ...DEFAULT_STUDIO_PANE_VISIBILITY,
        composeCollapsed: true,
        mediaCollapsed: true,
      },
    });
  });

  it('falls back to legacy Studio storage keys when the new key is absent', () => {
    const storage = createStorage({
      studioCardEditPaneWidth: '420',
      studioQuestionsPaneWidth: '300',
      studioPaneVisibility: JSON.stringify({ cardsCollapsed: true }),
    });

    expect(readStoredStudioWorkspaceLayoutPreferences(storage)).toEqual({
      composeWidth: { px: 420, ratio: null, viewportWidth: null, updatedAt: null },
      questionsWidth: { px: 300, ratio: null, viewportWidth: null, updatedAt: null },
      paneVisibility: {
        ...DEFAULT_STUDIO_PANE_VISIBILITY,
        cardsCollapsed: true,
      },
    });
  });

  it('uses the saved pixel width when the viewport is effectively unchanged', () => {
    const pref = createStudioPaneWidthPreference(420, { rowWidth: 1200, viewportWidth: 1440 });

    expect(
      resolveStudioPaneWidthPreference(pref, {
        rowWidth: 900,
        viewportWidth: 1490,
        minPx: 220,
        maxPx: 900,
        fallbackPx: 357,
      })
    ).toBe(420);
  });

  it('uses the saved ratio when the viewport meaningfully changes', () => {
    const pref = createStudioPaneWidthPreference(420, { rowWidth: 1200, viewportWidth: 1440 });

    expect(
      resolveStudioPaneWidthPreference(pref, {
        rowWidth: 900,
        viewportWidth: 1100,
        minPx: 220,
        maxPx: 900,
        fallbackPx: 357,
      })
    ).toBe(315);
  });

  it('writes the normalized Studio layout preference shape', () => {
    const storage = createStorage();
    const prefs: StudioWorkspaceLayoutPreferences = {
      composeWidth: { px: 400, ratio: 0.25, viewportWidth: 1600, updatedAt: 10 },
      questionsWidth: null,
      paneVisibility: {
        ...DEFAULT_STUDIO_PANE_VISIBILITY,
        organizationCollapsed: false,
      },
    };

    const didWrite = writeStoredStudioWorkspaceLayoutPreferences(prefs, storage);

    expect(didWrite).toBe(true);
    expect(readStoredStudioWorkspaceLayoutPreferences(storage)).toEqual(prefs);
  });
});
