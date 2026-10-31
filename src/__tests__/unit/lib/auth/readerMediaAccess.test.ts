import { canReadMedia } from '@/lib/auth/readerMediaAccess';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));

function firestoreWithCards(
  cards: Array<{ id: string; data: Record<string, unknown> }>,
  groupIds: string[] = []
) {
  const collection = jest.fn((name: string) => ({
    where: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        docs:
          name === 'cards'
            ? cards.map((card) => ({ id: card.id, data: () => card.data }))
            : name === 'audience_groups'
              ? groupIds.map((id) => ({ id, data: () => ({}) }))
              : [],
      }),
    })),
  }));
  return { collection };
}

describe('Reader Media authorization', () => {
  const viewer = { user: { id: 'viewer', role: 'viewer' } } as never;
  const admin = { user: { id: 'admin', role: 'admin' } } as never;

  it('allows the author without requiring a Card reference', async () => {
    const firestore = firestoreWithCards([]);
    await expect(
      canReadMedia(admin, { docId: 'media-1', referencedByCardIds: [] }, firestore as never)
    ).resolves.toBe(true);
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  it('allows a viewer only when a published Card actually references the Media', async () => {
    const firestore = firestoreWithCards([
      {
        id: 'card-1',
        data: { status: 'published', coverImageId: 'media-1' },
      },
    ]);
    await expect(
      canReadMedia(
        viewer,
        { docId: 'media-1', referencedByCardIds: ['card-1'] },
        firestore as never
      )
    ).resolves.toBe(true);
  });

  it('denies stale references, draft-only references, and unreferenced Media', async () => {
    const stale = firestoreWithCards([
      { id: 'card-1', data: { status: 'published', coverImageId: 'other-media' } },
    ]);
    const draft = firestoreWithCards([
      { id: 'card-2', data: { status: 'draft', coverImageId: 'media-1' } },
    ]);

    await expect(
      canReadMedia(viewer, { docId: 'media-1', referencedByCardIds: ['card-1'] }, stale as never)
    ).resolves.toBe(false);
    await expect(
      canReadMedia(viewer, { docId: 'media-1', referencedByCardIds: ['card-2'] }, draft as never)
    ).resolves.toBe(false);
    await expect(
      canReadMedia(viewer, { docId: 'media-1', referencedByCardIds: [] }, stale as never)
    ).resolves.toBe(false);
  });

  it('denies referenced Media when no active Card or Collection audience includes the viewer', async () => {
    const firestore = firestoreWithCards([
      {
        id: 'card-1',
        data: {
          status: 'published',
          coverImageId: 'media-1',
          audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
        },
      },
    ]);

    await expect(
      canReadMedia(
        viewer,
        { docId: 'media-1', referencedByCardIds: ['card-1'] },
        firestore as never
      )
    ).resolves.toBe(false);
  });
});
