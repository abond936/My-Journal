import { initializeApp, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ErrorCode } from '@/lib/types/error';

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

function minimalCard(docId: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    docId,
    title: docId,
    title_lowercase: docId.toLowerCase(),
    type: 'story',
    status: 'published' as const,
    displayMode: 'navigate' as const,
    content: '',
    tags: [] as string[],
    filterTags: {} as Record<string, boolean>,
    who: [] as string[],
    what: [] as string[],
    when: [] as string[],
    where: [] as string[],
    galleryMedia: [] as { mediaId: string; order: number }[],
    contentMedia: [] as string[],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describeIfEmulator('Curated tree updateCard (Firestore emulator)', () => {
  jest.setTimeout(60000);
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

  it('removes legacy root flags from a child when newly listed under a parent childrenIds', async () => {
    const db = getFirestore(app);
    await db.collection('cards').doc('parent-1').set(
      minimalCard('parent-1', {
        childrenIds: [],
        curatedRoot: true,
        curatedNavEligible: true,
      })
    );
    await db.collection('cards').doc('child-1').set(
      minimalCard('child-1', {
        childrenIds: [],
        curatedRoot: true,
        curatedNavEligible: true,
      })
    );

    const { updateCard } = await getCardService();
    await updateCard('parent-1', { childrenIds: ['child-1'] });

    const childSnap = await db.collection('cards').doc('child-1').get();
    expect(childSnap.exists).toBe(true);
    const child = childSnap.data() as {
      curatedRoot?: boolean;
      curatedRootOrder?: number;
      curatedNavEligible?: boolean;
    };
    expect(child.curatedRoot).toBeUndefined();
    expect(child.curatedRootOrder).toBeUndefined();
    expect(child.curatedNavEligible).toBe(false);
  });

  it('removes legacy root flags from a former parent when its last child is moved away', async () => {
    const db = getFirestore(app);
    await db.collection('cards').doc('parent-orig').set(
      minimalCard('parent-orig', {
        childrenIds: ['moved-child'],
        curatedRoot: false,
        curatedNavEligible: true,
      })
    );
    await db.collection('cards').doc('parent-new').set(
      minimalCard('parent-new', {
        childrenIds: [],
        curatedRoot: true,
        curatedNavEligible: true,
      })
    );
    await db.collection('cards').doc('moved-child').set(
      minimalCard('moved-child', {
        childrenIds: [],
        curatedRoot: false,
        curatedNavEligible: false,
      })
    );

    const { updateCard } = await getCardService();
    await updateCard('parent-new', { childrenIds: ['moved-child'] });

    const origSnap = await db.collection('cards').doc('parent-orig').get();
    expect(origSnap.exists).toBe(true);
    const orig = origSnap.data() as {
      childrenIds?: string[];
      curatedRoot?: boolean;
      curatedRootOrder?: number;
      curatedNavEligible?: boolean;
    };
    expect(orig.childrenIds ?? []).toEqual([]);
    expect(orig.curatedRoot).toBeUndefined();
    expect(orig.curatedRootOrder).toBeUndefined();
    expect(orig.curatedNavEligible).toBe(false);
  });

  it('rejects a childrenIds update that would create a cycle', async () => {
    const db = getFirestore(app);
    await db.collection('cards').doc('card-a').set(
      minimalCard('card-a', {
        childrenIds: ['card-b'],
        curatedRoot: true,
        curatedNavEligible: true,
      })
    );
    await db.collection('cards').doc('card-b').set(
      minimalCard('card-b', {
        childrenIds: ['card-c'],
        curatedNavEligible: true,
      })
    );
    await db.collection('cards').doc('card-c').set(
      minimalCard('card-c', {
        childrenIds: [],
        curatedNavEligible: false,
      })
    );

    const { updateCard } = await getCardService();
    await expect(updateCard('card-c', { childrenIds: ['card-a'] })).rejects.toMatchObject({
      code: ErrorCode.CURATED_COLLECTION_CYCLE,
    });
  });

  it('removes legacy root flags when PATCH echoes empty childrenIds on a never-parent card', async () => {
    const db = getFirestore(app);
    await db.collection('cards').doc('standalone-1').set(
      minimalCard('standalone-1', {
        childrenIds: [],
        curatedRoot: false,
        curatedNavEligible: false,
      })
    );

    const { updateCard } = await getCardService();
    await updateCard('standalone-1', { title: 'Renamed', childrenIds: [] });

    const snap = await db.collection('cards').doc('standalone-1').get();
    expect(snap.exists).toBe(true);
    const row = snap.data() as {
      title?: string;
      curatedRoot?: boolean;
      curatedRootOrder?: number;
      curatedNavEligible?: boolean;
    };
    expect(row.title).toBe('Renamed');
    expect(row.curatedRoot).toBeUndefined();
    expect(row.curatedRootOrder).toBeUndefined();
    expect(row.curatedNavEligible).not.toBe(true);
  });

  it('rejects a childrenIds entry that references a missing card', async () => {
    const db = getFirestore(app);
    await db.collection('cards').doc('lonely-parent').set(
      minimalCard('lonely-parent', {
        childrenIds: [],
        curatedRoot: true,
        curatedNavEligible: true,
      })
    );

    const { updateCard } = await getCardService();
    await expect(updateCard('lonely-parent', { childrenIds: ['no-such-card'] })).rejects.toMatchObject({
      code: ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND,
    });
  });
});

async function clearCollection(db: FirebaseFirestore.Firestore, name: string): Promise<void> {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
