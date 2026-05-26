import React from 'react';
import { render, waitFor } from '@testing-library/react';
import StudioTreeCandidateCardBank from '@/components/admin/studio/StudioTreeCandidateCardBank';
import type { Card } from '@/lib/types/card';

const mockCardAdminGrid = jest.fn(() => <div data-testid="mock-card-grid" />);

jest.mock('@dnd-kit/core', () => ({
  useDndContext: () => ({ active: null }),
}));

jest.mock('@/components/admin/card-admin/CardAdminGrid', () => ({
  __esModule: true,
  default: (props: unknown) => mockCardAdminGrid(props),
}));

jest.mock('@/components/admin/card-admin/MacroTagSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/card-admin/EditModal', () => ({
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
  useTag: () => ({ tags: [] }),
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
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/cards')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cards: [], nextCursor: null }),
        } as Response;
      }
      throw new Error(`Unhandled fetch in test: ${url}`);
    }) as jest.Mock;
  });

  it('keeps Studio card bank rows source-only for curated tree DnD', async () => {
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

    await waitFor(() => expect(mockCardAdminGrid).toHaveBeenCalled());
    const props = mockCardAdminGrid.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    expect(props.studioCuratedTreeDrag).toBe(true);
    expect(props.studioCuratedTreeUnparentedRowTarget).toBeUndefined();
  });
});
