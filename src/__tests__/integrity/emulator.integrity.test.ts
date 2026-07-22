import { initializeApp, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  IntegrityCard,
  IntegrityMedia,
  IntegrityTag,
  findBrokenMediaBackReferences,
  findDanglingCardMediaReferences,
  findDerivedFieldViolations,
  findTagCountViolations,
} from '@/lib/integrity/invariantChecks';

const mockStorageFileSave = jest.fn(async () => undefined);

jest.mock('sharp', () => {
  return () => ({
    metadata: async () => ({
      format: 'webp',
      width: 640,
      height: 480,
    }),
  });
});

jest.mock('image-size', () => ({
  __esModule: true,
  default: () => ({ width: 640, height: 480 }),
}));

jest.mock('@/lib/services/typesenseMediaService', () => ({
  syncMediaToTypesense: jest.fn(),
  syncMediaToTypesenseById: jest.fn(),
  removeMediaFromTypesense: jest.fn(),
}));

jest.mock('@/lib/services/typesenseService', () => ({
  syncCardToTypesense: jest.fn(),
  removeCardFromTypesense: jest.fn(),
}));

jest.mock('@/lib/services/questionService', () => ({
  QuestionAnswerConflictError: class QuestionAnswerConflictError extends Error {},
  unlinkCardFromAllQuestions: jest.fn(async () => undefined),
}));

jest.mock('@/lib/services/images/mediaStorage', () => ({
  deleteMediaAsset: jest.fn(async (mediaId: string, transaction?: FirebaseFirestore.Transaction) => {
    const { getApps } = jest.requireActual<typeof import('firebase-admin/app')>('firebase-admin/app');
    const { getFirestore } = jest.requireActual<typeof import('firebase-admin/firestore')>('firebase-admin/firestore');
    const database = getFirestore(getApps()[0]);
    const mediaRef = database.collection('media').doc(mediaId);
    const mediaSnap = transaction ? await transaction.get(mediaRef) : await mediaRef.get();
    const digest = mediaSnap.data()?.contentIdentity?.digest;
    const identityRef = typeof digest === 'string'
      ? database.collection('mediaContentIdentities').doc(digest)
      : null;
    if (transaction) {
      if (identityRef) transaction.delete(identityRef);
      transaction.delete(mediaRef);
    } else {
      if (identityRef) await identityRef.delete();
      await mediaRef.delete();
    }
  }),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const { getApps, initializeApp } = jest.requireActual<typeof import('firebase-admin/app')>('firebase-admin/app');
    const { getFirestore } = jest.requireActual<typeof import('firebase-admin/firestore')>('firebase-admin/firestore');
    const app =
      getApps()[0] ??
      initializeApp({
        projectId: 'demo-my-journal-integrity',
        storageBucket: 'demo-my-journal-integrity.appspot.com',
      });
    return {
      firestore: () => getFirestore(app),
      storage: () => ({
        bucket: () => ({
          file: () => ({
            save: mockStorageFileSave,
            exists: async () => [true] as [boolean],
            delete: async () => undefined,
            setMetadata: async () => undefined,
          }),
        }),
      }),
    };
  },
}));

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIfEmulator = hasEmulator ? describe : describe.skip;

type CardServiceModule =
  typeof import('@/lib/services/cards/cardLifecycleService') &
  typeof import('@/lib/services/cards/cardMediaLifecycleService') &
  typeof import('@/lib/services/cards/cardTagMutationService') &
  typeof import('@/lib/services/cards/cardCoverMutationService');
let cardServiceModulePromise: Promise<CardServiceModule> | null = null;
type ImageImportServiceModule = typeof import('@/lib/services/images/imageImportService');
let imageImportServiceModulePromise: Promise<ImageImportServiceModule> | null = null;

function getCardService(): Promise<CardServiceModule> {
  if (!cardServiceModulePromise) {
    cardServiceModulePromise = Promise.all([
      import('@/lib/services/cards/cardLifecycleService'),
      import('@/lib/services/cards/cardMediaLifecycleService'),
      import('@/lib/services/cards/cardTagMutationService'),
      import('@/lib/services/cards/cardCoverMutationService'),
    ]).then(([lifecycle, media, tags, cover]) => ({
      ...lifecycle,
      ...media,
      ...tags,
      ...cover,
    }) as CardServiceModule);
  }
  return cardServiceModulePromise;
}

function getImageImportService(): Promise<ImageImportServiceModule> {
  if (!imageImportServiceModulePromise) {
    imageImportServiceModulePromise = import('@/lib/services/images/imageImportService');
  }
  return imageImportServiceModulePromise;
}

describeIfEmulator('Integrity gate (Firestore emulator)', () => {
  jest.setTimeout(30000);
  let app: App;
  const projectId = 'demo-my-journal-integrity';

  beforeAll(async () => {
    if (!hasEmulator) return;
    if (getApps().length === 0) {
      app = initializeApp({
        projectId,
        storageBucket: 'demo-my-journal-integrity.appspot.com',
      });
    } else {
      app = getApps()[0]!;
    }
  });

  afterEach(async () => {
    if (!hasEmulator) return;
    jest.clearAllMocks();
    const db = getFirestore(app);
    await clearCollection(db, 'cards');
    await clearCollection(db, 'media');
    await clearCollection(db, 'mediaContentIdentities');
    await clearCollection(db, 'mediaDuplicateReviews');
    await clearCollection(db, 'tags');
  });

  afterAll(async () => {
    if (!hasEmulator) return;
    if (app) {
      await deleteApp(app);
    }
  });

  it('keeps references and derived fields consistent on representative create/update/delete path', async () => {
    const db = getFirestore(app);

    // Tags (with ancestor path)
    await db.collection('tags').doc('who-root').set({ name: 'Who', dimension: 'who', path: [], cardCount: 0, mediaCount: 0 });
    await db.collection('tags').doc('who-child').set({
      name: 'Alice',
      dimension: 'who',
      parentId: 'who-root',
      path: ['who-root'],
      cardCount: 0,
      mediaCount: 0,
    });

    // Media
    await db.collection('media').doc('media-1').set({ referencedByCardIds: ['card-1'] });
    await db.collection('media').doc('media-2').set({ referencedByCardIds: [] });

    // Create-like write
    await db.collection('cards').doc('card-1').set({
      docId: 'card-1',
      status: 'published',
      coverImageId: 'media-1',
      galleryMedia: [],
      contentMedia: [],
      tags: ['who-child'],
      filterTags: { 'who-child': true, 'who-root': true },
      who: ['who-child', 'who-root'],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection('tags').doc('who-child').update({ cardCount: FieldValue.increment(1) });
    await db.collection('tags').doc('who-root').update({ cardCount: FieldValue.increment(1) });

    // Update-like write: move cover to media-2 and keep backrefs in sync
    await db.collection('cards').doc('card-1').update({
      coverImageId: 'media-2',
      updatedAt: Date.now(),
    });
    await db.collection('media').doc('media-1').update({ referencedByCardIds: [] });
    await db.collection('media').doc('media-2').update({ referencedByCardIds: ['card-1'] });

    const cards = await readCards(db);
    const media = await readMedia(db);
    const tags = await readTags(db);
    const tagLookup = new Map(tags.map((t) => [t.docId, t]));

    expect(findDanglingCardMediaReferences(cards, media)).toEqual([]);
    expect(findBrokenMediaBackReferences(cards, media)).toEqual([]);
    expect(findDerivedFieldViolations(cards[0], tagLookup)).toEqual([]);
  });

  it('detects corruption when a card references missing media', async () => {
    const db = getFirestore(app);

    await db.collection('media').doc('media-keep').set({ referencedByCardIds: [] });
    await db.collection('cards').doc('card-bad').set({
      docId: 'card-bad',
      status: 'published',
      coverImageId: 'media-missing',
      galleryMedia: [{ mediaId: 'media-keep' }],
      contentMedia: [],
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const cards = await readCards(db);
    const media = await readMedia(db);
    const dangling = findDanglingCardMediaReferences(cards, media);

    expect(dangling).toEqual([
      { cardId: 'card-bad', mediaId: 'media-missing', field: 'coverImageId' },
    ]);
  });

  it('reconciles stale media backrefs and detaches all card surfaces during delete', async () => {
    const db = getFirestore(app);
    const { deleteMediaWithCardCleanup, getCardsReferencingMedia } = await getCardService();

    await db.collection('media').doc('media-delete').set({
      filename: 'delete-me.jpg',
      storagePath: 'images/delete-me.jpg',
      referencedByCardIds: ['card-only-cover'],
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-multi').set({
      docId: 'card-multi',
      status: 'published',
      coverImageId: 'media-delete',
      galleryMedia: [{ mediaId: 'media-delete', order: 0 }],
      contentMedia: ['media-delete'],
      content: '<p>before</p><figure data-media-id="media-delete"><img src="x" /></figure>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Authoritative scan should discover actual references beyond stale referencedByCardIds.
    const refsBeforeDelete = await getCardsReferencingMedia('media-delete');
    expect(refsBeforeDelete).toEqual(['card-multi']);

    await deleteMediaWithCardCleanup('media-delete');

    const cardAfter = await db.collection('cards').doc('card-multi').get();
    expect(cardAfter.exists).toBe(true);
    const after = cardAfter.data() as IntegrityCard;
    expect(after.coverImageId ?? null).toBeNull();
    expect(after.galleryMedia ?? []).toEqual([]);
    expect(after.contentMedia ?? []).toEqual([]);
    expect((after as { content?: string }).content ?? '').not.toContain('media-delete');

    const mediaAfter = await db.collection('media').doc('media-delete').get();
    expect(mediaAfter.exists).toBe(false);
  });

  it('cleans up shared media references across multiple cards before deleting the media doc', async () => {
    const db = getFirestore(app);
    const { deleteMediaWithCardCleanup, getCardsReferencingMedia } = await getCardService();

    await db.collection('media').doc('media-shared').set({
      filename: 'shared.jpg',
      storagePath: 'images/shared.jpg',
      referencedByCardIds: ['stale-card-id'],
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-cover-only').set({
      docId: 'card-cover-only',
      status: 'published',
      coverImageId: 'media-shared',
      galleryMedia: [],
      contentMedia: [],
      content: '<p>cover only</p>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-gallery-and-content').set({
      docId: 'card-gallery-and-content',
      status: 'published',
      coverImageId: null,
      galleryMedia: [{ mediaId: 'media-shared', order: 0 }],
      contentMedia: ['media-shared'],
      content: '<p>shared</p><figure data-media-id="media-shared"><img src="x" /></figure>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const refsBeforeDelete = await getCardsReferencingMedia('media-shared');
    expect(refsBeforeDelete.sort()).toEqual(['card-cover-only', 'card-gallery-and-content']);

    await deleteMediaWithCardCleanup('media-shared');

    const coverCardAfter = (await db.collection('cards').doc('card-cover-only').get()).data() as IntegrityCard;
    expect(coverCardAfter.coverImageId ?? null).toBeNull();

    const mixedCardAfter = (
      await db.collection('cards').doc('card-gallery-and-content').get()
    ).data() as IntegrityCard;
    expect(mixedCardAfter.galleryMedia ?? []).toEqual([]);
    expect(mixedCardAfter.contentMedia ?? []).toEqual([]);
    expect((mixedCardAfter as { content?: string }).content ?? '').not.toContain('media-shared');

    const refsAfterDelete = await getCardsReferencingMedia('media-shared');
    expect(refsAfterDelete).toEqual([]);

    const mediaAfter = await db.collection('media').doc('media-shared').get();
    expect(mediaAfter.exists).toBe(false);
  });

  it('preserves media docs when deleting a card and only detaches the card reference', async () => {
    const db = getFirestore(app);
    const { deleteCard } = await getCardService();

    await db.collection('media').doc('media-shared').set({
      filename: 'shared.jpg',
      storagePath: 'images/shared.jpg',
      referencedByCardIds: ['card-a', 'card-b'],
      updatedAt: Date.now(),
    });

    await db.collection('media').doc('media-inline-only').set({
      filename: 'inline.jpg',
      storagePath: 'images/inline.jpg',
      referencedByCardIds: ['card-a'],
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-a').set({
      docId: 'card-a',
      status: 'published',
      coverImageId: 'media-shared',
      galleryMedia: [],
      contentMedia: [],
      content: '<p>inline</p><figure data-media-id="media-inline-only"><img src="x" /></figure>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-b').set({
      docId: 'card-b',
      status: 'published',
      coverImageId: 'media-shared',
      galleryMedia: [],
      contentMedia: [],
      content: '<p>shared cover</p>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await deleteCard('card-a');

    const deletedCardAfter = await db.collection('cards').doc('card-a').get();
    expect(deletedCardAfter.exists).toBe(false);

    const survivingCardAfter = (await db.collection('cards').doc('card-b').get()).data() as IntegrityCard;
    expect(survivingCardAfter.coverImageId).toBe('media-shared');

    const sharedMediaAfter = (
      await db.collection('media').doc('media-shared').get()
    ).data() as IntegrityMedia & { referencedByCardIds?: string[] };
    expect(sharedMediaAfter).toBeTruthy();
    expect(sharedMediaAfter.referencedByCardIds?.sort()).toEqual(['card-b']);

    const inlineMediaAfter = (
      await db.collection('media').doc('media-inline-only').get()
    ).data() as IntegrityMedia & { referencedByCardIds?: string[] };
    expect(inlineMediaAfter).toBeTruthy();
    expect(inlineMediaAfter.referencedByCardIds ?? []).toEqual([]);
  });

  it('does not mutate cards when delete is requested for missing media docs', async () => {
    const db = getFirestore(app);
    const { deleteMediaWithCardCleanup } = await getCardService();

    // Card still references an ID that has no media doc.
    await db.collection('cards').doc('card-orphan-ref').set({
      docId: 'card-orphan-ref',
      status: 'published',
      coverImageId: 'media-missing',
      galleryMedia: [],
      contentMedia: [],
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(deleteMediaWithCardCleanup('media-missing')).resolves.toBeUndefined();

    const cardAfter = await db.collection('cards').doc('card-orphan-ref').get();
    expect(cardAfter.exists).toBe(true);
    expect(cardAfter.data()?.coverImageId).toBe('media-missing');
  });

  it('replaces shared media content in place without disturbing card references or media identity', async () => {
    const db = getFirestore(app);
    const { replaceMediaAssetContent } = await getImageImportService();

    await db.collection('media').doc('media-shared').set({
      docId: 'media-shared',
      filename: 'original.jpg',
      storagePath: 'images/media-shared-original.jpg',
      storageUrl: 'https://example.com/original.jpg',
      contentType: 'image/jpeg',
      width: 300,
      height: 200,
      size: 1234,
      source: 'local',
      sourcePath: 'folder/original.jpg',
      referencedByCardIds: ['card-a', 'card-b'],
      createdAt: 1,
      updatedAt: 1,
    });

    await db.collection('cards').doc('card-a').set({
      docId: 'card-a',
      status: 'published',
      coverImageId: 'media-shared',
      galleryMedia: [],
      contentMedia: [],
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.collection('cards').doc('card-b').set({
      docId: 'card-b',
      status: 'published',
      coverImageId: null,
      galleryMedia: [{ mediaId: 'media-shared', order: 0 }],
      contentMedia: ['media-shared'],
      content: '<figure data-media-id="media-shared"><img src="x" /></figure>',
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await replaceMediaAssetContent('media-shared', Buffer.from('replacement-bytes'), 'replacement.webp');

    expect(mockStorageFileSave).toHaveBeenCalledTimes(1);

    const mediaAfter = (await db.collection('media').doc('media-shared').get()).data() as IntegrityMedia & {
      filename: string;
      storagePath: string;
      contentType: string;
      width: number;
      height: number;
      size: number;
      storageUrl: string;
      referencedByCardIds: string[];
    };

    expect(mediaAfter.filename).toBe('replacement.webp');
    expect(mediaAfter.storagePath).toBe('images/media-shared-original.jpg');
    expect(mediaAfter.contentType).toBe('image/webp');
    expect(mediaAfter.width).toBe(640);
    expect(mediaAfter.height).toBe(480);
    expect(mediaAfter.size).toBe(Buffer.from('replacement-bytes').length);
    expect(mediaAfter.contentIdentity).toEqual({
      algorithm: 'sha256',
      digest: '70bf69c13743b7193ffd7a3718caab18522b61d4643fe13ac80caa5301e2345a',
      basis: 'source-bytes',
    });
    expect(
      (await db.collection('mediaContentIdentities').doc(mediaAfter.contentIdentity.digest).get())
        .data()?.mediaId
    ).toBe('media-shared');
    expect(mediaAfter.referencedByCardIds?.sort()).toEqual(['card-a', 'card-b']);

    const cards = await readCards(db);
    const cardA = cards.find((card) => card.docId === 'card-a')!;
    const cardB = cards.find((card) => card.docId === 'card-b')!;
    expect(cardA.coverImageId).toBe('media-shared');
    expect(cardB.galleryMedia?.map((item) => item.mediaId)).toEqual(['media-shared']);
    expect(cardB.contentMedia).toEqual(['media-shared']);
    expect(findDanglingCardMediaReferences(cards, [mediaAfter])).toEqual([]);
    expect(findBrokenMediaBackReferences(cards, [mediaAfter])).toEqual([]);
  });

  it('reuses one canonical media record for concurrent exact-byte imports', async () => {
    const db = getFirestore(app);
    const { importFromBuffer } = await getImageImportService();
    const sourceBytes = Buffer.from('exact duplicate source bytes');

    const [first, second] = await Promise.all([
      importFromBuffer(sourceBytes, 'first__X.webp'),
      importFromBuffer(sourceBytes, 'second__X.webp'),
    ]);

    expect(first.mediaId).toBe(second.mediaId);
    const mediaSnap = await db.collection('media').get();
    expect(mediaSnap.size).toBe(1);
    const media = mediaSnap.docs[0]!.data();
    expect(media.contentIdentity).toEqual({
      algorithm: 'sha256',
      digest: 'c90dc1b5289b67396d527b8ddba97a611099a15fe34e3ac5acd1c4cdf65a9aa5',
      basis: 'source-bytes',
    });
    expect(media.sourceIdentities).toHaveLength(2);
    expect(new Set(media.sourceIdentities.map((item: { assetId: string }) => item.assetId))).toEqual(
      new Set([
        'first__X.webp:c90dc1b5289b67396d527b8ddba97a611099a15fe34e3ac5acd1c4cdf65a9aa5',
        'second__X.webp:c90dc1b5289b67396d527b8ddba97a611099a15fe34e3ac5acd1c4cdf65a9aa5',
      ])
    );
    expect((await db.collection('mediaContentIdentities').get()).size).toBe(1);
  });

  it('persists reviewed keep-both decisions without changing either media record', async () => {
    const db = getFirestore(app);
    const contentIdentity = {
      algorithm: 'sha256',
      digest: 'e'.repeat(64),
      basis: 'source-bytes',
    };
    await db.collection('media').doc('duplicate-a').set({ docId: 'duplicate-a', contentIdentity });
    await db.collection('media').doc('duplicate-b').set({ docId: 'duplicate-b', contentIdentity });

    const { getMediaDuplicateDecision, recordMediaDuplicateDecision } = await import(
      '@/lib/services/mediaDuplicateReviewService'
    );
    const decision = await recordMediaDuplicateDecision({
      mediaIds: ['duplicate-b', 'duplicate-a'],
      decision: 'keep_both',
    });

    expect(decision.pairKey).toBe('duplicate-a__duplicate-b');
    expect(await getMediaDuplicateDecision('duplicate-a', 'duplicate-b')).toMatchObject({
      mediaIds: ['duplicate-a', 'duplicate-b'],
      decision: 'keep_both',
    });
    expect((await db.collection('media').doc('duplicate-a').get()).exists).toBe(true);
    expect((await db.collection('media').doc('duplicate-b').get()).exists).toBe(true);
  });

  it('removes the exact-content identity when its canonical media record is deleted', async () => {
    const db = getFirestore(app);
    const digest = 'd'.repeat(64);
    await db.collection('media').doc('media-delete-identity').set({
      docId: 'media-delete-identity',
      contentIdentity: { algorithm: 'sha256', digest, basis: 'source-bytes' },
      tags: [],
    });
    await db.collection('mediaContentIdentities').doc(digest).set({
      mediaId: 'media-delete-identity',
      algorithm: 'sha256',
    });

    const { deleteMediaAsset } = await import('@/lib/services/images/mediaStorage');
    await db.runTransaction(tx => deleteMediaAsset('media-delete-identity', tx));

    expect((await db.collection('media').doc('media-delete-identity').get()).exists).toBe(false);
    expect((await db.collection('mediaContentIdentities').doc(digest).get()).exists).toBe(false);
  });

  it('createCard maintains published tag counts and derived fields', async () => {
    const db = getFirestore(app);
    await seedWhoTags(db);
    const { createCard } = await getCardService();

    const created = await createCard({
      title: 'Integrity create',
      type: 'story',
      status: 'published',
      tags: ['who-child'],
      content: '',
    });

    const cards = await readCards(db);
    const tags = await readTagsWithCounts(db);
    const tagLookup = new Map(tags.map((t) => [t.docId, t]));

    expect(findDerivedFieldViolations(created, tagLookup)).toEqual([]);
    expect(findTagCountViolations(cards, tags, tagLookup)).toEqual([]);
    expect(tags.find((t) => t.docId === 'who-child')?.cardCount).toBe(1);
    expect(tags.find((t) => t.docId === 'who-root')?.cardCount).toBe(1);
  });

  it('updateCardTags shifts tag counts and refreshes derived fields', async () => {
    const db = getFirestore(app);
    await seedWhoAndWhatTags(db);
    const { createCard, updateCardTags } = await getCardService();

    const created = await createCard({
      title: 'Tag swap',
      type: 'story',
      status: 'published',
      tags: ['who-child'],
      content: '',
    });

    await updateCardTags(created.docId, { tags: ['what-leaf'] });

    const cards = await readCards(db);
    const tags = await readTagsWithCounts(db);
    const tagLookup = new Map(tags.map((t) => [t.docId, t]));
    const updated = cards.find((card) => card.docId === created.docId)!;

    expect(findDerivedFieldViolations(updated, tagLookup)).toEqual([]);
    expect(findTagCountViolations(cards, tags, tagLookup)).toEqual([]);
    expect(tags.find((t) => t.docId === 'who-child')?.cardCount).toBe(0);
    expect(tags.find((t) => t.docId === 'who-root')?.cardCount).toBe(0);
    expect(tags.find((t) => t.docId === 'what-leaf')?.cardCount).toBe(1);
    expect(tags.find((t) => t.docId === 'what-root')?.cardCount).toBe(1);
  });

  it('deleteCard decrements published tag counts', async () => {
    const db = getFirestore(app);
    await seedWhoTags(db);
    const { createCard, deleteCard } = await getCardService();

    const created = await createCard({
      title: 'Delete me',
      type: 'story',
      status: 'published',
      tags: ['who-child'],
      content: '',
    });

    await deleteCard(created.docId);

    const cards = await readCards(db);
    const tags = await readTagsWithCounts(db);
    const tagLookup = new Map(tags.map((t) => [t.docId, t]));

    expect(cards).toEqual([]);
    expect(findTagCountViolations(cards, tags, tagLookup)).toEqual([]);
    expect(tags.find((t) => t.docId === 'who-child')?.cardCount).toBe(0);
    expect(tags.find((t) => t.docId === 'who-root')?.cardCount).toBe(0);
  });

  it('updateCardCover rewires media backrefs without dangling card references', async () => {
    const db = getFirestore(app);
    const { createCard, updateCardCover } = await getCardService();

    await db.collection('media').doc('media-a').set({ referencedByCardIds: [] });
    await db.collection('media').doc('media-b').set({ referencedByCardIds: [] });

    const created = await createCard({
      title: 'Cover swap',
      type: 'story',
      status: 'published',
      coverImageId: 'media-a',
      content: '',
    });

    await updateCardCover(created.docId, { coverImageId: 'media-b' });

    const cards = await readCards(db);
    const media = await readMedia(db);

    expect(findDanglingCardMediaReferences(cards, media)).toEqual([]);
    expect(findBrokenMediaBackReferences(cards, media)).toEqual([]);
    expect(media.find((m) => m.docId === 'media-a')?.referencedByCardIds ?? []).toEqual([]);
    expect(media.find((m) => m.docId === 'media-b')?.referencedByCardIds).toEqual([created.docId]);
  });
});

async function clearCollection(db: FirebaseFirestore.Firestore, name: string): Promise<void> {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function readCards(db: FirebaseFirestore.Firestore): Promise<IntegrityCard[]> {
  const snap = await db.collection('cards').get();
  return snap.docs.map((d) => d.data() as IntegrityCard);
}

async function readMedia(db: FirebaseFirestore.Firestore): Promise<IntegrityMedia[]> {
  const snap = await db.collection('media').get();
  return snap.docs.map((d) => ({ docId: d.id, ...(d.data() as Record<string, unknown>) })) as IntegrityMedia[];
}

async function readTags(db: FirebaseFirestore.Firestore): Promise<IntegrityTag[]> {
  const snap = await db.collection('tags').get();
  return snap.docs.map((d) => ({ docId: d.id, ...(d.data() as Record<string, unknown>) })) as IntegrityTag[];
}

async function readTagsWithCounts(db: FirebaseFirestore.Firestore): Promise<IntegrityTag[]> {
  return readTags(db);
}

async function seedWhoTags(db: FirebaseFirestore.Firestore): Promise<void> {
  await db.collection('tags').doc('who-root').set({
    name: 'Who',
    dimension: 'who',
    path: [],
    cardCount: 0,
    mediaCount: 0,
  });
  await db.collection('tags').doc('who-child').set({
    name: 'Alice',
    dimension: 'who',
    parentId: 'who-root',
    path: ['who-root'],
    cardCount: 0,
    mediaCount: 0,
  });
}

async function seedWhoAndWhatTags(db: FirebaseFirestore.Firestore): Promise<void> {
  await seedWhoTags(db);
  await db.collection('tags').doc('what-root').set({
    name: 'What',
    dimension: 'what',
    path: [],
    cardCount: 0,
    mediaCount: 0,
  });
  await db.collection('tags').doc('what-leaf').set({
    name: 'Memory',
    dimension: 'what',
    parentId: 'what-root',
    path: ['what-root'],
    cardCount: 0,
    mediaCount: 0,
  });
}
