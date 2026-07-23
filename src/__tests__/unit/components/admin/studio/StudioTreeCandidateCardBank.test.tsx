import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import type { Card } from '@/lib/types/card';

const mockCardAdminGrid = jest.fn(() => <div data-testid="mock-card-grid" />);
const mutateTagsMock = jest.fn();
const mockTagContext = {
  tags: [],
  studioCardFilterTagIds: [],
  setStudioCardFilterTagIds: jest.fn(),
  studioCardFiltersHydrated: true,
  mutate: mutateTagsMock,
};

jest.mock('@dnd-kit/core', () => ({
  useDndContext: () => ({ active: null }),
}));

jest.mock('@/components/admin/studio/cards/CardAdminGrid', () => ({
  __esModule: true,
  default: (props: unknown) => mockCardAdminGrid(props),
}));

jest.mock('@/components/admin/studio/cards/MacroTagSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    showToast: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => mockTagContext,
}));

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShell: () => ({ selectedLoadState: 'idle' }),
}));

describe('StudioTreeCandidateCardBank', () => {
  const baseCard: Card = {
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
  } as Card;

  beforeEach(() => {
    mockCardAdminGrid.mockClear();
    mutateTagsMock.mockReset();
    mutateTagsMock.mockResolvedValue(undefined);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/cards')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [], hasMore: false, lastDocId: null }),
        } as Response;
      }
      throw new Error(`Unhandled fetch in test: ${url}`);
    }) as jest.Mock;
  });

  it('keeps Studio card bank rows source-only for curated tree DnD', async () => {
    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        upsertCard={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={jest.fn()}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
      />
    );

    await waitFor(() => expect(mockCardAdminGrid).toHaveBeenCalled());
    const props = mockCardAdminGrid.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    expect(props.studioCuratedTreeDrag).toBe(true);
    expect(props.studioCuratedTreeUnparentedRowTarget).toBeUndefined();
  });

  it('refreshes shared tag counts after a successful card tag reassignment', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...baseCard, tags: ['elementary'] }),
        } as Response;
      }
      if (url.includes('/api/cards')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [baseCard], hasMore: false, lastDocId: null }),
        } as Response;
      }
      throw new Error(`Unhandled fetch in test: ${url}`);
    });

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        upsertCard={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={jest.fn()}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
      />
    );

    await waitFor(() => expect(mockCardAdminGrid).toHaveBeenCalled());
    const props = mockCardAdminGrid.mock.calls.at(-1)?.[0] as {
      onUpdateCard: (cardId: string, update: Partial<Card>) => Promise<void>;
    };
    await act(async () => props.onUpdateCard('card-1', { tags: ['elementary'] }));

    expect(mutateTagsMock).toHaveBeenCalledTimes(1);
  });

  it('stops after the first workspace page instead of draining the full query immediately', async () => {
    const previousIntersectionObserver = global.IntersectionObserver;
    // Disable auto-append in this contract test so we only assert the initial load behavior.
    // The runtime observer path is browser-verified, not unit-proven here.
    // @ts-expect-error test override
    delete global.IntersectionObserver;

    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [baseCard],
        hasMore: true,
        lastDocId: 'card-1',
      }),
    }));

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={jest.fn()}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    // @ts-expect-error test restore
    global.IntersectionObserver = previousIntersectionObserver;
  });

  it('owns the first Studio selection when no card is already selected', async () => {
    const onSelectCard = jest.fn();
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [baseCard],
        hasMore: false,
        lastDocId: 'card-1',
      }),
    }));

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={onSelectCard}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
        autoSelectFirstCard
      />
    );

    await waitFor(() => {
      expect(onSelectCard).toHaveBeenCalledWith(
        'card-1',
        expect.objectContaining({ docId: 'card-1' })
      );
    });
  });

  it('does not auto-select the first card during explicit new-card flow', async () => {
    const onSelectCard = jest.fn();
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [baseCard],
        hasMore: false,
        lastDocId: 'card-1',
      }),
    }));

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={onSelectCard}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
        autoSelectFirstCard={false}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(onSelectCard).not.toHaveBeenCalled();
  });

  it('clears the pending Opening state when Compose keeps editing after the dirty warning', async () => {
    const onSelectCard = jest.fn().mockResolvedValue(false);
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [baseCard],
        hasMore: false,
        lastDocId: 'card-1',
      }),
    }));

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId={null}
        onSelectCard={onSelectCard}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
      />
    );

    await waitFor(() => expect(mockCardAdminGrid).toHaveBeenCalled());

    const latestPropsBeforeClick = mockCardAdminGrid.mock.calls.at(-1)?.[0] as {
      onStudioFocusCard: (card: Card) => void;
      pendingFocusCardId: string | null;
    };

    expect(latestPropsBeforeClick.pendingFocusCardId).toBeNull();

    await act(async () => {
      latestPropsBeforeClick.onStudioFocusCard(baseCard);
    });

    await waitFor(() => expect(onSelectCard).toHaveBeenCalledWith('card-1', expect.objectContaining({ docId: 'card-1' })));
    await waitFor(() => {
      const latestPropsAfterKeepEditing = mockCardAdminGrid.mock.calls.at(-1)?.[0] as {
        pendingFocusCardId: string | null;
      };
      expect(latestPropsAfterKeepEditing.pendingFocusCardId).toBeNull();
    });
  });

  it('does not show a pending Opening state when the already-selected card tile is clicked again', async () => {
    const onSelectCard = jest.fn().mockResolvedValue(true);
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [baseCard],
        hasMore: false,
        lastDocId: 'card-1',
      }),
    }));

    render(
      <StudioTreeCandidateCardBank
        refreshCards={jest.fn()}
        collectionCards={[baseCard]}
        search=""
        setSearch={jest.fn()}
        statusFilter="all"
        setStatusFilter={jest.fn()}
        selectedCardId="card-1"
        onSelectCard={onSelectCard}
        saving={false}
        curatedTreeDnd
        treeDropZonesReadOnly={false}
      />
    );

    await waitFor(() => expect(mockCardAdminGrid).toHaveBeenCalled());

    const latestPropsBeforeClick = mockCardAdminGrid.mock.calls.at(-1)?.[0] as {
      onStudioFocusCard: (card: Card) => void;
      pendingFocusCardId: string | null;
    };

    await act(async () => {
      latestPropsBeforeClick.onStudioFocusCard(baseCard);
    });

    await waitFor(() => expect(onSelectCard).toHaveBeenCalledWith('card-1', expect.objectContaining({ docId: 'card-1' })));
    const latestPropsAfterClick = mockCardAdminGrid.mock.calls.at(-1)?.[0] as {
      pendingFocusCardId: string | null;
    };
    expect(latestPropsAfterClick.pendingFocusCardId).toBeNull();
  });
});
