/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ViewMediaFeed from '@/components/view/ViewMediaFeed';

const mutate = jest.fn(async () => undefined);
const showError = jest.fn();
let sessionRole: 'admin' | 'viewer' = 'viewer';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: sessionRole } } }),
}));

jest.mock('swr/infinite', () => ({
  __esModule: true,
  default: () => ({
    data: [
      {
        items: [
          {
            docId: 'media-1',
            filename: 'memory.jpg',
            caption: 'Original caption',
            width: 800,
            height: 600,
          },
        ],
        hasMore: false,
      },
    ],
    error: null,
    isLoading: false,
    isValidating: false,
    mutate,
    size: 1,
    setSize: jest.fn(),
  }),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ showError }),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: () => ({
    selectedTags: [],
    searchTerm: '',
    includeSubTagsInFeed: true,
    readerTagFilterScope: 'all',
    clearFilters: jest.fn(),
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('ViewMediaFeed Reader editing boundary', () => {
  beforeAll(() => {
    class IntersectionObserverMock {
      observe() {}
      disconnect() {}
    }
    global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  beforeEach(() => {
    sessionRole = 'viewer';
    mutate.mockClear();
    showError.mockClear();
    global.fetch = jest.fn();
  });

  it('presents canonical media captions as read-only to viewing users', () => {
    render(<ViewMediaFeed />);

    fireEvent.click(screen.getByRole('button', { name: /Original caption/ }));

    expect(screen.queryByRole('textbox', { name: 'Media caption' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Original caption').length).toBeGreaterThan(0);
  });

  it('keeps an administrator caption draft open after a failed save', async () => {
    sessionRole = 'admin';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Save unavailable.' }),
    });
    render(<ViewMediaFeed />);

    fireEvent.click(screen.getByRole('button', { name: /Original caption/ }));
    const caption = screen.getByRole('textbox', { name: 'Media caption' });
    fireEvent.change(caption, { target: { value: 'Unsaved canonical caption' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close media view' }));

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Media caption' })).toHaveValue(
      'Unsaved canonical caption'
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('updates the visible Media feed after an administrator caption save', async () => {
    sessionRole = 'admin';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        media: {
          docId: 'media-1',
          filename: 'memory.jpg',
          caption: 'Saved canonical caption',
          width: 800,
          height: 600,
        },
      }),
    });
    render(<ViewMediaFeed />);

    fireEvent.click(screen.getByRole('button', { name: /Original caption/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Media caption' }), {
      target: { value: 'Saved canonical caption' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close media view' }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
