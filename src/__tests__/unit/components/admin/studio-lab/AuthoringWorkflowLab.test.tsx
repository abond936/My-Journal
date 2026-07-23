import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthoringWorkflowLab from '@/components/admin/studio-lab/AuthoringWorkflowLab';

const fetchMedia = jest.fn(async () => undefined);
const loadMore = jest.fn(async () => undefined);

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({
    media: [
      {
        docId: 'media-1',
        filename: 'dress.jpg',
        caption: '',
        storageUrl: '/dress.jpg',
        source: 'local',
        sourcePath: '/dress.jpg',
        hasWho: true,
        hasWhat: false,
        hasWhen: false,
        hasWhere: true,
      },
    ],
    loading: false,
    loadingMore: false,
    hasMore: false,
    fetchMedia,
    loadMore,
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [
      { docId: 'who-alan', name: 'Alan', dimension: 'who' },
      { docId: 'what-clubs', name: 'Clubs', dimension: 'what' },
    ],
  }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

jest.mock('@/lib/utils/photoUtils', () => ({
  getStudioDisplayUrl: () => '/dress.jpg',
}));

describe('AuthoringWorkflowLab', () => {
  beforeEach(() => {
    fetchMedia.mockClear();
    loadMore.mockClear();
  });

  it('starts with the incomplete working set and keeps edits local to the prototype', async () => {
    render(<AuthoringWorkflowLab />);

    await waitFor(() => {
      expect(fetchMedia).toHaveBeenCalledWith(1, { codification: 'incomplete' });
    });
    expect(screen.getByText('Read-only workflow prototype')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to current Studio' })).toHaveAttribute(
      'href',
      '/admin/studio'
    );

    fireEvent.click(screen.getByRole('button', { name: /Caption needed/ }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Caption draft' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Preview only' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Alan/ }));
    expect(screen.getByText('1 selected', { selector: 'small' })).toBeInTheDocument();
  });
});
