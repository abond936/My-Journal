import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { cardSchema } from '@/lib/types/card';
import {
  CreateQuestionInput,
  Question,
  UpdateQuestionInput,
  createQuestionSchema,
  updateQuestionSchema,
} from '@/lib/types/question';

const COLLECTION = 'questions';

function db() {
  return getFirestore(getAdminApp());
}

function sanitizeTags(raw: string[] | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(raw.map(t => t.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 50);
}

function toQuestion(docId: string, data: FirebaseFirestore.DocumentData): Question {
  return {
    docId,
    prompt: String(data.prompt ?? ''),
    prompt_lowercase: String(data.prompt_lowercase ?? '').toLowerCase(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    usedByCardIds: Array.isArray(data.usedByCardIds) ? data.usedByCardIds : [],
    usageCount: typeof data.usageCount === 'number' ? data.usageCount : 0,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function listQuestions(): Promise<Question[]> {
  const snap = await db().collection(COLLECTION).orderBy('updatedAt', 'desc').get();
  return snap.docs.map(d => toQuestion(d.id, d.data()));
}

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  const parsed = createQuestionSchema.parse(input);
  const now = Date.now();
  const prompt = parsed.prompt.trim();
  const payload: Omit<Question, 'docId'> = {
    prompt,
    prompt_lowercase: prompt.toLowerCase(),
    tags: sanitizeTags(parsed.tags),
    usedByCardIds: [],
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db().collection(COLLECTION).add(payload);
  return { docId: ref.id, ...payload };
}

export async function getQuestionById(questionId: string): Promise<Question | null> {
  const snap = await db().collection(COLLECTION).doc(questionId).get();
  if (!snap.exists) return null;
  return toQuestion(snap.id, snap.data() ?? {});
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput): Promise<Question> {
  const parsed = updateQuestionSchema.parse(input);
  const ref = db().collection(COLLECTION).doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Question not found');
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };
  if (parsed.prompt !== undefined) {
    const prompt = parsed.prompt.trim();
    updatePayload.prompt = prompt;
    updatePayload.prompt_lowercase = prompt.toLowerCase();
  }
  if (parsed.tags !== undefined) {
    updatePayload.tags = sanitizeTags(parsed.tags);
  }

  await ref.update(updatePayload);
  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await db().collection(COLLECTION).doc(questionId).delete();
}

export async function linkCardToQuestion(questionId: string, cardId: string): Promise<Question> {
  const cardSnap = await db().collection('cards').doc(cardId).get();
  if (!cardSnap.exists) {
    throw new Error('Card not found');
  }
  const parsedCard = cardSchema.partial().safeParse(cardSnap.data());
  if (!parsedCard.success) {
    throw new Error('Invalid card document');
  }

  const ref = db().collection(COLLECTION).doc(questionId);
  await db().runTransaction(async tx => {
    const questionSnap = await tx.get(ref);
    if (!questionSnap.exists) {
      throw new Error('Question not found');
    }
    tx.update(ref, {
      usedByCardIds: FieldValue.arrayUnion(cardId),
      updatedAt: Date.now(),
    });
  });

  await recalculateQuestionUsageCount(questionId);
  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function unlinkCardFromQuestion(questionId: string, cardId: string): Promise<Question> {
  const ref = db().collection(COLLECTION).doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Question not found');
  }

  await ref.update({
    usedByCardIds: FieldValue.arrayRemove(cardId),
    updatedAt: Date.now(),
  });
  await recalculateQuestionUsageCount(questionId);

  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function unlinkCardFromAllQuestions(cardId: string): Promise<number> {
  const snap = await db().collection(COLLECTION).where('usedByCardIds', 'array-contains', cardId).get();
  if (snap.empty) return 0;

  const batch = db().batch();
  const now = Date.now();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, {
      usedByCardIds: FieldValue.arrayRemove(cardId),
      updatedAt: now,
    });
  });
  await batch.commit();

  for (const doc of snap.docs) {
    await recalculateQuestionUsageCount(doc.id);
  }

  return snap.size;
}

export async function recalculateQuestionUsageCount(questionId: string): Promise<void> {
  const ref = db().collection(COLLECTION).doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data();
  const usedByCardIds = Array.isArray(data?.usedByCardIds) ? data.usedByCardIds : [];
  await ref.update({ usageCount: usedByCardIds.length, updatedAt: Date.now() });
}

