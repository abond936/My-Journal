import React from 'react';
import { render, screen } from '@testing-library/react';
import CardFeedV2 from '@/components/view/CardFeedV2';
import { useCardContext } from '@/components/providers/CardProvider';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'viewer' } } }),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: jest.fn(),
}));

jest.mock('@/components/view/V2ContentCard', () => ({
  __esModule: true,
  default: ({ card }: { card: { title?: string } }) => <article>{card.title}</article>,
}));

const mockedUseCardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;

function mockContext(overrides: Partial<ReturnType<typeof useCardContext>> = {}) {
  mockedUseCardContext.mockReturnValue({
    clearFilters: jest.fn(),
    selectedTags: [],
    isFeedCardTypesFilterActive: false,
    searchTerm: '',
    activeDimension: 'collections',
    collectionId: 'collection-b',
    collectionTreeCards: [],
    feedGroupBy: 'none',
    isGuidedCollectionTransition: false,
    guidedTransitionTitle: null,
    ...overrides,
  } as ReturnType<typeof useCardContext>);
}

describe('CardFeedV2 guided transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a guided transition instead of stale cards while collection selection loads', () => {
    mockContext({
      isGuidedCollectionTransition: true,
      guidedTransitionTitle: 'Family Stories',
    });

    render(
      <CardFeedV2
        cards={[{ docId: 'old-card', title: 'Old Collection Card' } as never]}
        sections={null}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.getByText('Loading Family Stories...')).toBeInTheDocument();
    expect(screen.getByText('The next part of the guided journal is opening.')).toBeInTheDocument();
    expect(screen.queryByText('Old Collection Card')).not.toBeInTheDocument();
  });

  it('uses CSS containment virtualization on feed grids', () => {
    mockContext({ activeDimension: 'who' });

    const { container } = render(
      <CardFeedV2
        cards={[{ docId: 'card-1', title: 'Story One' } as never]}
        sections={null}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(container.querySelector('[data-feed-virtualization="css-containment"]')).toBeTruthy();
    expect(screen.getByText('Story One')).toBeInTheDocument();
  });
});
