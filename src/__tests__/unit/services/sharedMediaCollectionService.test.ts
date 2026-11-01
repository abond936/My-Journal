import {
  createSharedMediaCollection,
  getSharedMediaCollection,
  SharedMediaCollectionError,
  updateSharedMediaCollection,
} from '@/lib/services/sharedMediaCollectionService';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

const baseCollection = {
  title: 'Family photos',
  description: null,
  mediaIds: ['media-1'],
  lifecycle: 'draft',
  revision: 0,
  order: 10,
  createdAt: 1,
  updatedAt: 1,
};

describe('sharedMediaCollectionService', () => {
  it('creates a normalized private draft without persisting its document id', async () => {
    const create = jest.fn();
    const collectionRef = { id: 'shared-1' };
    const transaction = {
      get: jest.fn().mockResolvedValue({ docs: [doc('existing', { ...baseCollection, title: 'Older', order: 20 })] }),
      create,
    };
    const firestore = {
      collection: jest.fn(() => ({ doc: jest.fn(() => collectionRef) })),
      runTransaction: jest.fn((callback: (value: typeof transaction) => unknown) => callback(transaction)),
    };

    const created = await createSharedMediaCollection({
      title: ' Family reunion ',
      mediaIds: ['media-2', 'media-2', ' media-3 '],
      now: 50,
      firestore: firestore as never,
    });

    expect(created).toMatchObject({
      docId: 'shared-1', title: 'Family reunion', mediaIds: ['media-2', 'media-3'],
      lifecycle: 'draft', revision: 0, order: 30,
    });
    expect(create).toHaveBeenCalledWith(collectionRef, expect.not.objectContaining({ docId: expect.anything() }));
  });

  it('publishes only with a real audience and protected deliverable Media', async () => {
    const set = jest.fn();
    const transaction = {
      get: jest.fn((target: { id?: string }) => Promise.resolve(
        target.id === 'shared-1'
          ? doc('shared-1', baseCollection)
          : { docs: [doc('shared-1', baseCollection)] }
      )),
      getAll: jest.fn().mockResolvedValue([doc('media-1', { storagePath: 'media/media-1.jpg' })]),
      set,
    };
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((id: string) => ({ id, name })),
      })),
      getAll: jest.fn().mockResolvedValue([]),
      runTransaction: jest.fn((callback: (value: typeof transaction) => unknown) => callback(transaction)),
    };

    const published = await updateSharedMediaCollection({
      id: 'shared-1',
      expectedRevision: 0,
      audience: { allContacts: true, groupIds: [], contactIds: [] },
      lifecycle: 'published',
      now: 60,
      firestore: firestore as never,
    });

    expect(published).toMatchObject({ lifecycle: 'published', revision: 1, updatedAt: 60 });
    expect(transaction.getAll).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shared-1' }),
      expect.not.objectContaining({ docId: expect.anything() })
    );
  });

  it.each([
    [
      'AUDIENCE_REQUIRED',
      { lifecycle: 'published' as const },
      [doc('media-1', { storagePath: 'media/media-1.jpg' })],
    ],
    [
      'MEDIA_NOT_DELIVERABLE',
      { lifecycle: 'published' as const, audience: { allContacts: true, groupIds: [], contactIds: [] } },
      [doc('media-1', {})],
    ],
  ])('rejects publication with %s', async (code, changes, mediaDocs) => {
    const transaction = {
      get: jest.fn((target: { id?: string }) => Promise.resolve(
        target.id === 'shared-1' ? doc('shared-1', baseCollection) : { docs: [doc('shared-1', baseCollection)] }
      )),
      getAll: jest.fn().mockResolvedValue(mediaDocs),
      set: jest.fn(),
    };
    const firestore = {
      collection: jest.fn((name: string) => ({ doc: jest.fn((id: string) => ({ id, name })) })),
      getAll: jest.fn().mockResolvedValue([]),
      runTransaction: jest.fn((callback: (value: typeof transaction) => unknown) => callback(transaction)),
    };

    await expect(updateSharedMediaCollection({
      id: 'shared-1', expectedRevision: 0, ...changes, firestore: firestore as never,
    })).rejects.toMatchObject({ code });
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('requires returning published content to draft before changing its photos', async () => {
    const published = { ...baseCollection, lifecycle: 'published', revision: 4 };
    const ref = { id: 'shared-1' };
    const transaction = {
      get: jest.fn((target: { id?: string }) => Promise.resolve(
        target.id === 'shared-1' ? doc('shared-1', published) : { docs: [doc('shared-1', published)] }
      )),
      set: jest.fn(),
    };
    const firestore = {
      collection: jest.fn(() => ({ doc: jest.fn(() => ref) })),
      runTransaction: jest.fn((callback: (value: typeof transaction) => unknown) => callback(transaction)),
    };

    await expect(updateSharedMediaCollection({
      id: 'shared-1', expectedRevision: 4, mediaIds: ['media-2'], firestore: firestore as never,
    })).rejects.toEqual(expect.objectContaining<Partial<SharedMediaCollectionError>>({ code: 'PUBLISHED_LOCKED' }));
  });

  it('hydrates Media in the author-defined order', async () => {
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(doc('shared-1', {
          ...baseCollection, mediaIds: ['media-2', 'media-1'],
        })) })),
        where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [
          doc('media-1', { filename: 'one.jpg' }),
          doc('media-2', { filename: 'two.jpg' }),
        ] }) })),
        name,
      })),
    };

    const result = await getSharedMediaCollection({ id: 'shared-1', firestore: firestore as never });

    expect(result?.media.map((item) => item.docId)).toEqual(['media-2', 'media-1']);
  });
});
