import React from 'react';
import { render, screen } from '@testing-library/react';
import CardFeedV2 from '@/components/view/CardFeedV2';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';
import { useReaderSidebar } from '@/components/common/ReaderSidebarContext';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'viewer' } } }),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: jest.fn(),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: jest.fn(),
}));

jest.mock('@/components/common/ReaderSidebarContext', () => ({
  useReaderSidebar: jest.fn(),
}));

jest.mock('@/components/view/CollectionIntroduction', () => ({
  __esModule: true,
  hasCollectionIntroduction: (card: { subtitle?: string } | null) => Boolean(card?.subtitle),
  default: ({ card }: { card: { title?: string; subtitle?: string } }) => (
    <section aria-label={`${card.title || 'Collection'} introduction`}>{card.subtitle}</section>
  ),
}));

jest.mock('@/components/view/V2ContentCard', () => ({
  __esModule: true,
  default: ({ card }: { card: { title?: string } }) => <article>{card.title}</article>,
}));

const mockedUseCardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;
const mockedUseTag = useTag as jest.MockedFunction<typeof useTag>;
const mockedUseReaderSidebar = useReaderSidebar as jest.MockedFunction<typeof useReaderSidebar>;
const openFeedDimension = jest.fn();

function mockContext(overrides: Partial<ReturnType<typeof useCardContext>> = {}) {
  mockedUseCardContext.mockReturnValue({
    clearFilters: jest.fn(),
    selectedTags: [],
    isFeedCardTypesFilterActive: false,
    searchTerm: '',
    activeDimension: 'collections',
    collectionId: 'collection-b',
    collectionPathIds: [],
    collectionTreeCards: [],
    activeCollectionIntroductionCard: null,
    readerMode: 'guided',
    readerTagFilterScope: 'all',
    isGuidedCollectionTransition: false,
    guidedTransitionTitle: null,
    ...overrides,
  } as ReturnType<typeof useCardContext>);
}

describe('CardFeedV2 guided transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTag.mockReturnValue({ tags: [] } as never);
    mockedUseReaderSidebar.mockReturnValue({ openFeedDimension });
  });

  it('shows a guided transition instead of stale cards while collection selection loads', () => {
    mockContext({
      isGuidedCollectionTransition: true,
      guidedTransitionTitle: 'Family Stories',
    });

    render(
      <CardFeedV2
        cards={[{ docId: 'old-card', title: 'Old Collection Card' } as never]}
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
    mockContext({ activeDimension: 'who', readerMode: 'freeform' });

    const { container } = render(
      <CardFeedV2
        cards={[{ docId: 'card-1', title: 'Story One' } as never]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(container.querySelector('[data-feed-virtualization="css-containment"]')).toBeTruthy();
    expect(screen.getByText('Story One')).toBeInTheDocument();
  });

  it('shows a stable Feed title, single-author archive label, and four-dimensional summary', () => {
    mockedUseTag.mockReturnValue({
      tags: [
        { docId: 'who-1', name: 'Charlie', dimension: 'who' },
        { docId: 'where-1', name: 'Nashville', dimension: 'where' },
      ],
    } as never);
    mockContext({
      activeDimension: 'who',
      readerMode: 'freeform',
      selectedTags: ['who-1', 'where-1'],
    });

    render(
      <CardFeedV2
        cards={[{ docId: 'card-1', title: 'Story One' } as never]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: 'Feed' })).toBeVisible();
    expect(screen.getByText('Stories from')).toBeVisible();
    expect(screen.getByText('This archive')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open Who filters' })).toHaveTextContent('Charlie');
    expect(screen.getByRole('button', { name: 'Open Where filters' })).toHaveTextContent('Nashville');
    expect(screen.getByRole('button', { name: 'Open What filters' })).toHaveTextContent('All');
    expect(screen.getByRole('button', { name: 'Open When filters' })).toHaveTextContent('All');
  });

  it('opens the existing sidebar on the selected Feed dimension', () => {
    mockContext({ activeDimension: 'who', readerMode: 'freeform' });

    render(
      <CardFeedV2
        cards={[]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    screen.getByRole('button', { name: 'Open What filters' }).click();
    expect(openFeedDimension).toHaveBeenCalledWith('what');
    expect(screen.getByRole('heading', { name: 'Feed' })).toBeVisible();
  });

  it('does not expose Feed context in the bare Reader Home suspense fallback', () => {
    mockContext({ activeDimension: 'who', readerMode: 'freeform' });

    render(
      <CardFeedV2
        cards={[]}
        loading
        showFeedContext={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.queryByRole('heading', { name: 'Feed' })).toBeNull();
    expect(screen.getByText('Loading...')).toBeVisible();
  });

  it('shows the selected Collection path, title, and child count', () => {
    mockContext({
      collectionId: 'chapter-1',
      collectionPathIds: ['root-1', 'chapter-1'],
      collectionTreeCards: [
        { docId: 'root-1', title: 'My Life', isCollectionRoot: true, childrenIds: ['chapter-1'] } as never,
        { docId: 'chapter-1', title: 'School Years', childrenIds: ['story-1'] } as never,
      ],
    });

    render(
      <CardFeedV2
        cards={[{ docId: 'story-1', title: 'First Day' } as never]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Collection breadcrumb' })).toHaveTextContent('My Life');
    expect(screen.getByRole('heading', { name: 'School Years' })).toBeVisible();
    expect(screen.getByText('1 card')).toBeVisible();
  });

  it('keeps Collection context visible when the selected section is empty', () => {
    mockContext({
      collectionId: 'chapter-1',
      collectionPathIds: ['root-1', 'chapter-1'],
      collectionTreeCards: [
        { docId: 'root-1', title: 'My Life', isCollectionRoot: true, childrenIds: ['chapter-1'] } as never,
        { docId: 'chapter-1', title: 'School Years', childrenIds: [] } as never,
      ],
    });

    render(
      <CardFeedV2
        cards={[]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: 'School Years' })).toBeVisible();
    expect(screen.getByText('0 cards')).toBeVisible();
    expect(screen.getByText('No cards match the current view.')).toBeVisible();
  });

  it('renders the selected parent introduction in context without adding it to the child feed', () => {
    mockContext({
      collectionId: 'chapter-1',
      collectionPathIds: ['root-1', 'chapter-1'],
      collectionTreeCards: [
        { docId: 'root-1', title: 'My Life', isCollectionRoot: true, childrenIds: ['chapter-1'] } as never,
        { docId: 'chapter-1', title: 'School Years', childrenIds: ['story-1'] } as never,
      ],
      activeCollectionIntroductionCard: {
        docId: 'chapter-1',
        title: 'School Years',
        subtitle: 'The people and places that shaped those years',
        content: '',
        childrenIds: ['story-1'],
      } as never,
    });

    render(
      <CardFeedV2
        cards={[{ docId: 'story-1', title: 'First Day' } as never]}
        loading={false}
        loadMoreRef={() => {}}
        onSaveScrollPosition={() => {}}
      />
    );

    expect(screen.getByLabelText('School Years introduction')).toHaveTextContent(
      'The people and places that shaped those years'
    );
    expect(screen.getAllByText('School Years')).toHaveLength(1);
    expect(screen.getByText('First Day')).toBeVisible();
  });
});
