import { render, screen } from '@testing-library/react';
import ViewRootClientPage from '@/app/view/ViewRootClientPage';
import { useCardContext } from '@/components/providers/CardProvider';
import { useDurableCollectionReader } from '@/components/view/useDurableCollectionReader';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('mode=guided&collection=my-life'),
}));
jest.mock('@/components/providers/CardProvider', () => ({ useCardContext: jest.fn() }));
jest.mock('@/components/view/useDurableCollectionReader', () => ({ useDurableCollectionReader: jest.fn() }));
jest.mock('@/components/view/DurableCollectionFeed', () => ({
  __esModule: true,
  default: ({ structure }: { structure: { collection: { title: string } } }) => (
    <div>Durable {structure.collection.title}</div>
  ),
}));
jest.mock('@/components/view/CardFeedV2', () => ({
  __esModule: true,
  default: () => <div>Legacy feed</div>,
}));
jest.mock('@/components/admin/studio/cards/AdminFAB', () => ({ __esModule: true, default: () => null }));

const cardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;
const durable = useDurableCollectionReader as jest.MockedFunction<typeof useDurableCollectionReader>;

describe('ViewRootClientPage durable Collection authority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cardContext.mockReturnValue({
      visibleCards: [], loadingMore: false, hasMore: false, loadMore: jest.fn(),
      isInitialLoading: false, isRefreshing: false, error: null, browseTarget: 'cards',
      readerMode: 'guided', setReaderMode: jest.fn(), isGuidedCollectionTransition: false,
    } as never);
  });

  it('uses the placement-native feed whenever an active durable Collection exists', () => {
    durable.mockReturnValue({
      collections: [{ docId: 'my-life', title: 'My Life' } as never],
      collectionId: 'my-life',
      selectedPlacementId: null,
      structure: { collection: { docId: 'my-life', title: 'My Life' }, placements: [], cards: [] } as never,
      loading: false,
      error: null,
      hasDurableCollections: true,
    });
    render(<ViewRootClientPage />);
    expect(screen.getByText('Durable My Life')).toBeInTheDocument();
    expect(screen.queryByText('Legacy feed')).not.toBeInTheDocument();
  });

  it('retains the legacy guided feed while no durable Collection is active', () => {
    durable.mockReturnValue({
      collections: [], collectionId: null, selectedPlacementId: null, structure: null,
      loading: false, error: null, hasDurableCollections: false,
    });
    render(<ViewRootClientPage />);
    expect(screen.getByText('Legacy feed')).toBeInTheDocument();
  });
});
