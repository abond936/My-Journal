import { initializeApp, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  IntegrityCard,
  IntegrityMedia,
  IntegrityTag,
  findBrokenMediaBackReferences,
  findDanglingCardMediaReferences,
  findDerivedFieldViolations,
} from '@/lib/integrity/invariantChecks';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const { getApps, initializeApp } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
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

type CardServiceModule = typeof import('@/lib/services/cardService');
let cardServiceModulePromise: Promise<CardServiceModule> | null = null;

function getCardService(): Promise<CardServiceModule> {
  if (!cardServiceModulePromise) {
    cardServiceModulePromise = import('@/lib/services/cardService');
  }
  return cardServiceModulePromise;
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
    const db = getFirestore(app);
    await clearCollection(db, 'cards');
    await clearCollection(db, 'media');
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
