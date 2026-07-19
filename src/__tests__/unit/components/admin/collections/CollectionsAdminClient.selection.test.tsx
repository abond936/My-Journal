import React from 'react';
import { render, waitFor } from '@testing-library/react';
import CollectionsAdminClient from '@/components/admin/collections/CollectionsAdminClient';

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MeasuringStrategy: {},
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
  }),
}));

jest.mock('@/components/admin/studio/cards/CuratedTreeNode', () => ({
  CuratedTreeNode: () => null,
}));

jest.mock('@/components/admin/studio/cards/curatedTreeDragContext', () => ({
  CuratedTreeDragProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/admin/studio/cards/curatedTreeDropHighlightContext', () => ({
  CuratedTreeDropHighlightSync: () => null,
  useCuratedTreeDropHighlight: () => null,
}));


jest.mock('@/components/admin/studio/TagAdminStudioPane', () => () => null);
jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));
jest.mock('@/lib/hooks/useDefaultDndSensors', () => ({
  DND_POINTER_IGNORE_ATTR: 'data-dnd-ignore',
  useDefaultDndSensors: () => [],
}));

jest.mock('@/lib/config/curatedTreeDnd', () => ({
  isCuratedTreeDndEnabled: () => false,
}));

jest.mock('@/lib/utils/httpJsonApiErrors', () => ({
  throwIfJsonApiFailed: jest.fn(),
}));

jest.mock('@/lib/preferences/adminFilters', () => ({
  readStoredStudioCardBankSharedFilterPreferences: () => ({
    search: '',
    statusFilter: 'all',
  }),
  writeStoredStudioCardBankSharedFilterPreferences: jest.fn(),
}));

jest.mock('@/lib/utils/fetchAdminCardSnapshot', () => ({
  fetchAdminCardSnapshot: jest.fn(),
}));

jest.mock('@/lib/utils/curatedCollectionTree', () => ({
  buildRootDocIdListWithInsertBefore: jest.fn(),
  buildParentIdsByChild: () => new Map(),
  buildChildrenIdsWithInsertBefore: jest.fn(),
  deriveCuratedMutationPlan: jest.fn(),
  listCollectionRootCards: (cards: Array<{ isCollectionRoot?: boolean }>) =>
    cards.filter((card) => card.isCollectionRoot),
  normalizeCuratedChildIds: (ids: string[] | undefined) => ids ?? [],
  resolveCuratedDropIntent: jest.fn(),
}));

jest.mock('@/lib/utils/optimisticCuratedCollections', () => ({
  optimisticAttachChildAsLast: jest.fn(),
  optimisticDetachChildFromParent: jest.fn(),
  optimisticInsertChildBeforeSibling: jest.fn(),
  optimisticReorderCollectionRoots: jest.fn(),
  optimisticSetCollectionRoot: jest.fn(),
}));

jest.mock('@/lib/utils/curatedTreeAttachCandidates', () => ({
  listOrphanedCards: (cards: Array<{ isCollectionRoot?: boolean }>) =>
    cards.filter((card) => !card.isCollectionRoot),
}));

jest.mock('@/lib/dnd/collectionsDragContract', () => ({
  buildCollectionsCardDragData: jest.fn(),
  isCollectionsCardDragData: () => false,
  parseCollectionsCardDragId: jest.fn(),
}));

jest.mock('@/components/admin/studio/studioCardProjection', () => ({
  mergeStudioCatalogCard: (_base: unknown, update: unknown) => update,
  toStudioCatalogCard: (card: unknown) => card,
}));

jest.mock('@/lib/dnd/studioShellDragRouter', () => ({
  resolveStudioShellExternalDropId: jest.fn(),
}));

describe('CollectionsAdminClient selection sync', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            docId: 'card-1',
            title: 'Card One',
            status: 'draft',
            type: 'story',
            childrenIds: [],
            isCollectionRoot: true,
          },
          {
            docId: 'card-2',
            title: 'Card Two',
            status: 'draft',
            type: 'story',
            childrenIds: [],
            isCollectionRoot: false,
          },
        ],
      }),
    } as Response);
  });

  it('does not auto-select a fallback card when Studio already owns the selected card', async () => {
    const onSelectCard = jest.fn();

    render(
      <CollectionsAdminClient
        selectedCardIdExternal="card-2"
        onSelectCard={onSelectCard}
        embeddedRightSlot={<div />}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onSelectCard).not.toHaveBeenCalled();
    });
  });
});
