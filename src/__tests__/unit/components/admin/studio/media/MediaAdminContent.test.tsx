import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaAdminContent from '@/components/admin/studio/media/MediaAdminContent';
import { DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES } from '@/lib/preferences/adminFilters';

const useMediaMock = jest.fn();
const useStudioShellOptionalMock = jest.fn();

jest.mock('@/lib/preferences/adminFilters', () => {
  const actual = jest.requireActual('@/lib/preferences/adminFilters');
  return {
    ...actual,
    readStoredMediaAdminLocalFilterPreferences: jest.fn(() => actual.DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES),
    writeStoredMediaAdminLocalFilterPreferences: jest.fn(() => true),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  getMediaErrorSeverity: () => 'error',
  useMedia: () => useMediaMock(),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/admin/studio/media/useMediaStacks', () => ({
  useMediaStacks: () => ({
    stacks: [],
    stackById: new Map(),
    loading: false,
    refreshStacks: jest.fn(),
    createStack: jest.fn(),
    dissolveStack: jest.fn(),
  }),
}));

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShellOptional: () => useStudioShellOptionalMock(),
}));

jest.mock('@/components/admin/studio/media/MediaAdminGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="media-grid">grid</div>,
}));

jest.mock('@/components/admin/studio/media/BulkEditMediaTagsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/media/MediaLocalImportDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children?: React.ReactNode;
  }) => (isOpen ? <div>{children}</div> : null),
}));

jest.mock('@/components/admin/studio/cards/MacroTagSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/DebouncedSearchInput', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/media/MediaBrowseGroupedView', () => ({
  __esModule: true,
  default: () => <div data-testid="media-grouped-view">grouped</div>,
}));

jest.mock('@/lib/utils/reviewClusterImport', () => ({
  generateReviewClustersForImport: jest.fn(async () => undefined),
}));

jest.mock('@/components/admin/studio/media/MediaStoryPilesOverlayView', () => ({
  __esModule: true,
  default: () => <div data-testid="story-piles-overlay">overlay</div>,
}));

const baseMediaContext = {
  media: [],
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
  pagination: {
    page: 1,
    limit: 100,
    total: null,
    totalPages: null,
    seekMode: true,
    hasNext: true,
    hasPrev: false,
    nextCursor: 'next-cursor',
    prevCursor: null,
  },
  filters: {
    source: 'all',
    dimensions: 'all',
    hasCaption: 'all',
    search: '',
    assignment: 'all',
    tagScope: 'all',
  },
  setFilter: jest.fn(),
  clearFilters: jest.fn(),
  fetchMedia: jest.fn(),
  loadMore: jest.fn(async () => undefined),
  hasMore: true,
  selectedMediaIds: [],
  selectNone: jest.fn(),
  deleteMultipleMedia: jest.fn(async () => undefined),
  clearError: jest.fn(),
  setSelectedMediaIds: jest.fn(),
  dimensionalQueryOverlay: {},
  transientDimensionalQueryOverlay: {},
  setDimensionalQueryOverlay: jest.fn(),
  setTransientDimensionalQueryOverlay: jest.fn(),
  resolveMediaById: jest.fn(),
};

describe('MediaAdminContent', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    fetchMock.mockReset();
    useMediaMock.mockReturnValue(baseMediaContext);
    useStudioShellOptionalMock.mockReturnValue(null);
    const { readStoredMediaAdminLocalFilterPreferences } = jest.requireMock(
      '@/lib/preferences/adminFilters'
    ) as {
      readStoredMediaAdminLocalFilterPreferences: jest.Mock;
    };
    readStoredMediaAdminLocalFilterPreferences.mockReturnValue(
      DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES
    );
  });

  it('does not start the embedded media fetch before Studio has an active card context', () => {
    render(<MediaAdminContent embedded />);

    expect(baseMediaContext.fetchMedia).not.toHaveBeenCalled();
  });

  it('starts the embedded media fetch once Studio has an active card context', async () => {
    const fetchMedia = jest.fn();
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      pagination: null,
      fetchMedia,
    });
    useStudioShellOptionalMock.mockReturnValue({
      selectedPreview: { docId: 'card-1', title: 'Card One', type: 'story', status: 'draft' },
      selectedDetail: null,
    });

    render(<MediaAdminContent embedded />);

    await waitFor(() => {
      expect(fetchMedia).toHaveBeenCalledWith(1);
    });
  });

  it('keeps the embedded Studio pane free of the normal paging copy during smooth scrolling', () => {
    render(<MediaAdminContent embedded />);

    expect(screen.getByTestId('media-grid')).toBeInTheDocument();
    expect(screen.queryByText('Scrolling newest first')).not.toBeInTheDocument();
    expect(screen.queryByText(/filtered results continue as you scroll/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
  });

  it('collapses the bulk media action bar when nothing is selected', () => {
    render(<MediaAdminContent embedded />);

    expect(screen.queryByText(/media selected/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create card' })).not.toBeInTheDocument();
  });

  it('shows the bulk media action bar when media are selected', () => {
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      selectedMediaIds: ['media-1', 'media-2'],
    });

    render(<MediaAdminContent embedded />);

    expect(screen.getByText('2 media selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create card' })).toBeInTheDocument();
  });

  it('keeps the grid visible for operation errors and lets the user dismiss the banner', async () => {
    const clearError = jest.fn();
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      error: new Error('Failed to delete media'),
      clearError,
    });

    render(<MediaAdminContent embedded />);

    expect(screen.getByText('Failed to delete media')).toBeInTheDocument();
    expect(screen.getByTestId('media-grid')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(clearError).toHaveBeenCalled();
  });

  it('refreshes the selected Studio card after bulk delete so Compose reflects the cleaned assignments', async () => {
    const deleteMultipleMedia = jest.fn(async () => undefined);
    const loadSelectedCard = jest.fn(async () => undefined);
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      selectedMediaIds: ['media-1', 'media-2'],
      deleteMultipleMedia,
    });
    useStudioShellOptionalMock.mockReturnValue({
      selectedCardId: 'card-1',
      loadSelectedCard,
      selectedPreview: { docId: 'card-1', title: 'Card One', type: 'story', status: 'draft' },
      selectedDetail: null,
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summaries: { 'media-1': ['card-1'], 'media-2': [] } }),
    } as Response);

    render(<MediaAdminContent embedded />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/1 selected media item is used by 1 card/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]!);

    await waitFor(() => expect(deleteMultipleMedia).toHaveBeenCalledWith(['media-1', 'media-2']));
    await waitFor(() =>
      expect(loadSelectedCard).toHaveBeenCalledWith('card-1', { quiet: true })
    );
  });

  it('does not refetch the same assigned-only media records after they have already been hydrated once', async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/images/media-1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ media: { docId: 'media-1', filename: 'one.jpg' } }),
        } as Response);
      }
      if (url === '/api/images/media-2') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ media: { docId: 'media-2', filename: 'two.jpg' } }),
        } as Response);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      pagination: null,
      resolveMediaById: jest.fn(() => undefined),
    });
    useStudioShellOptionalMock.mockReturnValue({
      selectedPreview: {
        docId: 'card-1',
        title: 'Card One',
        type: 'story',
        status: 'draft',
        coverImageId: 'media-1',
        contentMedia: ['media-2'],
      },
      selectedDetail: null,
    });

    const { rerender } = render(<MediaAdminContent embedded />);
    fireEvent.click(screen.getByRole('button', { name: 'This card' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    rerender(<MediaAdminContent embedded />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('renders story piles overlay when overlay toggle is on', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ clusters: [] }),
    } as Response);
    useStudioShellOptionalMock.mockReturnValue({
      selectedPreview: { docId: 'card-1', title: 'Card One', type: 'story', status: 'draft' },
      selectedDetail: null,
    });
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      media: [{ docId: 'media-1', importBatchId: 'batch-100' }],
    });

    render(<MediaAdminContent embedded />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Story piles overlay' }));

    await waitFor(() => {
      expect(screen.getByTestId('story-piles-overlay')).toBeInTheDocument();
    });
  });

  it('shows the organize strip on Whole library', () => {
    useStudioShellOptionalMock.mockReturnValue({
      selectedPreview: { docId: 'card-1', title: 'Card One', type: 'story', status: 'draft' },
      selectedDetail: null,
    });
    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      media: [{ docId: 'media-1', importBatchId: 'batch-100' }],
    });

    render(<MediaAdminContent embedded />);

    expect(screen.getByRole('region', { name: 'Organize imported media' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build piles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New pile' })).toBeInTheDocument();
  });

  it('does not arm the embedded load-more observer at all in Studio mode', async () => {
    const observe = jest.fn();
    const disconnect = jest.fn();
    const previousIntersectionObserver = global.IntersectionObserver;

    global.IntersectionObserver = class IntersectionObserver {
      observe = observe;
      unobserve = jest.fn();
      disconnect = disconnect;
    } as typeof IntersectionObserver;

    useMediaMock.mockReturnValue({
      ...baseMediaContext,
      resolveMediaById: jest.fn((id: string) => ({ docId: id, filename: `${id}.jpg` })),
    });
    useStudioShellOptionalMock.mockReturnValue({
      selectedPreview: {
        docId: 'card-1',
        title: 'Card One',
        type: 'story',
        status: 'draft',
        coverImageId: 'media-1',
      },
      selectedDetail: null,
    });

    try {
      render(<MediaAdminContent embedded />);

      await waitFor(() => expect(screen.getByTestId('media-grid')).toBeInTheDocument());
      expect(observe).not.toHaveBeenCalled();
      expect(disconnect).not.toHaveBeenCalled();
    } finally {
      global.IntersectionObserver = previousIntersectionObserver;
    }
  });
});
