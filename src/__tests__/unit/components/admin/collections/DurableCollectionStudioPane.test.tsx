import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DurableCollectionStudioPane from '@/components/admin/collections/DurableCollectionStudioPane';

const activeCollection = {
  docId: 'my-life', title: 'My Life', lifecycle: 'draft', recordState: 'active',
  structureRevision: 3, order: 10, createdAt: 1, updatedAt: 1,
};

function response(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 409, json: async () => data } as Response;
}

describe('DurableCollectionStudioPane', () => {
  beforeEach(() => jest.resetAllMocks());

  it('offers durable Collection creation while reporting no active durable authority', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ ok: true, collections: [] }));
    const onAvailabilityChange = jest.fn();
    render(
      <DurableCollectionStudioPane onAvailabilityChange={onAvailabilityChange} />
    );
    await waitFor(() => expect(onAvailabilityChange).toHaveBeenLastCalledWith('none'));
    expect(screen.getByRole('button', { name: 'New Collection' })).toBeInTheDocument();
    expect(screen.getByText(/No active Collections yet/)).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Find a Card to add' })).not.toBeInTheDocument();
  });

  it('renders placement identity separately from canonical Card identity', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/collections') {
        return response({ ok: true, collections: [activeCollection] });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'chapter-a', collectionId: 'my-life', cardId: 'chapter-card', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'shared-a', collectionId: 'my-life', cardId: 'shared-card', parentPlacementId: 'chapter-a', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'chapter-b', collectionId: 'my-life', cardId: 'chapter-card-2', role: 'chapter', order: 20, createdAt: 1, updatedAt: 1 },
          { docId: 'shared-b', collectionId: 'my-life', cardId: 'shared-card', parentPlacementId: 'chapter-b', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [
          { docId: 'chapter-card', title: 'First' },
          { docId: 'chapter-card-2', title: 'Second' },
          { docId: 'shared-card', title: 'Shared Story' },
        ],
      });
    }) as typeof fetch;
    const onSelectCard = jest.fn();
    render(
      <DurableCollectionStudioPane
        onAvailabilityChange={jest.fn()}
        onSelectCard={onSelectCard}
      />
    );
    expect(await screen.findByText('My Life')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Shared Story' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Shared Story' })[1]);
    expect(onSelectCard).toHaveBeenCalledWith('shared-card', expect.objectContaining({ docId: 'shared-card' }));
  });

  it('selects a requested active Collection and falls back safely when it is unavailable', async () => {
    const otherCollection = {
      ...activeCollection,
      docId: 'family-trip',
      title: 'Family Trip',
      order: 20,
    };
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/collections') {
        return response({ ok: true, collections: [activeCollection, otherCollection] });
      }
      const requestedId = url.split('/').at(-2);
      const collection = requestedId === otherCollection.docId ? otherCollection : activeCollection;
      return response({ ok: true, collection, placements: [], cards: [] });
    });
    global.fetch = fetchMock as typeof fetch;

    const { rerender } = render(
      <DurableCollectionStudioPane
        initialCollectionId="family-trip"
        onAvailabilityChange={jest.fn()}
      />
    );
    expect(await screen.findByRole('combobox', { name: 'Active Collection' })).toHaveValue('family-trip');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/collections/family-trip/structure'));

    rerender(
      <DurableCollectionStudioPane
        initialCollectionId="not-active"
        onAvailabilityChange={jest.fn()}
      />
    );
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Active Collection' })).toHaveValue('my-life'));
  });

  it('saves the complete graph with the expected revision when sibling order changes', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (init?.method === 'PUT') return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-1' });
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'first', collectionId: 'my-life', cardId: 'first-card', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'second', collectionId: 'my-life', cardId: 'second-card', role: 'chapter', order: 20, createdAt: 1, updatedAt: 1 },
        ],
        cards: [{ docId: 'first-card', title: 'First' }, { docId: 'second-card', title: 'Second' }],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Move Second up' }));
    await waitFor(() => expect(screen.getByText('Collection order updated.')).toBeInTheDocument());
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(putCall).toBeDefined();
    const body = JSON.parse(String(putCall?.[1]?.body));
    expect(body).toMatchObject({
      expectedStructureRevision: 3,
      placements: [
        expect.objectContaining({ docId: 'first', order: 20 }),
        expect.objectContaining({ docId: 'second', order: 10 }),
      ],
    });
    expect(screen.getByText(/Revision 4/)).toBeInTheDocument();
  });

  it('reparents a placement through role-compatible parent choices without changing Card identity', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (init?.method === 'PUT') return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-2' });
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'chapter-a', collectionId: 'my-life', cardId: 'a', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'chapter-b', collectionId: 'my-life', cardId: 'b', role: 'chapter', order: 20, createdAt: 1, updatedAt: 1 },
          { docId: 'story', collectionId: 'my-life', cardId: 'story-card', parentPlacementId: 'chapter-a', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [
          { docId: 'a', title: 'First' },
          { docId: 'b', title: 'Second' },
          { docId: 'story-card', title: 'A Story' },
        ],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Parent for A Story' }), {
      target: { value: 'chapter-b' },
    });
    await waitFor(() => expect(screen.getByText('Placement parent updated.')).toBeInTheDocument());
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    const body = JSON.parse(String(putCall?.[1]?.body));
    expect(body.placements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        docId: 'story',
        cardId: 'story-card',
        parentPlacementId: 'chapter-b',
      }),
    ]));
  });

  it('adds an existing canonical Card as a new placement', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url.startsWith('/api/cards/search')) {
        return response({
          ok: true,
          items: [{ docId: 'found-card', title: 'Found Story' }],
          hasMore: false,
        });
      }
      if (init?.method === 'PUT') {
        return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-add' });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'first', collectionId: 'my-life', cardId: 'first-card', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [{ docId: 'first-card', title: 'First Story' }],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    fireEvent.change(await screen.findByRole('searchbox', { name: 'Find a Card to add' }), {
      target: { value: 'Found' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.getByText('Added Found Story to the Collection.')).toBeInTheDocument());
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    const body = JSON.parse(String(putCall?.[1]?.body));
    expect(body.expectedStructureRevision).toBe(3);
    expect(body.placements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'found-card',
        parentPlacementId: null,
        role: 'card',
        order: 20,
      }),
    ]));
    expect(screen.getByRole('button', { name: 'Found Story' })).toBeInTheDocument();
    expect(screen.getByText(/Revision 4/)).toBeInTheDocument();
  });

  it('creates a title-only Part Card and places it at Collection level', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url === '/api/cards' && init?.method === 'POST') {
        return response({
          docId: 'new-part-card', title: 'The Early Years', type: 'story', status: 'draft',
          content: '', displayMode: 'navigate', createdAt: 2, updatedAt: 2, dimensionReview: {},
        });
      }
      if (init?.method === 'PUT') {
        return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-part' });
      }
      return response({ ok: true, collection: activeCollection, placements: [], cards: [] });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Part' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Part title' }), {
      target: { value: 'The Early Years' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Part' }));

    expect(await screen.findByText('Part The Early Years created in the Collection.')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/cards' && init?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      title: 'The Early Years', type: 'story', status: 'draft', feedIncluded: false,
      content: '', displayMode: 'navigate',
    });
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(putCall?.[1]?.body)).placements).toEqual([
      expect.objectContaining({ cardId: 'new-part-card', parentPlacementId: null, role: 'part', order: 10 }),
    ]);
    expect(screen.getByRole('button', { name: 'The Early Years' })).toBeInTheDocument();
  });

  it('creates a Section only beneath an existing Chapter', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url === '/api/cards' && init?.method === 'POST') {
        return response({
          docId: 'new-section-card', title: 'School Days', type: 'story', status: 'draft',
          content: '', displayMode: 'navigate', createdAt: 2, updatedAt: 2, dimensionReview: {},
        });
      }
      if (init?.method === 'PUT') {
        return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-section' });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'part', collectionId: 'my-life', cardId: 'part-card', role: 'part', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'chapter', collectionId: 'my-life', cardId: 'chapter-card', parentPlacementId: 'part', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [
          { docId: 'part-card', title: 'Childhood' },
          { docId: 'chapter-card', title: 'Growing Up' },
        ],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Section' }));
    expect(screen.getByRole('combobox', { name: 'Section parent' })).toHaveValue('chapter');
    fireEvent.change(screen.getByRole('textbox', { name: 'Section title' }), {
      target: { value: 'School Days' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Section' }));

    expect(await screen.findByText('Section School Days created in the Collection.')).toBeInTheDocument();
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(putCall?.[1]?.body)).placements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'new-section-card', parentPlacementId: 'chapter', role: 'section', order: 10,
      }),
    ]));
  });

  it('removes only a leaf placement and preserves its canonical Card', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (init?.method === 'PUT') {
        return response({ ok: true, changed: true, structureRevision: 4, operationId: 'op-remove' });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'chapter', collectionId: 'my-life', cardId: 'chapter-card', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
          { docId: 'story', collectionId: 'my-life', cardId: 'story-card', parentPlacementId: 'chapter', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [
          { docId: 'chapter-card', title: 'Chapter' },
          { docId: 'story-card', title: 'A Story' },
        ],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Remove Chapter from Collection' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove A Story from Collection' }));

    await waitFor(() => expect(screen.getByText('Removed A Story from this Collection.')).toBeInTheDocument());
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    const body = JSON.parse(String(putCall?.[1]?.body));
    expect(body.placements).toEqual([
      expect.objectContaining({ docId: 'chapter', cardId: 'chapter-card' }),
    ]);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/cards/story-card'))).toBe(false);
  });

  it('creates an independent draft Collection from a structural placement', async () => {
    Object.defineProperty(window, 'prompt', { configurable: true, value: jest.fn(() => 'Childhood') });
    const promotedCollection = {
      ...activeCollection, docId: 'childhood', title: 'Childhood', structureRevision: 0, order: 20,
    };
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url.endsWith('/promote') && init?.method === 'POST') {
        return response({ ok: true, collection: promotedCollection, placementCount: 2, operationId: 'promote-childhood' });
      }
      if (url.includes('/childhood/structure')) {
        return response({ ok: true, collection: promotedCollection, placements: [], cards: [] });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'part', collectionId: 'my-life', cardId: 'part-card', role: 'part', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [{ docId: 'part-card', title: 'Childhood' }],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create Collection from Childhood' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/collections/my-life/promote',
      expect.objectContaining({ method: 'POST' })
    ));
    const promoteCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/promote'));
    expect(JSON.parse(String(promoteCall?.[1]?.body))).toEqual({
      sourcePlacementId: 'part', expectedStructureRevision: 3, title: 'Childhood',
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/collections/childhood/structure'));
  });

  it('shows placement-wide audience impact before the Collection audience is saved', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url === '/api/admin/journal-users') return response({ users: [] });
      if (url === '/api/admin/audience-groups') return response({ groups: [] });
      if (url.endsWith('/audience-impact') && init?.method === 'POST') {
        return response({
          impact: {
            basis: 'if_published_and_reader_valid',
            proposedRouteReaders: [],
            missingCardIds: [],
            cards: [{
              cardId: 'story-card', title: 'A Story', status: 'draft',
              effectiveReaders: [],
              routes: [{
                kind: 'this_collection', collectionId: 'my-life', title: 'My Life', readers: [],
              }],
            }],
          },
        });
      }
      return response({
        ok: true,
        collection: activeCollection,
        placements: [
          { docId: 'story', collectionId: 'my-life', cardId: 'story-card', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [{ docId: 'story-card', title: 'A Story', status: 'draft' }],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    expect(await screen.findByText(/If this Collection is published and reader-ready:/)).toBeInTheDocument();
    expect(screen.getByText('A Story', { selector: 'strong' }).parentElement).toHaveTextContent(
      'A Story (Draft): No enabled readers. Routes: My Life.'
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/collections/my-life/audience-impact',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('locks structural controls while a Collection is Published', async () => {
    const publishedCollection = { ...activeCollection, lifecycle: 'published' as const };
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [publishedCollection] });
      if (url === '/api/admin/journal-users') return response({ users: [] });
      if (url === '/api/admin/audience-groups') return response({ groups: [] });
      if (url.endsWith('/audience-impact') && init?.method === 'POST') {
        return response({ impact: { basis: 'current_after_save', proposedRouteReaders: [], cards: [], missingCardIds: [] } });
      }
      return response({
        ok: true,
        collection: publishedCollection,
        placements: [
          { docId: 'story', collectionId: 'my-life', cardId: 'story-card', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
        ],
        cards: [{ docId: 'story-card', title: 'A Story', status: 'published' }],
      });
    }) as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Return to Draft' })).toBeInTheDocument();
    expect(screen.getByText(/Published structure is locked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Part' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Chapter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Section' })).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: 'Find a Card to add' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Role for A Story' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove A Story from Collection' })).toBeDisabled();
  });

  it('publishes through the confirmed lifecycle action and updates the local Collection state', async () => {
    const confirm = jest.fn(() => true);
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirm });
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/collections') return response({ ok: true, collections: [activeCollection] });
      if (url === '/api/admin/journal-users') return response({ users: [] });
      if (url === '/api/admin/audience-groups') return response({ groups: [] });
      if (url.endsWith('/audience-impact') && init?.method === 'POST') {
        return response({ impact: { basis: 'if_published_and_reader_valid', proposedRouteReaders: [], cards: [], missingCardIds: [] } });
      }
      if (url.endsWith('/lifecycle') && init?.method === 'PATCH') {
        return response({
          ok: true,
          collection: { ...activeCollection, lifecycle: 'published', updatedAt: 2 },
        });
      }
      return response({ ok: true, collection: activeCollection, placements: [], cards: [] });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<DurableCollectionStudioPane onAvailabilityChange={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Publish Collection' }));
    expect(await screen.findByText('Collection published to its confirmed audience.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Draft' })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Publishing makes this Collection'));
    const lifecycleCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/lifecycle'));
    expect(JSON.parse(String(lifecycleCall?.[1]?.body))).toEqual({ lifecycle: 'published' });
  });
});
