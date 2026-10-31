import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoryCollectionPlacementControl from '@/components/admin/studio/cards/StoryCollectionPlacementControl';

const collection = {
  docId: 'my-life',
  title: 'My Life',
  lifecycle: 'draft',
  recordState: 'active',
  structureRevision: 2,
  authorityRevision: 1,
  order: 1,
  createdAt: 1,
  updatedAt: 1,
};

describe('StoryCollectionPlacementControl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires the Story to be saved before placement', () => {
    render(<StoryCollectionPlacementControl />);
    expect(screen.getByText('Save this draft before adding it to a Collection.')).toBeInTheDocument();
  });

  it('adds a saved Story at the Collection top level by default', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ collections: [collection] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          collection,
          placements: [{
            docId: 'part-1',
            collectionId: 'my-life',
            cardId: 'part-card',
            parentPlacementId: null,
            role: 'part',
            order: 10,
            createdAt: 1,
            updatedAt: 1,
          }],
          cards: [{ docId: 'part-card', title: 'Early Years' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ structureRevision: 3 }) });
    global.fetch = fetchMock as jest.Mock;

    render(<StoryCollectionPlacementControl cardId="story-1" />);

    await screen.findByRole('button', { name: 'Add to Collection' });
    expect(screen.getByRole('combobox', { name: 'Place at' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Add to Collection' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const request = fetchMock.mock.calls[2][1] as RequestInit;
    const payload = JSON.parse(request.body as string);
    expect(payload.expectedStructureRevision).toBe(2);
    expect(payload.placements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'story-1',
        parentPlacementId: null,
        role: 'card',
        order: 20,
      }),
    ]));
    expect(await screen.findByText('Story added to My Life.')).toBeInTheDocument();
  });

  it('inserts a Story at the author-selected sibling position', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ collections: [collection] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          collection,
          placements: [
            { docId: 'first', collectionId: 'my-life', cardId: 'first-card', parentPlacementId: null, role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
            { docId: 'second', collectionId: 'my-life', cardId: 'second-card', parentPlacementId: null, role: 'card', order: 20, createdAt: 1, updatedAt: 1 },
          ],
          cards: [
            { docId: 'first-card', title: 'First Story' },
            { docId: 'second-card', title: 'Second Story' },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ structureRevision: 3 }) });
    global.fetch = fetchMock as jest.Mock;

    render(<StoryCollectionPlacementControl cardId="story-1" />);

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Position' }), 'after:first');
    await user.click(screen.getByRole('button', { name: 'Add to Collection' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const request = fetchMock.mock.calls[2][1] as RequestInit;
    const payload = JSON.parse(request.body as string);
    expect(payload.placements.map((placement: { cardId: string; order: number }) => [placement.cardId, placement.order])).toEqual([
      ['first-card', 10],
      ['second-card', 30],
      ['story-1', 20],
    ]);
  });
});
