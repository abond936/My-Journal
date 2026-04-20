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

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIfEmulator = hasEmulator ? describe : describe.skip;

describeIfEmulator('Integrity gate (Firestore emulator)', () => {
  jest.setTimeout(30000);
  let app: App;
  const projectId = 'demo-my-journal-integrity';

  beforeAll(async () => {
    if (!hasEmulator) return;
    if (getApps().length === 0) {
      app = initializeApp({
        projectId,
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
