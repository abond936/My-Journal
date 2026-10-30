import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GlobalSidebar from '@/components/common/GlobalSidebar';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';
import { useDurableCollectionReader } from '@/components/view/useDurableCollectionReader';

const replace = jest.fn();
const push = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/view',
  useSearchParams: () => new URLSearchParams('mode=guided'),
  useRouter: () => ({ replace, push }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'viewer', id: 'viewer-1' } } }),
}));

jest.mock('@/components/providers/CardProvider', () => ({ useCardContext: jest.fn() }));
jest.mock('@/components/providers/TagProvider', () => ({ useTag: jest.fn() }));
jest.mock('@/components/common/TagTree', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/view/useDurableCollectionReader', () => ({ useDurableCollectionReader: jest.fn() }));

const mockedUseCardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;
const mockedUseTag = useTag as jest.MockedFunction<typeof useTag>;
const mockedUseDurableCollectionReader = useDurableCollectionReader as jest.MockedFunction<
  typeof useDurableCollectionReader
>;

describe('GlobalSidebar Collection navigation', () => {
  const setCollectionId = jest.fn();
  const setCollectionPathIds = jest.fn();
  const setActiveDimension = jest.fn();

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockedUseTag.mockReturnValue({
      tags: [],
      loading: false,
      selectedFilterTagIds: [],
      setFilterTags: jest.fn(),
      studioCardFilterTagIds: [],
      setStudioCardFilterTagIds: jest.fn(),
      dimensionTree: { who: [], what: [], when: [], where: [] },
    } as never);
    mockedUseDurableCollectionReader.mockReturnValue({
      collections: [],
      collectionId: null,
      selectedPlacementId: null,
      structure: null,
      loading: false,
      error: null,
      hasDurableCollections: false,
    });
    mockedUseCardContext.mockReturnValue({
      feedCardTypes: new Set(['story']),
      toggleFeedCardType: jest.fn(),
      activeDimension: 'collections',
      readerMode: 'guided',
      setReaderMode: jest.fn(),
      browseTarget: 'cards',
      setBrowseTarget: jest.fn(),
      setActiveDimension,
      collectionId: null,
      setCollectionId,
      setCollectionPathIds,
      collectionCards: [{ docId: 'root-1' }],
      collectionTreeCards: [
        { docId: 'root-1', title: 'My Life', status: 'published', isCollectionRoot: true, childrenIds: ['chapter-1'] },
        { docId: 'chapter-1', title: 'School Years', status: 'published', childrenIds: ['story-1'] },
        { docId: 'story-1', title: 'First Day', status: 'published', childrenIds: [] },
      ],
      collectionsLoading: false,
      collectionsReady: true,
      collectionsError: null,
      feedSort: 'random',
      setFeedSort: jest.fn(),
      refreshRandomOrder: jest.fn(),
      includeSubTagsInFeed: false,
      setIncludeSubTagsInFeed: jest.fn(),
      readerTagFilterScope: 'all',
      setReaderTagFilterScope: jest.fn(),
      tagSelectionMode: 'any',
      setTagSelectionMode: jest.fn(),
      clearFilters: jest.fn(),
    } as never);
  });

  it('uses separate generous disclosure and row-selection controls', async () => {
    const onRequestClose = jest.fn();
    render(<GlobalSidebar isOpen onRequestClose={onRequestClose} />);

    const expandRoot = screen.getByRole('button', { name: 'Collapse My Life' });
    expect(expandRoot).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^School Years/ })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /^School Years/ }));

    expect(setActiveDimension).toHaveBeenCalledWith('collections');
    expect(setCollectionPathIds).toHaveBeenCalledWith(['root-1', 'chapter-1']);
    expect(setCollectionId).toHaveBeenCalledWith('chapter-1');
    expect(onRequestClose).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^School Years/ })).toHaveAttribute(
      'data-collection-level',
      '1'
    );

    fireEvent.click(expandRoot);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^School Years/ })).toBeNull());
  });

  it('uses placement identity for the active durable Collection tree', () => {
    mockedUseDurableCollectionReader.mockReturnValue({
      collections: [{ docId: 'my-life', title: 'My Life' } as never],
      collectionId: 'my-life',
      selectedPlacementId: null,
      structure: {
        collection: { docId: 'my-life', title: 'My Life' } as never,
        placements: [
          { docId: 'chapter-placement', collectionId: 'my-life', cardId: 'chapter-card', role: 'chapter', order: 10 } as never,
          { docId: 'story-placement', collectionId: 'my-life', cardId: 'story-card', parentPlacementId: 'chapter-placement', role: 'card', order: 10 } as never,
        ],
        cards: [
          { docId: 'chapter-card', title: 'School Years' },
          { docId: 'story-card', title: 'First Day' },
        ],
      },
      loading: false,
      error: null,
      hasDurableCollections: true,
    });
    render(<GlobalSidebar isOpen />);

    fireEvent.click(screen.getByRole('button', { name: /^School Years/ }));
    expect(push).toHaveBeenCalledWith('/view?mode=guided&collection=my-life&placement=chapter-placement');
    expect(screen.getByRole('button', { name: /^School Years/ })).toHaveAttribute(
      'data-placement-id',
      'chapter-placement'
    );
  });
});
