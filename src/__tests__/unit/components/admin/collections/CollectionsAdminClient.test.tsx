import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';

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

jest.mock('@/components/admin/studio/TagAdminStudioPane', () => ({
  __esModule: true,
  default: () => <div data-testid="tag-pane" />,
}));

jest.mock('@/components/admin/card-admin/CuratedTreeNode', () => ({
  CuratedTreeNode: () => <li data-testid="tree-node" />,
}));

jest.mock('@/components/admin/collections/CollectionsMediaPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="media-panel" />,
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/hooks/useDefaultDndSensors', () => ({
  DND_POINTER_IGNORE_ATTR: 'data-dnd-pointer-ignore',
  useDefaultDndSensors: () => [],
}));

describe('CollectionsAdminClient', () => {
  beforeEach(() => {
    mockDndContextProps.current = null;
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
        embedded
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

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
        embedded
        embeddedUnparentedReplacement={() => <div data-testid="cards-bank" />}
        embeddedRightSlot={<div data-testid="right-slot" />}
      />
    );

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
});
