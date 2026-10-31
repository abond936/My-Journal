import { initializeApp, getApps, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ErrorCode } from '@/lib/types/error';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const { getApps, initializeApp } = jest.requireActual<typeof import('firebase-admin/app')>('firebase-admin/app');
    const { getFirestore } = jest.requireActual<typeof import('firebase-admin/firestore')>('firebase-admin/firestore');
    const app = getApps()[0] ?? initializeApp({ projectId: 'demo-my-journal-integrity' });
    return { firestore: () => getFirestore(app) };
  },
}));

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIfEmulator = hasEmulator ? describe : describe.skip;

describeIfEmulator('Collection lifecycle integrity (Firestore emulator)', () => {
  jest.setTimeout(60000);
  let app: App;

  beforeAll(() => {
    app = getApps()[0] ?? initializeApp({ projectId: 'demo-my-journal-integrity' });
  });

  afterEach(async () => {
    const db = getFirestore(app);
    for (const name of ['collections', 'collection_placements', 'cards', 'media', 'app_settings']) {
      await clearCollection(db, name);
    }
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  async function seedCollection(audience?: {
    allContacts: boolean;
    groupIds: string[];
    contactIds: string[];
  }) {
    const db = getFirestore(app);
    await db.collection('app_settings').doc('author').set({
      classificationRequirements: { media: false, cards: false },
    });
    await db.collection('cards').doc('card-1').set({
      title: 'Ready Story', status: 'published', type: 'story',
      createdAt: 1, updatedAt: 1,
    });
    await db.collection('collections').doc('collection-1').set({
      title: 'Family Stories', lifecycle: 'draft', recordState: 'active',
      structureRevision: 1, authorityRevision: 1, order: 10,
      createdAt: 1, updatedAt: 1,
      ...(audience ? { audience } : {}),
    });
    await db.collection('collection_placements').doc('placement-1').set({
      collectionId: 'collection-1', cardId: 'card-1', role: 'card', order: 10,
      createdAt: 1, updatedAt: 1,
    });
    return db;
  }

  it('publishes only after the Collection has an explicit audience and ready structure', async () => {
    const db = await seedCollection({ allContacts: true, groupIds: [], contactIds: [] });
    const { updateCollectionLifecycle } = await import(
      '@/lib/services/collections/collectionLifecycleService'
    );
    await expect(updateCollectionLifecycle({
      collectionId: 'collection-1', lifecycle: 'published', firestore: db, now: 20,
    })).resolves.toMatchObject({ lifecycle: 'published', updatedAt: 20 });
    await expect(db.collection('collections').doc('collection-1').get()).resolves.toMatchObject({
      exists: true,
    });
    expect((await db.collection('collections').doc('collection-1').get()).data()).toMatchObject({
      lifecycle: 'published', updatedAt: 20,
    });
  });

  it('does not treat missing legacy audience data as new publication confirmation', async () => {
    const db = await seedCollection();
    const { updateCollectionLifecycle } = await import(
      '@/lib/services/collections/collectionLifecycleService'
    );
    await expect(updateCollectionLifecycle({
      collectionId: 'collection-1', lifecycle: 'published', firestore: db,
    })).rejects.toMatchObject({
      code: ErrorCode.COLLECTION_PUBLICATION_INTEGRITY,
      details: { issues: expect.arrayContaining([{ code: 'audience-unconfirmed' }]) },
    });
    expect((await db.collection('collections').doc('collection-1').get()).data()?.lifecycle).toBe('draft');
  });
});

async function clearCollection(db: FirebaseFirestore.Firestore, name: string): Promise<void> {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
