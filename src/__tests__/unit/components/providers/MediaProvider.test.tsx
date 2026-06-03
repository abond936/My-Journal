import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaProvider, useMedia } from '@/components/providers/MediaProvider';
import type { Media } from '@/lib/types/photo';
import type { DimensionalTagIdMap } from '@/lib/utils/tagUtils';

const usePathnameMock = jest.fn(() => '/admin/media-admin');

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: () => ({
    selectedTags: [],
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [],
  }),
}));

const baseMedia = (overrides: Partial<Media> = {}): Media => ({
  docId: 'media-1',
  filename: 'family.jpg',
  width: 1600,
  height: 900,
  size: 1024,
  contentType: 'image/jpeg',
  storageUrl: 'https://example.com/family.jpg',
  storagePath: 'images/family.jpg',
  caption: '',
  tags: [],
  who: [],
  what: [],
  when: [],
  where: [],
  referencedByCardIds: [],
  source: 'local',
  sourcePath: '/family.jpg',
  objectPosition: '50% 50%',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

function MediaHarness() {
  const { media, fetchMedia, updateMedia, setDimensionalQueryOverlay } = useMedia();

  const siblingsOverlay: DimensionalTagIdMap = {
    who: ['siblings'],
    what: [],
    when: [],
    where: [],
  };

  return (
    <div>
      <div data-testid="media-ids">{media.map((item) => item.docId).join(',')}</div>
      <button type="button" onClick={() => void fetchMedia(1)}>
        Load Default
      </button>
      <button type="button" onClick={() => void fetchMedia(1, { hasCaption: 'without' })}>
        Load Without Caption
      </button>
      <button type="button" onClick={() => void fetchMedia(1, { search: 'short' })}>
        Load Search
      </button>
      <button
        type="button"
        onClick={() => {
          setDimensionalQueryOverlay(siblingsOverlay);
          void fetchMedia(1, { tagScope: 'subject' });
        }}
      >
        Load Subject Scope
      </button>
      <button type="button" onClick={() => void updateMedia('media-1', { caption: 'Now captioned' })}>
        Add Caption
      </button>
      <button type="button" onClick={() => void updateMedia('media-1', { caption: 'Different text' })}>
        Change Caption
      </button>
      <button type="button" onClick={() => void updateMedia('media-1', { subjectTagId: null })}>
        Clear Subject
      </button>
    </div>
  );
}

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    statusText: 'OK',
    json: async () => body,
  } as Response);
}

describe('MediaProvider', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    window.localStorage.clear();
    global.fetch = fetchMock;
    usePathnameMock.mockReturnValue('/admin/media-admin');
  });

  it('uses a larger batch size for Studio media so the pane stays warm longer while scrolling', async () => {
    usePathnameMock.mockReturnValue('/admin/studio');
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [],
          pagination: {
            page: 1,
            limit: 100,
            total: null,
            totalPages: null,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Default'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/media?limit=100'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('threads subject-only scope into media list queries', async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Subject Scope'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('tagScope=subject'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('removes captioned media from a delivered "without caption" working set after edit', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [baseMedia({ caption: '' })],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      if (url === '/api/images/media-1' && init?.method === 'PATCH') {
        return okJson({
          ok: true,
          media: baseMedia({ caption: 'Now captioned' }),
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Without Caption'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));

    fireEvent.click(screen.getByText('Add Caption'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe(''));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes media from the delivered set when a caption edit breaks the active search match', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [baseMedia({ caption: 'Short caption' })],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      if (url === '/api/images/media-1' && init?.method === 'PATCH') {
        return okJson({
          ok: true,
          media: baseMedia({ caption: 'Different text' }),
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Search'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));

    fireEvent.click(screen.getByText('Change Caption'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe(''));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes media from a subject-scoped result when the subject tag is cleared', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [baseMedia({ subjectTagId: 'siblings', subjectFilterTags: { siblings: true } })],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      if (url === '/api/images/media-1' && init?.method === 'PATCH') {
        return okJson({
          ok: true,
          media: baseMedia({ subjectTagId: null, subjectFilterTags: {} }),
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Subject Scope'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));

    fireEvent.click(screen.getByText('Clear Subject'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe(''));
  });
});
