import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';
import { fetchAdminCardSnapshot } from '@/lib/utils/fetchAdminCardSnapshot';

const mockDndContextProps: { current: Record<string, unknown> | null } = { current: null };

jest.mock('@dnd-kit/core', () => ({
  DndContext: (props: Record<string, unknown>) => {
    mockDndContextProps.current = props;
    return <div data-testid="mock-dnd-context">{props.children as React.ReactNode}</div>;
  },
  DragOverlay: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  MeasuringStrategy: { Always: 'Always' },
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
  }),
  useDndContext: () => ({
    active: null,
    over: null,
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({ media: [] }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/admin/studio/TagAdminStudioPane', () => ({
  __esModule: true,
  default: () => <div data-testid="tag-pane" />,
}));

jest.mock('@/components/admin/studio/cards/CuratedTreeNode', () => ({
  CuratedTreeNode: () => <li data-testid="tree-node" />,
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/utils/fetchAdminCardSnapshot', () => ({
  fetchAdminCardSnapshot: jest.fn(),
}));

jest.mock('@/lib/hooks/useDefaultDndSensors', () => ({
  DND_POINTER_IGNORE_ATTR: 'data-dnd-pointer-ignore',
  useDefaultDndSensors: () => [],
}));

describe('CollectionsAdminClient', () => {
  beforeEach(() => {
    mockDndContextProps.current = null;
    jest.mocked(fetchAdminCardSnapshot).mockReset();
  });

  async function waitForEmbeddedCollectionsReady() {
    await waitFor(() => {
      expect(screen.queryByText('Loading cards...')).not.toBeInTheDocument();
    });
  }

  it('renders the embedded Studio workspace before tree data finishes loading', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    ) as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    expect(screen.getByTestId('cards-bank')).toBeInTheDocument();
    expect(screen.getByTestId('right-slot')).toBeInTheDocument();
    expect(screen.getByText('Loading cards...')).toBeInTheDocument();

    await act(async () => {
      resolveFetch?.({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      } as Response);
    });
  });

  it('keeps embedded Collections on a roots-first path until the Collections tab is opened', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              docId: 'root-1',
              title: 'Root One',
              status: 'published',
              type: 'story',
              childrenIds: [],
              isCollectionRoot: true,
            },
          ],
        }),
      } as Response;
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/cards?collectionsOnly=true&status=all&hydration=cover-only');
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/cards?collectionsOnly=true&includeDescendants=true&status=all&hydration=cover-only'
    );
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('sortBy=created'));

    fireEvent.click(screen.getByRole('tab', { name: 'Collections' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards?collectionsOnly=true&includeDescendants=true&status=all&hydration=cover-only'
      );
    });
  });

  it('promotes a Studio card-bank drag to a new top-level collection when dropped on tree-root', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && url.endsWith('/api/cards/card-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'card-1',
                title: 'Card One',
                title_lowercase: 'card one',
                status: 'draft',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;
    expect(onDragEnd).toBeDefined();

    await act(async () => {
      await onDragEnd?.({
        active: {
          id: 'card:card-1',
          data: {
            current: {
              domain: 'collections',
              kind: 'card',
              cardId: 'card-1',
            },
          },
        },
        over: {
          id: 'tree-root',
          data: {
            current: {
              domain: 'collections',
              dropKind: 'tree-root',
            },
          },
        },
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/card-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            isCollectionRoot: true,
            collectionRootOrder: 0,
          }),
        })
      )
    );
  });

  it('uses the last valid root target when the drop loses over before drag end', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && url.endsWith('/api/cards/card-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'card-1',
                title: 'Card One',
                title_lowercase: 'card one',
                status: 'draft',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragOver = mockDndContextProps.current?.onDragOver as ((event: Record<string, unknown>) => void) | undefined;
    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;

    await act(async () => {
      onDragOver?.({
        over: {
          id: 'tree-root',
          data: {
            current: {
              domain: 'collections',
              dropKind: 'tree-root',
            },
          },
        },
      });

      await onDragEnd?.({
        active: {
          id: 'card:card-1',
          data: {
            current: {
              domain: 'collections',
              kind: 'card',
              cardId: 'card-1',
            },
          },
        },
        over: null,
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/card-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            isCollectionRoot: true,
            collectionRootOrder: 0,
          }),
        })
      )
    );
  });

  it('appends a new root after legacy roots without explicit order and can clear that root immediately', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && url.endsWith('/api/cards/card-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (init?.method === 'PATCH' && url.endsWith('/api/cards/root-legacy')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'root-legacy',
                title: 'WELCOME',
                title_lowercase: 'welcome',
                status: 'published',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                isCollectionRoot: true,
                childrenIds: [],
                galleryMedia: [],
              },
              {
                docId: 'card-1',
                title: 'Card One',
                title_lowercase: 'card one',
                status: 'draft',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;
    expect(onDragEnd).toBeDefined();

    await act(async () => {
      await onDragEnd?.({
        active: {
          id: 'card:card-1',
          data: { current: { domain: 'collections', kind: 'card', cardId: 'card-1' } },
        },
        over: {
          id: 'tree-root',
          data: { current: { domain: 'collections', dropKind: 'tree-root' } },
        },
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/root-legacy',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            isCollectionRoot: true,
            collectionRootOrder: 0,
          }),
        })
      )
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cards/card-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isCollectionRoot: true,
          collectionRootOrder: 10,
        }),
      })
    );
  });

  it('reparents a bank card into an existing collection parent', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && url.endsWith('/api/cards/parent-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'parent-1',
                title: 'Parent One',
                title_lowercase: 'parent one',
                status: 'published',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                isCollectionRoot: true,
                collectionRootOrder: 0,
                childrenIds: [],
                galleryMedia: [],
              },
              {
                docId: 'card-1',
                title: 'Card One',
                title_lowercase: 'card one',
                status: 'draft',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    jest.mocked(fetchAdminCardSnapshot).mockResolvedValue({
      docId: 'parent-1',
      childrenIds: [],
    } as never);

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;

    await act(async () => {
      await onDragEnd?.({
        active: {
          id: 'card:card-1',
          data: { current: { domain: 'collections', kind: 'card', cardId: 'card-1' } },
        },
        over: {
          id: 'parent:parent-1',
          data: { current: { domain: 'collections', dropKind: 'parent', parentCardId: 'parent-1' } },
        },
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/parent-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            childrenIds: ['card-1'],
          }),
        })
      )
    );
  });

  it('attaches a bank card into compose children through the studio-parent drop id', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && url.endsWith('/api/cards/parent-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'parent-1',
                title: 'Parent One',
                title_lowercase: 'parent one',
                status: 'published',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                isCollectionRoot: true,
                collectionRootOrder: 0,
                childrenIds: ['existing-child'],
                galleryMedia: [],
              },
              {
                docId: 'card-1',
                title: 'Card One',
                title_lowercase: 'card one',
                status: 'draft',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    jest.mocked(fetchAdminCardSnapshot).mockResolvedValue({
      docId: 'parent-1',
      childrenIds: ['existing-child'],
    } as never);

    global.fetch = fetchMock as typeof fetch;

    const onSelectCard = jest.fn();

    render(
      <CollectionsAdminClient
        onSelectCard={onSelectCard}
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;

    await act(async () => {
      await onDragEnd?.({
        active: {
          id: 'card:card-1',
          data: { current: { domain: 'collections', kind: 'card', cardId: 'card-1' } },
        },
        over: {
          id: 'studio-parent:parent-1',
          data: { current: null },
        },
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/parent-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            childrenIds: ['existing-child', 'card-1'],
          }),
        })
      )
    );

    expect(onSelectCard).toHaveBeenCalledWith(
      'parent-1',
      expect.objectContaining({ docId: 'parent-1' })
    );
  });

  it('reorders a root before another root by persisting the full ordered root list', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH' && (url.endsWith('/api/cards/root-1') || url.endsWith('/api/cards/root-2'))) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (url.includes('/api/cards?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                docId: 'root-1',
                title: 'Root One',
                title_lowercase: 'root one',
                status: 'published',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                isCollectionRoot: true,
                collectionRootOrder: 0,
                childrenIds: [],
                galleryMedia: [],
              },
              {
                docId: 'root-2',
                title: 'Root Two',
                title_lowercase: 'root two',
                status: 'published',
                type: 'story',
                tags: [],
                who: [],
                what: [],
                when: [],
                where: [],
                isCollectionRoot: true,
                collectionRootOrder: 10,
                childrenIds: [],
                galleryMedia: [],
              },
            ],
            hasMore: false,
            lastDocId: null,
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <CollectionsAdminClient
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

    await waitForEmbeddedCollectionsReady();
    await waitFor(() => expect(mockDndContextProps.current).not.toBeNull());

    const onDragEnd = mockDndContextProps.current?.onDragEnd as ((event: Record<string, unknown>) => Promise<void>) | undefined;

    await act(async () => {
      await onDragEnd?.({
        active: {
          id: 'card:root-2',
          data: {
            current: {
              domain: 'collections',
              kind: 'card',
              cardId: 'root-2',
              sourceIsRoot: true,
            },
          },
        },
        over: {
          id: 'insertBefore:__root__:root-1',
          data: {
            current: {
              domain: 'collections',
              dropKind: 'insert-before',
              parentId: null,
              beforeCardId: 'root-1',
            },
          },
        },
      });
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cards/root-2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            isCollectionRoot: true,
            collectionRootOrder: 0,
          }),
        })
      )
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cards/root-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isCollectionRoot: true,
          collectionRootOrder: 10,
        }),
      })
    );
  });
});
