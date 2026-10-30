import { replaceCollectionPlacementStructure } from '@/lib/services/collections/collectionPlacementMutationService';

type Stored = Record<string, Map<string, Record<string, unknown>>>;

function fakeFirestore(initial: Stored) {
  const writes: Array<{ kind: string; collection: string; id: string }> = [];
  const ref = (collection: string, id: string) => ({ kind: 'ref', collection, id });
  const firestore = {
    collection(name: string) {
      return {
        doc(id: string) { return ref(name, id); },
        where(field: string, _operator: string, value: unknown) {
          return { kind: 'query', collection: name, field, value };
        },
      };
    },
    async runTransaction(callback: (transaction: Record<string, (...args: unknown[]) => unknown>) => unknown) {
      const transaction = {
        async get(target: { kind: string; collection: string; id?: string; field?: string; value?: unknown }) {
          if (target.kind === 'query') {
            const docs = Array.from(initial[target.collection]?.entries() ?? [])
              .filter(([, data]) => data[target.field!] === target.value)
              .map(([id, data]) => ({ id, data: () => data }));
            return { docs };
          }
          const data = initial[target.collection]?.get(target.id!);
          return { id: target.id, exists: Boolean(data), data: () => data };
        },
        async getAll(...targets: Array<{ collection: string; id: string }>) {
          return targets.map((target) => {
            const data = initial[target.collection]?.get(target.id);
            return { id: target.id, exists: Boolean(data), data: () => data };
          });
        },
        set(target: { collection: string; id: string }, data: Record<string, unknown>) {
          initial[target.collection].set(target.id, data);
          writes.push({ kind: 'set', collection: target.collection, id: target.id });
        },
        update(target: { collection: string; id: string }, data: Record<string, unknown>) {
          initial[target.collection].set(target.id, { ...initial[target.collection].get(target.id), ...data });
          writes.push({ kind: 'update', collection: target.collection, id: target.id });
        },
        delete(target: { collection: string; id: string }) {
          initial[target.collection].delete(target.id);
          writes.push({ kind: 'delete', collection: target.collection, id: target.id });
        },
        create(target: { collection: string; id: string }, data: Record<string, unknown>) {
          if (initial[target.collection].has(target.id)) throw new Error('already exists');
          initial[target.collection].set(target.id, data);
          writes.push({ kind: 'create', collection: target.collection, id: target.id });
        },
      };
      return callback(transaction);
    },
  };
  return { firestore: firestore as never, writes, stored: initial };
}

function records(recordState: 'active' | 'shadow' = 'active'): Stored {
  return {
    collections: new Map([['my-life', {
      title: 'My Life', lifecycle: 'draft', recordState, structureRevision: 0,
      order: 10, createdAt: 1, updatedAt: 1,
    }]]),
    collection_placements: new Map([
      ['chapter', {
        collectionId: 'my-life', cardId: 'chapter-card', role: 'chapter', order: 10,
        createdAt: 1, updatedAt: 1,
      }],
      ['story', {
        collectionId: 'my-life', cardId: 'story-card', parentPlacementId: 'chapter', role: 'card', order: 10,
        createdAt: 1, updatedAt: 1,
      }],
    ]),
    cards: new Map([['chapter-card', {}], ['story-card', {}]]),
    collection_structure_operations: new Map(),
  };
}

describe('replaceCollectionPlacementStructure', () => {
  it('commits changed placements, the revision, and recovery operation in one transaction owner', async () => {
    const fake = fakeFirestore(records());
    const result = await replaceCollectionPlacementStructure({
      collectionId: 'my-life',
      expectedStructureRevision: 0,
      placements: [
        { docId: 'chapter', cardId: 'chapter-card', role: 'chapter', order: 20, parentPlacementId: null },
        { docId: 'story', cardId: 'story-card', role: 'card', order: 10, parentPlacementId: 'chapter' },
      ],
      now: 100,
      firestore: fake.firestore,
    });
    expect(result.nextRevision).toBe(1);
    expect(fake.stored.collections.get('my-life')).toMatchObject({ structureRevision: 1, updatedAt: 100 });
    expect(fake.stored.collection_placements.get('chapter')).toMatchObject({ order: 20, updatedAt: 100 });
    expect(fake.writes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'set', collection: 'collection_placements', id: 'chapter' }),
      expect.objectContaining({ kind: 'update', collection: 'collections', id: 'my-life' }),
      expect.objectContaining({ kind: 'create', collection: 'collection_structure_operations' }),
    ]));
    expect(fake.writes.some((write) => write.collection === 'cards')).toBe(false);
  });

  it('rejects an inactive shadow before recording any write', async () => {
    const fake = fakeFirestore(records('shadow'));
    await expect(replaceCollectionPlacementStructure({
      collectionId: 'my-life',
      expectedStructureRevision: 0,
      placements: [],
      now: 100,
      firestore: fake.firestore,
    })).rejects.toMatchObject({ code: 'COLLECTION_NOT_ACTIVE' });
    expect(fake.writes).toEqual([]);
  });
});
