import {
  BROWSER_PREFERENCE_KEYS,
  getBrowserPreferenceStorage,
  readJsonBrowserPreference,
  writeJsonBrowserPreference,
  type BrowserPreferenceStorage,
} from '@/lib/preferences/browserPreferences';
import type { StudioPaneVisibility } from '@/lib/preferences/studioWorkspaceLayout';

export const MOBILE_AUTHOR_DESTINATIONS = [
  'cards',
  'media',
  'prompts',
  'collections',
  'tags',
] as const;

export type MobileAuthorDestination = (typeof MOBILE_AUTHOR_DESTINATIONS)[number];

export type MobileStudioPresentation = {
  paneVisibility: StudioPaneVisibility;
  rightSlotCollapsed: boolean;
  cardsStage: 'list' | 'compose' | null;
};

export function parseMobileAuthorDestination(value: unknown): MobileAuthorDestination | null {
  return typeof value === 'string' &&
    MOBILE_AUTHOR_DESTINATIONS.includes(value as MobileAuthorDestination)
    ? (value as MobileAuthorDestination)
    : null;
}

export function readStoredMobileAuthorDestination(
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): MobileAuthorDestination {
  return readJsonBrowserPreference(BROWSER_PREFERENCE_KEYS.mobileAuthorDestination, {
    storage,
    parse: parseMobileAuthorDestination,
  }) ?? 'cards';
}

export function writeStoredMobileAuthorDestination(
  destination: MobileAuthorDestination,
  storage: BrowserPreferenceStorage | null = getBrowserPreferenceStorage()
): boolean {
  return writeJsonBrowserPreference(
    BROWSER_PREFERENCE_KEYS.mobileAuthorDestination,
    destination,
    { storage }
  );
}

export function resolveMobileStudioPresentation(args: {
  destination: MobileAuthorDestination;
  cardEditorOpen: boolean;
}): MobileStudioPresentation {
  const collapsed: StudioPaneVisibility = {
    tagsCollapsed: true,
    collectionsCollapsed: true,
    cardsCollapsed: true,
    composeCollapsed: true,
    questionsCollapsed: true,
    mediaCollapsed: true,
  };

  switch (args.destination) {
    case 'cards':
      if (args.cardEditorOpen) {
        return {
          paneVisibility: { ...collapsed, composeCollapsed: false },
          rightSlotCollapsed: false,
          cardsStage: 'compose',
        };
      }
      return {
        paneVisibility: { ...collapsed, cardsCollapsed: false },
        rightSlotCollapsed: true,
        cardsStage: 'list',
      };
    case 'media':
      return {
        paneVisibility: { ...collapsed, mediaCollapsed: false },
        rightSlotCollapsed: false,
        cardsStage: null,
      };
    case 'prompts':
      return {
        paneVisibility: { ...collapsed, questionsCollapsed: false },
        rightSlotCollapsed: false,
        cardsStage: null,
      };
    case 'collections':
      return {
        paneVisibility: { ...collapsed, collectionsCollapsed: false },
        rightSlotCollapsed: true,
        cardsStage: null,
      };
    case 'tags':
      return {
        paneVisibility: { ...collapsed, tagsCollapsed: false },
        rightSlotCollapsed: true,
        cardsStage: null,
      };
  }
}
