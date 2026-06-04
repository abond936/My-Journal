import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MediaAdminContent from '@/app/admin/media-admin/MediaAdminContent';

const useMediaMock = jest.fn();
const useStudioShellOptionalMock = jest.fn();

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

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShellOptional: () => useStudioShellOptionalMock(),
}));

jest.mock('@/components/admin/media-admin/MediaAdminGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="media-grid">grid</div>,
}));

jest.mock('@/components/admin/media-admin/BulkEditMediaTagsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/media-admin/MediaLocalImportDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/card-admin/EditModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/card-admin/MacroTagSelector', () => ({
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
  setSelectedMediaIds: jest.fn(),
  dimensionalQueryOverlay: {},
  setDimensionalQueryOverlay: jest.fn(),
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
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    expect(screen.queryByText('Scrolling newest first')).not.toBeInTheDocument();
    expect(screen.queryByText(/filtered results continue as you scroll/i)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByLabelText('Show only assigned'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    rerender(<MediaAdminContent embedded />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('disconnects the embedded load-more observer when Show only assigned takes over the pane', async () => {
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

      await waitFor(() => expect(observe).toHaveBeenCalled());

      fireEvent.click(screen.getByLabelText('Show only assigned'));

      await waitFor(() => expect(disconnect).toHaveBeenCalled());
    } finally {
      global.IntersectionObserver = previousIntersectionObserver;
    }
  });
});
