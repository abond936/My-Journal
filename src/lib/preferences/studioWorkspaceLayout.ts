import {
  BROWSER_PREFERENCE_KEYS,
  getBrowserPreferenceStorage,
  readJsonBrowserPreference,
  writeJsonBrowserPreference,
  type BrowserPreferenceStorage,
} from '@/lib/preferences/browserPreferences';

const LEGACY_STUDIO_CARD_EDIT_WIDTH_KEY = 'studioCardEditPaneWidth';
const LEGACY_STUDIO_QUESTIONS_WIDTH_KEY = 'studioQuestionsPaneWidth';
const LEGACY_STUDIO_PANE_VISIBILITY_KEY = 'studioPaneVisibility';
const VIEWPORT_DELTA_FOR_RATIO_PX = 120;

export type StudioPaneVisibility = {
  organizationCollapsed: boolean;
  cardsCollapsed: boolean;
  composeCollapsed: boolean;
  questionsCollapsed: boolean;
  mediaCollapsed: boolean;
};

export type StudioPaneWidthPreference = {
  px: number;
  ratio: number | null;
  viewportWidth: number | null;
  updatedAt: number | null;
};

export type StudioWorkspaceLayoutPreferences = {
  composeWidth: StudioPaneWidthPreference | null;
  questionsWidth: StudioPaneWidthPreference | null;
  paneVisibility: StudioPaneVisibility;
};

export const DEFAULT_STUDIO_PANE_VISIBILITY: StudioPaneVisibility = {
  organizationCollapsed: true,
  cardsCollapsed: false,
  composeCollapsed: false,
  questionsCollapsed: false,
  mediaCollapsed: false,
};

export const DEFAULT_STUDIO_WORKSPACE_LAYOUT_PREFERENCES: StudioWorkspaceLayoutPreferences = {
  composeWidth: null,
  questionsWidth: null,
  paneVisibility: DEFAULT_STUDIO_PANE_VISIBILITY,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizePaneVisibility(value: unknown): StudioPaneVisibility {
  if (!value || typeof value !== 'object') return DEFAULT_STUDIO_PANE_VISIBILITY;
  const candidate = value as Partial<Record<keyof StudioPaneVisibility, unknown>>;
  const defaults = DEFAULT_STUDIO_PANE_VISIBILITY;

  return {
    organizationCollapsed:
      typeof candidate.organizationCollapsed === 'boolean'
        ? candidate.organizationCollapsed
        : defaults.organizationCollapsed,
    cardsCollapsed:
      typeof candidate.cardsCollapsed === 'boolean'
        ? candidate.cardsCollapsed
        : defaults.cardsCollapsed,
    composeCollapsed:
      typeof candidate.composeCollapsed === 'boolean'
        ? candidate.composeCollapsed
        : defaults.composeCollapsed,
    questionsCollapsed:
      typeof candidate.questionsCollapsed === 'boolean'
        ? candidate.questionsCollapsed
        : defaults.questionsCollapsed,
    mediaCollapsed:
      typeof candidate.mediaCollapsed === 'boolean'
        ? candidate.mediaCollapsed
        : defaults.mediaCollapsed,
  };
}

function normalizePaneWidthPreference(value: unknown): StudioPaneWidthPreference | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof StudioPaneWidthPreference, unknown>>;
  if (!isFiniteNumber(candidate.px)) return null;

  return {
    px: Math.round(candidate.px),
    ratio: isFiniteNumber(candidate.ratio) && candidate.ratio > 0 ? candidate.ratio : null,
    viewportWidth: isFiniteNumber(candidate.viewportWidth) && candidate.viewportWidth > 0
      ? Math.round(candidate.viewportWidth)
      : null,
    updatedAt: isFiniteNumber(candidate.updatedAt) && candidate.updatedAt > 0
      ? Math.round(candidate.updatedAt)
      : null,
  };
}

function parseStudioWorkspaceLayoutPreferences(value: unknown): StudioWorkspaceLayoutPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof StudioWorkspaceLayoutPreferences, unknown>>;

  return {
    composeWidth: normalizePaneWidthPreference(candidate.composeWidth),
    questionsWidth: normalizePaneWidthPreference(candidate.questionsWidth),
    paneVisibility: normalizePaneVisibility(candidate.paneVisibility),
  };
}

function readLegacyPaneWidthPreference(
  storage: BrowserPreferenceStorage,
  key: string
): StudioPaneWidthPreference | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const width = Number.parseInt(raw, 10);
    if (!Number.isFinite(width)) return null;
    return {
      px: Math.round(width),
      ratio: null,
      viewportWidth: null,
      updatedAt: null,
    };
  } catch {
    return null;
  }
}

function readLegacyPaneVisibility(storage: BrowserPreferenceStorage): StudioPaneVisibility | null {
  try {
    const raw = storage.getItem(LEGACY_STUDIO_PANE_VISIBILITY_KEY);
    if (!raw) return null;
    return normalizePaneVisibility(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function readStoredStudioWorkspaceLayoutPreferences(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): StudioWorkspaceLayoutPreferences {
  if (!storage) return DEFAULT_STUDIO_WORKSPACE_LAYOUT_PREFERENCES;

  const stored = readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout, {
    parse: parseStudioWorkspaceLayoutPreferences,
    storage,
  });
  if (stored) return stored;

  return {
    composeWidth: readLegacyPaneWidthPreference(storage, LEGACY_STUDIO_CARD_EDIT_WIDTH_KEY),
    questionsWidth: readLegacyPaneWidthPreference(storage, LEGACY_STUDIO_QUESTIONS_WIDTH_KEY),
    paneVisibility: readLegacyPaneVisibility(storage) ?? DEFAULT_STUDIO_PANE_VISIBILITY,
  };
}

export function writeStoredStudioWorkspaceLayoutPreferences(
  preferences: StudioWorkspaceLayoutPreferences,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.studioWorkspaceLayout,
    {
      composeWidth: normalizePaneWidthPreference(preferences.composeWidth),
      questionsWidth: normalizePaneWidthPreference(preferences.questionsWidth),
      paneVisibility: normalizePaneVisibility(preferences.paneVisibility),
    },
    { storage }
  );
}

export function createStudioPaneWidthPreference(
  widthPx: number,
  options: {
    rowWidth: number;
    viewportWidth: number;
  }
): StudioPaneWidthPreference {
  const px = Math.round(widthPx);
  const ratio = options.rowWidth > 0 ? px / options.rowWidth : null;

  return {
    px,
    ratio: ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : null,
    viewportWidth: options.viewportWidth > 0 ? Math.round(options.viewportWidth) : null,
    updatedAt: Date.now(),
  };
}

export function resolveStudioPaneWidthPreference(
  preference: StudioPaneWidthPreference | null | undefined,
  options: {
    rowWidth: number;
    viewportWidth: number;
    minPx: number;
    maxPx: number;
    fallbackPx: number;
  }
): number {
  if (!preference) return clamp(options.fallbackPx, options.minPx, options.maxPx);

  const shouldUseRatio =
    preference.ratio != null &&
    preference.viewportWidth != null &&
    Math.abs(options.viewportWidth - preference.viewportWidth) >= VIEWPORT_DELTA_FOR_RATIO_PX &&
    options.rowWidth > 0;

  const candidate = shouldUseRatio ? Math.round(options.rowWidth * preference.ratio) : preference.px;
  return clamp(candidate, options.minPx, options.maxPx);
}
