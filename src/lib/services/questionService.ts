import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { cardSchema } from '@/lib/types/card';
import { syncCardToTypesense } from '@/lib/services/typesenseService';
import {
  CreateQuestionInput,
  Question,
  UpdateQuestionInput,
  createQuestionSchema,
  updateQuestionSchema,
} from '@/lib/types/question';
import { resolveSubjectTagState } from '@/lib/utils/subjectTag';

const COLLECTION = 'questions';

export class QuestionAnswerConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionAnswerConflictError';
  }
}

function db() {
  return getFirestore(getAdminApp());
}

function sanitizeTags(raw: string[] | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(raw.map(t => t.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 50);
}

function sanitizeTagIds(raw: string[] | undefined): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.map(t => t.trim()).filter(Boolean))).slice(0, 50);
}

async function assertQuestionTagsAreDimensional(tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return;
  const allTags = await getAllTags();
  const tagsById = new Map(allTags.filter(tag => tag.docId).map(tag => [tag.docId!, tag]));
  const invalidTagId = tagIds.find(tagId => {
    const dimension = tagsById.get(tagId)?.dimension;
    return dimension !== 'who' && dimension !== 'what' && dimension !== 'when' && dimension !== 'where';
  });
  if (invalidTagId) {
    throw new Error(`Question tag ${invalidTagId} is not a dimensional tag`);
  }
}

function toQuestion(docId: string, data: FirebaseFirestore.DocumentData): Question {
  return {
    docId,
    prompt: String(data.prompt ?? ''),
    prompt_lowercase: String(data.prompt_lowercase ?? '').toLowerCase(),
    tagIds: Array.isArray(data.tagIds) ? data.tagIds : [],
    subjectTagId: typeof data.subjectTagId === 'string' ? data.subjectTagId : null,
    subjectTagIds: Array.isArray(data.subjectTagIds)
      ? data.subjectTagIds
      : typeof data.subjectTagId === 'string' ? [data.subjectTagId] : [],
    subjectFilterTags: data.subjectFilterTags && typeof data.subjectFilterTags === 'object'
      ? data.subjectFilterTags as Record<string, boolean>
      : {},
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
  const tagIds = sanitizeTagIds(parsed.tagIds);
  await assertQuestionTagsAreDimensional(tagIds);
  const allTags = await getAllTags();
  const subjectState = await resolveSubjectTagState({
    assignedTagIds: tagIds,
    requestedSubjectTagIds: parsed.subjectTagIds,
    subjectTagIdsProvided: true,
    subjectTagIdProvided: false,
    allTags,
  });
  const payload: Omit<Question, 'docId'> = {
    prompt,
    prompt_lowercase: prompt.toLowerCase(),
    tagIds,
    subjectTagId: subjectState.subjectTagId,
    subjectTagIds: subjectState.subjectTagIds,
    subjectFilterTags: subjectState.subjectFilterTags,
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
  if (parsed.tagIds !== undefined) {
    const tagIds = sanitizeTagIds(parsed.tagIds);
    await assertQuestionTagsAreDimensional(tagIds);
    updatePayload.tagIds = tagIds;
  }
  if (parsed.tagIds !== undefined || parsed.subjectTagIds !== undefined) {
    const existing = toQuestion(snap.id, snap.data() ?? {});
    const nextTagIds = (updatePayload.tagIds as string[] | undefined) ?? existing.tagIds;
    const allTags = await getAllTags();
    const subjectState = await resolveSubjectTagState({
      assignedTagIds: nextTagIds,
      existingSubjectTagId: existing.subjectTagId,
      existingSubjectTagIds: existing.subjectTagIds,
      requestedSubjectTagIds: parsed.subjectTagIds,
      subjectTagIdsProvided: parsed.subjectTagIds !== undefined,
      subjectTagIdProvided: false,
      allTags,
    });
    updatePayload.subjectTagId = subjectState.subjectTagId;
    updatePayload.subjectTagIds = subjectState.subjectTagIds;
    updatePayload.subjectFilterTags = subjectState.subjectFilterTags;
  }
  await ref.update(updatePayload);
  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const ref = db().collection(COLLECTION).doc(questionId);
  await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const existing = toQuestion(snap.id, snap.data() ?? {});
    if (existing.usedByCardIds.length > 0) {
      throw new QuestionAnswerConflictError('Cannot delete a question that has an answer card');
    }
    tx.delete(ref);
  });
}

export async function linkCardToQuestion(questionId: string, cardId: string): Promise<Question> {
  const ref = db().collection(COLLECTION).doc(questionId);
  const cardRef = db().collection('cards').doc(cardId);
  await db().runTransaction(async tx => {
    const [questionSnap, cardSnap] = await Promise.all([tx.get(ref), tx.get(cardRef)]);
    if (!questionSnap.exists) {
      throw new Error('Question not found');
    }
    if (!cardSnap.exists) {
      throw new Error('Card not found');
    }
    const parsedCard = cardSchema.partial().safeParse(cardSnap.data());
    if (!parsedCard.success) {
      throw new Error('Invalid card document');
    }
    if (parsedCard.data.type !== 'qa') {
      throw new QuestionAnswerConflictError('Questions can only link to Question cards');
    }
    if (parsedCard.data.questionId && parsedCard.data.questionId !== questionId) {
      throw new QuestionAnswerConflictError('This card already answers a different question');
    }

    const current = toQuestion(questionSnap.id, questionSnap.data() ?? {});
    if (current.usedByCardIds.length > 1) {
      throw new QuestionAnswerConflictError('This question has conflicting answer-card links and requires review');
    }
    if (current.usedByCardIds.length === 1 && current.usedByCardIds[0] !== cardId) {
      throw new QuestionAnswerConflictError('This question already has an answer card');
    }

    const now = Date.now();
    tx.update(ref, {
      usedByCardIds: [cardId],
      usageCount: 1,
      updatedAt: now,
    });
    tx.update(cardRef, {
      questionId,
      updatedAt: now,
    });
  });

  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function unlinkCardFromQuestion(questionId: string, cardId: string): Promise<Question> {
  const ref = db().collection(COLLECTION).doc(questionId);
  const cardRef = db().collection('cards').doc(cardId);
  await db().runTransaction(async tx => {
    const [questionSnap, cardSnap] = await Promise.all([tx.get(ref), tx.get(cardRef)]);
    if (!questionSnap.exists) {
      throw new Error('Question not found');
    }
    if (cardSnap.exists && cardSnap.data()?.questionId && cardSnap.data()?.questionId !== questionId) {
      throw new QuestionAnswerConflictError('This card answers a different question');
    }
    const now = Date.now();
    tx.update(ref, {
      usedByCardIds: [],
      usageCount: 0,
      updatedAt: now,
    });
    if (cardSnap.exists) {
      tx.update(cardRef, {
        questionId: FieldValue.delete(),
        type: 'story',
        status: 'draft',
        updatedAt: now,
      });
    }
  });

  const updatedCardSnap = await cardRef.get();
  if (updatedCardSnap.exists) {
    const updatedCard = cardSchema.safeParse({
      docId: updatedCardSnap.id,
      ...updatedCardSnap.data(),
    });
    if (updatedCard.success) {
      void syncCardToTypesense(updatedCard.data);
    }
  }

  const fresh = await ref.get();
  return toQuestion(fresh.id, fresh.data() ?? {});
}

export async function unlinkCardFromAllQuestions(cardId: string): Promise<number> {
  const snap = await db().collection(COLLECTION).where('usedByCardIds', 'array-contains', cardId).get();
  if (snap.empty) return 0;

  const batch = db().batch();
  const now = Date.now();
  const cardRef = db().collection('cards').doc(cardId);
  const cardSnap = await cardRef.get();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, {
      usedByCardIds: FieldValue.arrayRemove(cardId),
      updatedAt: now,
    });
  });
  if (cardSnap.exists) {
    batch.update(cardRef, {
      questionId: FieldValue.delete(),
      updatedAt: now,
    });
  }
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
  await ref.update({
    usageCount: usedByCardIds.length,
    updatedAt: Date.now(),
  });
}

