import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaProvider, useMedia } from '@/components/providers/MediaProvider';
import type { Media } from '@/lib/types/photo';
import type { DimensionalTagIdMap } from '@/lib/utils/tagUtils';

const usePathnameMock = jest.fn(() => '/admin/media-admin');
const mutateTagsMock = jest.fn();

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
    mutate: mutateTagsMock,
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
  const {
    media,
    fetchMedia,
    loadMore,
    updateMedia,
    setDimensionalQueryOverlay,
    bulkApplyTags,
    deleteMultipleMedia,
  } = useMedia();

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
      <button type="button" onClick={() => void loadMore()}>
        Load More
      </button>
      <button type="button" onClick={() => void fetchMedia(1, { hasCaption: 'without' })}>
        Load Without Caption
      </button>
      <button type="button" onClick={() => void fetchMedia(1, { search: 'short' })}>
        Load Search
      </button>
      <button
        type="button"
        onClick={() =>
          void fetchMedia(1, {
            codification: 'incomplete',
            unresolvedDimension: 'what',
            importBatchId: 'batch-1',
            importFolder: 'Charleston',
            metadataOutcome: 'found',
          })
        }
      >
        Load Incomplete Workflow
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
      <button type="button" onClick={() => void updateMedia('media-1', { tags: ['elementary'] })}>
        Change Tags
      </button>
      <button
        type="button"
        onClick={() =>
          void bulkApplyTags(['media-1'], {
            subjectTagId: 'siblings',
            subjectTagIdProvided: true,
          })
        }
      >
        Bulk Subject
      </button>
      <button type="button" onClick={() => void deleteMultipleMedia(['media-1', 'media-2'])}>
        Delete Multiple
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
    mutateTagsMock.mockReset();
    mutateTagsMock.mockResolvedValue(undefined);
    window.localStorage.clear();
    global.fetch = fetchMock;
    usePathnameMock.mockReturnValue('/admin/media-admin');
  });

  it('refreshes shared tag counts after a successful media tag edit', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/images/media-1' && init?.method === 'PATCH') {
        return okJson({ media: baseMedia({ tags: ['elementary'] }) });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Change Tags'));

    await waitFor(() => expect(mutateTagsMock).toHaveBeenCalledTimes(1));
  });

  it('does not refresh shared tag counts after a failed media tag edit', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Failed',
      json: async () => ({ message: 'No change', retryable: false }),
    } as Response);

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Change Tags'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(mutateTagsMock).not.toHaveBeenCalled();
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

  it('sends the complete server workflow filter contract', async () => {
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

    render(<MediaProvider><MediaHarness /></MediaProvider>);
    fireEvent.click(screen.getByText('Load Incomplete Workflow'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'codification=incomplete&unresolvedDimension=what&importBatchId=batch-1&importFolder=Charleston&metadataOutcome=found'
        ),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('does not prefetch a second Studio media page in the background after the initial load', async () => {
    usePathnameMock.mockReturnValue('/admin/studio');
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/media?limit=100&includeTotal=false') {
        return okJson({
          media: [baseMedia({ docId: 'media-1' })],
          pagination: {
            page: 1,
            limit: 100,
            total: null,
            totalPages: null,
            hasNext: true,
            hasPrev: false,
            nextCursor: 'next-cursor',
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

    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deletes bulk-selected media sequentially so shared card cleanup cannot race across requests', async () => {
    let resolveFirstDelete: ((value: Response | PromiseLike<Response>) => void) | null = null;
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/media?limit=50') {
        return okJson({
          media: [baseMedia({ docId: 'media-1' }), baseMedia({ docId: 'media-2', filename: 'second.jpg' })],
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            prevCursor: null,
          },
        });
      }
      if (url === '/api/images/media-1' && init?.method === 'DELETE') {
        return new Promise((resolve) => {
          resolveFirstDelete = resolve;
        });
      }
      if (url === '/api/images/media-2' && init?.method === 'DELETE') {
        return okJson({ ok: true });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Default'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1,media-2'));

    fireEvent.click(screen.getByText('Delete Multiple'));

    await waitFor(() => {
      const firstDeleteCalls = fetchMock.mock.calls.filter(
        ([url, init]) => url === '/api/images/media-1' && init?.method === 'DELETE'
      );
      expect(firstDeleteCalls).toHaveLength(1);
    });
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url === '/api/images/media-2' && init?.method === 'DELETE'
      )
    ).toHaveLength(0);

    resolveFirstDelete?.({
      ok: true,
      statusText: 'OK',
      json: async () => ({ ok: true }),
    } as Response);

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) => url === '/api/images/media-2' && init?.method === 'DELETE'
        )
      ).toHaveLength(1)
    );
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe(''));
  });

  it('reuses an in-flight prefetched next page instead of issuing the same cursor request twice', async () => {
    let resolveSecondPage: ((value: Response | PromiseLike<Response>) => void) | null = null;
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/media?limit=50') {
        return okJson({
          media: [baseMedia({ docId: 'media-1' })],
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 2,
            hasNext: true,
            hasPrev: false,
            nextCursor: 'next-cursor',
            prevCursor: null,
          },
        });
      }
      if (url === '/api/media?limit=50&cursor=next-cursor') {
        return new Promise((resolve) => {
          resolveSecondPage = resolve;
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
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));

    fireEvent.click(screen.getByText('Load More'));

    await waitFor(() => {
      const duplicateCalls = fetchMock.mock.calls.filter(
        ([url]) => url === '/api/media?limit=50&cursor=next-cursor'
      );
      expect(duplicateCalls).toHaveLength(1);
    });

    resolveSecondPage?.({
      ok: true,
      statusText: 'OK',
      json: async () => ({
        media: [baseMedia({ docId: 'media-2' })],
        pagination: {
          page: 2,
          limit: 50,
          total: 2,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
          nextCursor: null,
          prevCursor: 'prev-cursor',
        },
      }),
    } as Response);

    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1,media-2'));
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
        expect.stringMatching(/(?=.*tagScope=subject)(?=.*who=siblings)/),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('reconciles subject-only bulk media edits into the local working set immediately', async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/media/tags') {
        return okJson({
          ok: true,
          updated: 1,
          mode: 'add',
          media: [baseMedia({ docId: 'media-1', subjectTagId: 'siblings', subjectFilterTags: { siblings: true } })],
        });
      }
      if (url.startsWith('/api/media?')) {
        return okJson({
          media: [baseMedia({ docId: 'media-1' })],
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
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <MediaProvider>
        <MediaHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Default'));
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));

    fireEvent.click(screen.getByText('Bulk Subject'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/media/tags', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: ['media-1'],
          subjectTagId: 'siblings',
        }),
      }));
    });
    await waitFor(() => expect(screen.getByTestId('media-ids').textContent).toBe('media-1'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it('merges transient dimensional overlay into Studio media fetch query params', async () => {
    usePathnameMock.mockReturnValue('/admin/studio');
    const capturedUrls: string[] = [];
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      capturedUrls.push(url);
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

    function StudioTransientHarness() {
      const { setTransientDimensionalQueryOverlay, fetchMedia } = useMedia();
      return (
        <button
          type="button"
          onClick={() => {
            setTransientDimensionalQueryOverlay({ when: ['import-tag-1'] });
            void fetchMedia(1);
          }}
        >
          Load Map Preview
        </button>
      );
    }

    render(
      <MediaProvider>
        <StudioTransientHarness />
      </MediaProvider>
    );

    fireEvent.click(screen.getByText('Load Map Preview'));
    await waitFor(() => expect(capturedUrls.some((url) => url.includes('when=import-tag-1'))).toBe(true));
  });
});
