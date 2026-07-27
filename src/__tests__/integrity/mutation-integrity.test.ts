const incrementMock = jest.fn((value: number) => ({ __op: 'increment', value }));
const arrayUnionMock = jest.fn((value: string) => ({ __op: 'arrayUnion', value }));
const arrayRemoveMock = jest.fn((value: string) => ({ __op: 'arrayRemove', value }));

type TagDocRef = { id: string; path: string };
type TagSnap = { id: string; exists: true; data: () => Record<string, never> };

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (value: number) => incrementMock(value),
    arrayUnion: (value: string) => arrayUnionMock(value),
    arrayRemove: (value: string) => arrayRemoveMock(value),
  },
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const docMock = jest.fn((id: string) => ({ id, path: `tags/${id}` }));
    const collectionMock = jest.fn(() => ({
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
  getAll: jest.Mock<Promise<TagSnap[]>, TagDocRef[]>;
  update: jest.Mock<void, [TagDocRef, { cardCount: { __op: string; value: number } }]>;
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

  it('increments tag and ancestor counts for a newly created card regardless of status', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root-a'] },
      { docId: 'root-a', path: [] },
    ]);

    await updateTagCountsForCard(
      null,
      { status: 'published', tags: ['tag-a'] },
      txn as unknown as FirebaseFirestore.Transaction,
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
      txn as unknown as FirebaseFirestore.Transaction,
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

  it('does not change Studio assignment counts when publication status changes', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root-a'] },
      { docId: 'root-a', path: [] },
    ]);

    await updateTagCountsForCard(
      { status: 'published', tags: ['tag-a'] },
      { status: 'draft', tags: ['tag-a'] },
      txn as unknown as FirebaseFirestore.Transaction,
      lookup
    );

    expect(txn.update).not.toHaveBeenCalled();
  });

  it('makes no count updates when card stays draft', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([{ docId: 'tag-a', path: ['root-a'] }]);

    await updateTagCountsForCard(
      { status: 'draft', tags: ['tag-a'] },
      { status: 'draft', tags: ['tag-a'] },
      txn as unknown as FirebaseFirestore.Transaction,
      lookup
    );

    expect(txn.update).not.toHaveBeenCalled();
    expect(txn.getAll).not.toHaveBeenCalled();
  });

  it('counts a card only once on a shared ancestor and maintains unique membership', async () => {
    const txn = makeTxn();
    const lookup = makeLookup([
      { docId: 'tag-a', path: ['root'] },
      { docId: 'tag-b', path: ['root'] },
      { docId: 'root', path: [] },
    ]);

    await updateTagCountsForCard(
      { docId: 'card-1', status: 'draft', tags: ['tag-a'] },
      { docId: 'card-1', status: 'draft', tags: ['tag-b'] },
      txn as unknown as FirebaseFirestore.Transaction,
      lookup
    );

    expect(txn.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'root' }),
      expect.anything()
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-a' }),
      {
        cardCount: { __op: 'increment', value: -1 },
        uniqueCardIds: { __op: 'arrayRemove', value: 'card-1' },
      }
    );
    expect(txn.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-b' }),
      {
        cardCount: { __op: 'increment', value: 1 },
        uniqueCardIds: { __op: 'arrayUnion', value: 'card-1' },
      }
    );
  });
});
