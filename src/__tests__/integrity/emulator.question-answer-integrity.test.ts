import { App, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => {
    const admin = jest.requireActual<typeof import('firebase-admin')>('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: 'demo-my-journal-integrity',
        storageBucket: 'demo-my-journal-integrity.appspot.com',
      });
    }
    return admin.app();
  },
}));

jest.mock('@/lib/services/typesenseService', () => ({
  syncCardToTypesense: jest.fn(),
  removeCardFromTypesense: jest.fn(),
}));
jest.mock('@/lib/services/typesenseMediaService', () => ({
  syncMediaToTypesenseById: jest.fn(),
}));

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIfEmulator = hasEmulator ? describe : describe.skip;

describeIfEmulator('Question-answer integrity (Firestore emulator)', () => {
  jest.setTimeout(60000);
  let app: App;

  beforeAll(() => {
    app =
      getApps()[0] ??
      initializeApp({
        projectId: 'demo-my-journal-integrity',
        storageBucket: 'demo-my-journal-integrity.appspot.com',
      });
  });

  afterEach(async () => {
    const db = getFirestore(app);
    await Promise.all(['questions', 'cards', 'tags', 'settings'].map(name => clearCollection(db, name)));
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  it('returns one answer card when concurrent create requests target the same question', async () => {
    const db = getFirestore(app);
    const question = minimalQuestion('question-create');
    await db.collection('questions').doc(question.docId).set(question);

    const { createQuestionCardFromQuestion } = await import('@/lib/services/cardService');
    const [first, second] = await Promise.all([
      createQuestionCardFromQuestion(question),
      createQuestionCardFromQuestion(question),
    ]);

    expect(first.card.docId).toBe(second.card.docId);
    expect([first.created, second.created].sort()).toEqual([false, true]);
    const cards = await db.collection('cards').where('questionId', '==', question.docId).get();
    expect(cards.size).toBe(1);
    const questionSnap = await db.collection('questions').doc(question.docId).get();
    expect(questionSnap.data()?.usedByCardIds).toEqual([first.card.docId]);
    expect(questionSnap.data()?.usageCount).toBe(1);
  });

  it('rejects linking a card or question that is already linked elsewhere', async () => {
    const db = getFirestore(app);
    await db.collection('questions').doc('question-one').set(minimalQuestion('question-one'));
    await db.collection('questions').doc('question-two').set(minimalQuestion('question-two'));
    await db.collection('cards').doc('answer-one').set(minimalQuestionCard('answer-one'));

    const { linkCardToQuestion, QuestionAnswerConflictError } = await import(
      '@/lib/services/questionService'
    );
    await linkCardToQuestion('question-one', 'answer-one');
    await expect(linkCardToQuestion('question-two', 'answer-one')).rejects.toBeInstanceOf(
      QuestionAnswerConflictError
    );

    const second = await db.collection('questions').doc('question-two').get();
    expect(second.data()?.usedByCardIds).toEqual([]);
    expect(second.data()?.usageCount).toBe(0);
  });

  it('atomically unlinks an answer and converts it to a draft Story', async () => {
    const db = getFirestore(app);
    await db.collection('questions').doc('question-unlink').set({
      ...minimalQuestion('question-unlink'),
      usedByCardIds: ['answer-unlink'],
      usageCount: 1,
    });
    await db.collection('cards').doc('answer-unlink').set(
      minimalQuestionCard('answer-unlink', { questionId: 'question-unlink' })
    );

    const { unlinkCardFromQuestion } = await import('@/lib/services/questionService');
    await unlinkCardFromQuestion('question-unlink', 'answer-unlink');

    const [questionSnap, cardSnap] = await Promise.all([
      db.collection('questions').doc('question-unlink').get(),
      db.collection('cards').doc('answer-unlink').get(),
    ]);
    expect(questionSnap.data()?.usedByCardIds).toEqual([]);
    expect(questionSnap.data()?.usageCount).toBe(0);
    expect(cardSnap.data()?.questionId).toBeUndefined();
    expect(cardSnap.data()?.type).toBe('story');
    expect(cardSnap.data()?.status).toBe('draft');
  });

  it('prevents deletion while an answer card is linked', async () => {
    const db = getFirestore(app);
    await db.collection('questions').doc('question-delete').set({
      ...minimalQuestion('question-delete'),
      usedByCardIds: ['answer-delete'],
      usageCount: 1,
    });

    const { deleteQuestion, QuestionAnswerConflictError } = await import(
      '@/lib/services/questionService'
    );
    await expect(deleteQuestion('question-delete')).rejects.toBeInstanceOf(
      QuestionAnswerConflictError
    );
    expect((await db.collection('questions').doc('question-delete').get()).exists).toBe(true);
  });
});

function minimalQuestion(docId: string) {
  const now = Date.now();
  return {
    docId,
    prompt: 'A meaningful question?',
    prompt_lowercase: 'a meaningful question?',
    tagIds: [],
    tags: [],
    usedByCardIds: [],
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function minimalQuestionCard(docId: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    docId,
    title: 'Answer',
    title_lowercase: 'answer',
    type: 'qa',
    status: 'draft',
    displayMode: 'navigate',
    content: '',
    tags: [],
    filterTags: {},
    who: [],
    what: [],
    when: [],
    where: [],
    galleryMedia: [],
    contentMedia: [],
    childrenIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function clearCollection(db: FirebaseFirestore.Firestore, name: string): Promise<void> {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
