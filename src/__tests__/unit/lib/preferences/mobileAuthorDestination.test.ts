import {
  MOBILE_AUTHOR_DESTINATIONS,
  parseMobileAuthorDestination,
  readStoredMobileAuthorDestination,
  resolveMobileStudioPresentation,
  writeStoredMobileAuthorDestination,
} from '@/lib/preferences/mobileAuthorDestination';
import {
  BROWSER_PREFERENCE_KEYS,
  type BrowserPreferenceStorage,
} from '@/lib/preferences/browserPreferences';

function createStorage(seed?: Record<string, string>): BrowserPreferenceStorage {
  const values = new Map(Object.entries(seed ?? {}));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('mobileAuthorDestination', () => {
  it('recognizes only the five supported mobile destinations', () => {
    expect(MOBILE_AUTHOR_DESTINATIONS).toEqual([
      'cards',
      'media',
      'prompts',
      'collections',
      'tags',
    ]);
    expect(parseMobileAuthorDestination('prompts')).toBe('prompts');
    expect(parseMobileAuthorDestination('questions')).toBeNull();
    expect(parseMobileAuthorDestination(null)).toBeNull();
  });

  it('persists the last mobile destination and defaults safely to Cards', () => {
    const storage = createStorage();
    expect(readStoredMobileAuthorDestination(storage)).toBe('cards');

    expect(writeStoredMobileAuthorDestination('media', storage)).toBe(true);
    expect(readStoredMobileAuthorDestination(storage)).toBe('media');

    const invalidStorage = createStorage({
      [BROWSER_PREFERENCE_KEYS.mobileAuthorDestination]: JSON.stringify('unknown'),
    });
    expect(readStoredMobileAuthorDestination(invalidStorage)).toBe('cards');
  });

  it('presents the Cards destination as a list until a Card is opened', () => {
    expect(resolveMobileStudioPresentation({ destination: 'cards', cardEditorOpen: false })).toEqual({
      paneVisibility: {
        tagsCollapsed: true,
        collectionsCollapsed: true,
        cardsCollapsed: false,
        composeCollapsed: true,
        questionsCollapsed: true,
        mediaCollapsed: true,
      },
      rightSlotCollapsed: true,
      cardsStage: 'list',
    });

    expect(resolveMobileStudioPresentation({ destination: 'cards', cardEditorOpen: true })).toEqual({
      paneVisibility: {
        tagsCollapsed: true,
        collectionsCollapsed: true,
        cardsCollapsed: true,
        composeCollapsed: false,
        questionsCollapsed: true,
        mediaCollapsed: true,
      },
      rightSlotCollapsed: false,
      cardsStage: 'compose',
    });
  });

  it.each([
    ['media', 'mediaCollapsed', false],
    ['prompts', 'questionsCollapsed', false],
    ['collections', 'collectionsCollapsed', true],
    ['tags', 'tagsCollapsed', true],
  ] as const)('shows only the %s destination pane', (destination, visibleKey, rightSlotCollapsed) => {
    const presentation = resolveMobileStudioPresentation({
      destination,
      cardEditorOpen: false,
    });
    const visiblePaneCount = Object.values(presentation.paneVisibility).filter((collapsed) => !collapsed).length;

    expect(presentation.paneVisibility[visibleKey]).toBe(false);
    expect(visiblePaneCount).toBe(1);
    expect(presentation.rightSlotCollapsed).toBe(rightSlotCollapsed);
    expect(presentation.cardsStage).toBeNull();
  });
});
