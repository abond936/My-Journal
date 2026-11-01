import {
  CollectionTitleConflictError,
  createActiveCollection,
} from '@/lib/services/collections/collectionCreationService';

function storedDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

function fakeFirestore(existing: Array<{ id: string; data: Record<string, unknown> }>) {
  const create = jest.fn();
  const collectionRef = {
    doc: jest.fn(() => ({ id: 'new-collection' })),
  };
  const transaction = {
    get: jest.fn(async () => ({ docs: existing.map((item) => storedDoc(item.id, item.data)) })),
    create,
  };
  return {
    create,
    firestore: {
      collection: jest.fn(() => collectionRef),
      runTransaction: jest.fn(async (callback: (value: typeof transaction) => unknown) => callback(transaction)),
    } as never,
  };
}

const existingCollection = {
  title: 'My Life',
  lifecycle: 'draft',
  recordState: 'active',
  structureRevision: 2,
  authorityRevision: 1,
  order: 10,
  createdAt: 1,
  updatedAt: 1,
};

describe('createActiveCollection', () => {
  it('creates the next ordered Collection as a private empty draft', async () => {
    const fake = fakeFirestore([{ id: 'my-life', data: existingCollection }]);

    const created = await createActiveCollection({
      title: ' Family Stories ',
      description: ' Shared memories ',
      now: 100,
      firestore: fake.firestore,
    });

    expect(created).toMatchObject({
      docId: 'new-collection',
      title: 'Family Stories',
      description: 'Shared memories',
      lifecycle: 'draft',
      recordState: 'active',
      structureRevision: 0,
      authorityRevision: 1,
      authorityEstablishedAt: 100,
      order: 20,
      createdAt: 100,
      updatedAt: 100,
    });
    expect(created).not.toHaveProperty('audience');
    expect(fake.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-collection' }), created);
  });

  it('rejects a case-insensitive duplicate active title', async () => {
    const fake = fakeFirestore([{ id: 'my-life', data: existingCollection }]);

    await expect(createActiveCollection({
      title: 'my life',
      firestore: fake.firestore,
    })).rejects.toBeInstanceOf(CollectionTitleConflictError);
    expect(fake.create).not.toHaveBeenCalled();
  });
});
