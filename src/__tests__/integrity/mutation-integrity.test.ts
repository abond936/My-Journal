const incrementMock = jest.fn((value: number) => ({ __op: 'increment', value }));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (value: number) => incrementMock(value),
  },
}));

var docMock: jest.Mock;
var collectionMock: jest.Mock;

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    docMock = jest.fn((id: string) => ({ id, path: `tags/${id}` }));
    collectionMock = jest.fn(() => ({
      doc: docMock,
    }));
    return {
      firestore: () => ({
        collection: collectionMock,
      }),
    };
  },
}));

import { updateTagCountsForCard } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

type MockTxn = {
  getAll: jest.Mock<Promise<any[]>, any[]>;
  update: jest.Mock<void, any[]>;
};

function makeTxn(): MockTxn {
  const txn: MockTxn = {
    getAll: jest.fn(async (...refs: Array<{ id: string }>) =>
      refs.map((r) => ({ id: r.id, exists: true, data: () => ({}) }))
    ),
    update: jest.fn(),
  };
  return txn;
}

function makeLookup(tags: Array<Pick<Tag, 'docId' | 'path'>>): Map<string, Tag> {
  return new Map(
    tags.map((t) => [
      t.docId!,
      {
        docId: t.docId!,
        name: t.docId!,
        dimension: 'what',
        parentId: undefined,
        path: t.path || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cardCount: 0,
        mediaCount: 0,
      } as Tag,
    ])
  );
}

describe('Mutation integrity: updateTagCountsForCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments tag and ancestor counts on draft -> published create flow', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root-a'] },
      { docId: 'root-a', path: [] },
    ]);

    await updateTagCountsForCard(
      null,
      { status: 'published', tags: ['tag-a'] },
      txn as any,
      lookup
    );

    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-a' }),
      { cardCount: { __op: 'increment', value: 1 } }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'root-a' }),
      { cardCount: { __op: 'increment', value: 1 } }
    );
  });

  it('applies add/remove deltas on published -> published tag replacement', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root-a'] },
      { docId: 'root-a', path: [] },
      { docId: 'tag-b', path: ['root-b'] },
      { docId: 'root-b', path: [] },
    ]);

    await updateTagCountsForCard(
      { status: 'published', tags: ['tag-a'] },
      { status: 'published', tags: ['tag-b'] },
      txn as any,
      lookup
    );

    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-a' }),
      { cardCount: { __op: 'increment', value: -1 } }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'root-a' }),
      { cardCount: { __op: 'increment', value: -1 } }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-b' }),
      { cardCount: { __op: 'increment', value: 1 } }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'root-b' }),
      { cardCount: { __op: 'increment', value: 1 } }
    );
  });

  it('decrements published tag counts on published -> draft transition', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root-a'] },
      { docId: 'root-a', path: [] },
    ]);

    await updateTagCountsForCard(
      { status: 'published', tags: ['tag-a'] },
      { status: 'draft', tags: ['tag-a'] },
      txn as any,
      lookup
    );

    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-a' }),
      { cardCount: { __op: 'increment', value: -1 } }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'root-a' }),
      { cardCount: { __op: 'increment', value: -1 } }
    );
  });

  it('makes no count updates when card stays draft', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([{ docId: 'tag-a', path: ['root-a'] }]);

    await updateTagCountsForCard(
      { status: 'draft', tags: ['tag-a'] },
      { status: 'draft', tags: ['tag-a'] },
      txn as any,
      lookup
    );

    expect(txn.update).not.toHaveBeenCalled();
    expect(txn.getAll).not.toHaveBeenCalled();
  });
});
