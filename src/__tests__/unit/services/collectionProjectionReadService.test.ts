import {
  getActiveCollectionStructure,
  getReaderCollectionStructure,
  listActiveCollections,
  listReaderCollections,
} from '@/lib/services/collections/collectionProjectionReadService';

function document(id: string, data: Record<string, unknown>) {
  return { id, exists: true, data: () => data };
}

function firestoreFixture(
  recordState: 'active' | 'shadow',
  lifecycle: 'draft' | 'published' = 'draft',
  cardStatus: 'draft' | 'published' = 'draft'
) {
  const collectionDoc = document('my-life', {
    title: 'My Life', lifecycle, recordState, structureRevision: 2,
    order: 10, createdAt: 1, updatedAt: 1,
  });
  const placementDoc = document('chapter', {
    collectionId: 'my-life', cardId: 'card-1', role: 'chapter', order: 10,
    createdAt: 1, updatedAt: 1,
  });
  const cardDoc = document('card-1', { title: 'Childhood', status: cardStatus, type: 'story' });
  const collections = {
    doc: jest.fn(() => ({ get: jest.fn(async () => collectionDoc) })),
    where: jest.fn(() => ({ get: jest.fn(async () => ({ docs: recordState === 'active' ? [collectionDoc] : [] })) })),
  };
  const placements = {
    where: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [placementDoc] })) })),
  };
  const cards = {
    where: jest.fn(() => ({ get: jest.fn(async () => ({ forEach: (visit: (doc: typeof cardDoc) => void) => visit(cardDoc) })) })),
  };
  const firestore = {
    collection: jest.fn((name: string) => {
      if (name === 'collections') return collections;
      if (name === 'collection_placements') return placements;
      if (name === 'cards') return cards;
      throw new Error(`Unexpected collection ${name}`);
    }),
  };
  return { firestore: firestore as never, collections, placements, cards };
}

describe('active Collection Studio read owner', () => {
  it('lists and loads an active placement graph with its canonical Card summaries', async () => {
    const fixture = firestoreFixture('active');
    await expect(listActiveCollections(fixture.firestore)).resolves.toEqual([
      expect.objectContaining({ docId: 'my-life', recordState: 'active', structureRevision: 2 }),
    ]);
    await expect(getActiveCollectionStructure('my-life', fixture.firestore)).resolves.toMatchObject({
      collection: { docId: 'my-life', recordState: 'active', structureRevision: 2 },
      placements: [{ docId: 'chapter', cardId: 'card-1' }],
      cards: [{ docId: 'card-1', title: 'Childhood' }],
    });
  });

  it('hides an inactive shadow before reading any referenced Cards', async () => {
    const fixture = firestoreFixture('shadow');
    await expect(getActiveCollectionStructure('my-life', fixture.firestore)).resolves.toBeNull();
    expect(fixture.cards.where).not.toHaveBeenCalled();
  });

  it('lets the author inspect active drafts while readers see only fully published structures', async () => {
    const draft = firestoreFixture('active');
    await expect(listReaderCollections({ includeDrafts: true, firestore: draft.firestore })).resolves.toHaveLength(1);
    await expect(listReaderCollections({ includeDrafts: false, firestore: draft.firestore })).resolves.toEqual([]);
    await expect(getReaderCollectionStructure({
      collectionId: 'my-life', includeDrafts: true, firestore: draft.firestore,
    })).resolves.not.toBeNull();
    await expect(getReaderCollectionStructure({
      collectionId: 'my-life', includeDrafts: false, firestore: draft.firestore,
    })).resolves.toBeNull();

    const published = firestoreFixture('active', 'published', 'published');
    await expect(getReaderCollectionStructure({
      collectionId: 'my-life', includeDrafts: false, firestore: published.firestore,
    })).resolves.not.toBeNull();
  });

  it('fails closed for a reader when a published Collection references a draft Card', async () => {
    const fixture = firestoreFixture('active', 'published', 'draft');
    await expect(getReaderCollectionStructure({
      collectionId: 'my-life', includeDrafts: false, firestore: fixture.firestore,
    })).resolves.toBeNull();
  });
});
