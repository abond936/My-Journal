import { App, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const admin = jest.requireActual<typeof import('firebase-admin')>('firebase-admin');
    if (admin.apps.length === 0) admin.initializeApp({ projectId: 'demo-my-journal-integrity' });
    return admin.app();
  },
}));
jest.mock('@/lib/services/typesenseService', () => ({
  syncCardToTypesense: jest.fn(async () => undefined),
  removeCardFromTypesense: jest.fn(async () => undefined),
}));
jest.mock('@/lib/services/typesenseMediaService', () => ({
  syncMediaToTypesenseById: jest.fn(async () => undefined),
}));

const describeIfEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Tag split integrity (Firestore emulator)', () => {
  jest.setTimeout(60000);
  let app: App;

  beforeAll(() => {
    app = getApps()[0] ?? initializeApp({ projectId: 'demo-my-journal-integrity' });
  });

  afterEach(async () => {
    const firestore = getFirestore(app);
    for (const name of ['cards', 'media', 'questions', 'tags', 'tag_split_operations', 'settings']) {
      const snapshot = await firestore.collection(name).get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    }
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  it('moves only the selected records to a new sibling and safely resumes the same operation', async () => {
    const firestore = getFirestore(app);
    await firestore.collection('tags').doc('source').set({
      name: 'Combined person', dimension: 'who', path: [], order: 1,
      cardCount: 2, mediaCount: 2, uniqueCardIds: ['card-move', 'card-stay'], uniqueMediaIds: ['media-move', 'media-stay'],
    });
    await firestore.collection('tags').doc('source-child').set({
      name: 'Existing child', dimension: 'who', parentId: 'source', path: ['source'], order: 1,
      cardCount: 0, mediaCount: 0, uniqueCardIds: [], uniqueMediaIds: [],
    });
    await firestore.collection('cards').doc('card-move').set(cardRecord('Move this Card'));
    await firestore.collection('cards').doc('card-stay').set(cardRecord('Keep this Card'));
    await firestore.collection('media').doc('media-move').set(mediaRecord('Move this Media'));
    await firestore.collection('media').doc('media-stay').set(mediaRecord('Keep this Media'));
    await firestore.collection('questions').doc('question-move').set(questionRecord('Move this Prompt'));
    await firestore.collection('questions').doc('question-stay').set(questionRecord('Keep this Prompt'));

    const { getTagSplitReview, splitTagAssignments } = await import('@/lib/services/tagSplitService');
    const review = await getTagSplitReview('source');
    expect(review.candidates).toHaveLength(6);
    expect(review.directChildCount).toBe(1);
    expect(review.candidates.every((candidate) => candidate.directAssignment && candidate.subjectAssignment)).toBe(true);

    const request = {
      operationId: 'split-operation',
      sourceTagId: 'source',
      newName: 'Separated person',
      selection: { cardIds: ['card-move'], mediaIds: ['media-move'], questionIds: ['question-move'] },
    };
    const first = await splitTagAssignments(request);
    await firestore.collection('tag_split_operations').doc('split-operation').update({ status: 'failed' });
    const retryReview = await getTagSplitReview('source');
    expect(retryReview.resumableOperation).toEqual({
      operationId: 'split-operation',
      newName: 'Separated person',
      selection: request.selection,
    });
    expect(retryReview.candidates.filter((candidate) => candidate.alreadyMoved)).toHaveLength(3);
    const second = await splitTagAssignments(request);
    expect(second.targetTagId).toBe(first.targetTagId);

    for (const [collection, movedId, stayedId, directField] of [
      ['cards', 'card-move', 'card-stay', 'tags'],
      ['media', 'media-move', 'media-stay', 'tags'],
      ['questions', 'question-move', 'question-stay', 'tagIds'],
    ] as const) {
      const [moved, stayed] = await Promise.all([
        firestore.collection(collection).doc(movedId).get(),
        firestore.collection(collection).doc(stayedId).get(),
      ]);
      expect(moved.data()?.[directField]).toContain(first.targetTagId);
      expect(moved.data()?.[directField]).not.toContain('source');
      expect(moved.data()?.subjectTagIds).toContain(first.targetTagId);
      expect(stayed.data()?.[directField]).toContain('source');
      expect(stayed.data()?.subjectTagIds).toContain('source');
    }
    const source = await firestore.collection('tags').doc('source').get();
    const target = await firestore.collection('tags').doc(first.targetTagId).get();
    const operation = await firestore.collection('tag_split_operations').doc('split-operation').get();
    const child = await firestore.collection('tags').doc('source-child').get();
    expect(source.exists).toBe(true);
    expect(target.data()?.name).toBe('Separated person');
    expect(operation.data()?.status).toBe('completed');
    expect(child.data()?.parentId).toBe('source');
  });
});

function cardRecord(title: string) {
  return {
    title, type: 'story', status: 'draft', tags: ['source'], filterTags: { source: true },
    who: ['source'], what: [], when: [], where: [], subjectTagId: 'source', subjectTagIds: ['source'],
    subjectFilterTags: { source: true }, galleryImplicitSubjectTagIds: [], dimensionReview: {},
    createdAt: 1, updatedAt: 1,
  };
}

function mediaRecord(caption: string) {
  return {
    caption, tags: ['source'], filterTags: { source: true }, who: ['source'], what: [], when: [], where: [],
    subjectTagId: 'source', subjectTagIds: ['source'], subjectFilterTags: { source: true },
    hasTags: true, hasWho: true, hasWhat: false, hasWhen: false, hasWhere: false,
    dimensionReview: {}, referencedByCardIds: [], createdAt: 1, updatedAt: 1,
  };
}

function questionRecord(prompt: string) {
  return {
    prompt, prompt_lowercase: prompt.toLowerCase(), tagIds: ['source'], subjectTagId: 'source',
    subjectTagIds: ['source'], subjectFilterTags: { source: true }, tags: [], usedByCardIds: [], usageCount: 0,
    category: '', topic: '', promptKind: 'primary', parentQuestionId: null, promptOrder: 0, createdAt: 1, updatedAt: 1,
  };
}
