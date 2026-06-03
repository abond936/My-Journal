import React from 'react';
import { render, screen } from '@testing-library/react';
import MediaAdminContent from '@/app/admin/media-admin/MediaAdminContent';

const useMediaMock = jest.fn();

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
  useStudioShellOptional: () => null,
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
  beforeEach(() => {
    useMediaMock.mockReturnValue(baseMediaContext);
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
});
