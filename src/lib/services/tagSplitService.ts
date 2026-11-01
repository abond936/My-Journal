import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { updateCardTags } from '@/lib/services/cards/cardTagMutationService';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import { updateQuestion } from '@/lib/services/questionService';
import type { Tag } from '@/lib/types/tag';

const MAX_SPLIT_RECORDS = 500;

export type TagSplitRecordKind = 'card' | 'media' | 'question';

export type TagSplitCandidate = {
  id: string;
  kind: TagSplitRecordKind;
  label: string;
  directAssignment: boolean;
  subjectAssignment: boolean;
  alreadyMoved?: boolean;
};

export type TagSplitReview = {
  source: Pick<Tag, 'docId' | 'name' | 'dimension' | 'parentId'>;
  candidates: TagSplitCandidate[];
  directChildCount: number;
  canSplit: boolean;
  blockedReason?: string;
  resumableOperation?: {
    operationId: string;
    newName: string;
    selection: TagSplitSelection;
  };
};

export type TagSplitSelection = {
  cardIds: string[];
  mediaIds: string[];
  questionIds: string[];
};

export type TagSplitResult = {
  operationId: string;
  targetTagId: string;
  movedCards: number;
  movedMedia: number;
  movedQuestions: number;
};

export class TagSplitConflictError extends Error {}

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
    : [];
}

function normalizeSelection(selection: TagSplitSelection): TagSplitSelection {
  return {
    cardIds: ids(selection.cardIds).sort(),
    mediaIds: ids(selection.mediaIds).sort(),
    questionIds: ids(selection.questionIds).sort(),
  };
}

function signature(sourceTagId: string, newName: string, selection: TagSplitSelection): string {
  return JSON.stringify({ sourceTagId, newName: newName.trim().toLocaleLowerCase(), ...selection });
}

function recordLabel(kind: TagSplitRecordKind, id: string, data: Record<string, unknown>): string {
  const values = kind === 'card'
    ? [data.title]
    : kind === 'media'
      ? [data.caption, data.originalFilename, data.fileName, data.filename]
      : [data.prompt];
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? id;
}

async function candidatesForCollection(
  collectionName: 'cards' | 'media' | 'questions',
  kind: TagSplitRecordKind,
  sourceTagId: string,
  directField: 'tags' | 'tagIds'
): Promise<TagSplitCandidate[]> {
  const firestore = getAdminApp().firestore();
  const collection = firestore.collection(collectionName);
  const [direct, subjects, legacySubject] = await Promise.all([
    collection.where(directField, 'array-contains', sourceTagId).get(),
    collection.where('subjectTagIds', 'array-contains', sourceTagId).get(),
    collection.where('subjectTagId', '==', sourceTagId).get(),
  ]);
  const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const doc of [...direct.docs, ...subjects.docs, ...legacySubject.docs]) byId.set(doc.id, doc);
  return [...byId.values()].map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      kind,
      label: recordLabel(kind, doc.id, data),
      directAssignment: ids(data[directField]).includes(sourceTagId),
      subjectAssignment: ids(data.subjectTagIds).includes(sourceTagId) || data.subjectTagId === sourceTagId,
    };
  }).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

export async function getTagSplitReview(sourceTagId: string): Promise<TagSplitReview> {
  const firestore = getAdminApp().firestore();
  const [sourceDoc, children, cards, media, questions, operations] = await Promise.all([
    firestore.collection('tags').doc(sourceTagId).get(),
    firestore.collection('tags').where('parentId', '==', sourceTagId).get(),
    candidatesForCollection('cards', 'card', sourceTagId, 'tags'),
    candidatesForCollection('media', 'media', sourceTagId, 'tags'),
    candidatesForCollection('questions', 'question', sourceTagId, 'tagIds'),
    firestore.collection('tag_split_operations').where('sourceTagId', '==', sourceTagId).get(),
  ]);
  if (!sourceDoc.exists) throw new TagSplitConflictError('Tag not found');
  const source = { docId: sourceDoc.id, ...sourceDoc.data() } as Tag;
  if (!source.dimension) throw new TagSplitConflictError('The source Tag has no governed dimension');
  const resumableDoc = operations.docs
    .filter((doc) => ['running', 'failed'].includes(String(doc.data().status)))
    .sort((left, right) => {
      const leftTime = left.data().createdAt?.toMillis?.() ?? 0;
      const rightTime = right.data().createdAt?.toMillis?.() ?? 0;
      return rightTime - leftTime;
    })[0];
  const resumableData = resumableDoc?.data() as Record<string, unknown> | undefined;
  const resumableSelection = resumableData?.selection as Partial<TagSplitSelection> | undefined;
  const resumableOperation = resumableDoc && resumableData && resumableSelection
    ? {
        operationId: resumableDoc.id,
        newName: String(resumableData.newName ?? ''),
        selection: normalizeSelection({
          cardIds: resumableSelection.cardIds ?? [],
          mediaIds: resumableSelection.mediaIds ?? [],
          questionIds: resumableSelection.questionIds ?? [],
        }),
      }
    : undefined;
  const candidates = [...cards, ...media, ...questions];
  if (resumableOperation) {
    const candidateKeys = new Set(candidates.map((candidate) => `${candidate.kind}:${candidate.id}`));
    for (const [kind, collectionName, selectedIds] of [
      ['card', 'cards', resumableOperation.selection.cardIds],
      ['media', 'media', resumableOperation.selection.mediaIds],
      ['question', 'questions', resumableOperation.selection.questionIds],
    ] as const) {
      for (const id of selectedIds) {
        if (candidateKeys.has(`${kind}:${id}`)) continue;
        const record = await firestore.collection(collectionName).doc(id).get();
        if (!record.exists) continue;
        candidates.push({
          id,
          kind,
          label: recordLabel(kind, id, record.data() as Record<string, unknown>),
          directAssignment: true,
          subjectAssignment: true,
          alreadyMoved: true,
        });
      }
    }
  }
  candidates.sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return {
    source: {
      docId: source.docId,
      name: source.name,
      dimension: source.dimension,
      parentId: source.parentId,
    },
    candidates,
    directChildCount: children.size,
    canSplit: candidates.length > 0 && candidates.length <= MAX_SPLIT_RECORDS,
    ...(candidates.length === 0
      ? { blockedReason: 'This Tag has no direct assignments or subject uses to partition.' }
      : candidates.length > MAX_SPLIT_RECORDS
        ? { blockedReason: `This Tag has more than ${MAX_SPLIT_RECORDS} affected records and requires a narrower reviewed partition.` }
        : {}),
    ...(resumableOperation ? { resumableOperation } : {}),
  };
}

async function createOrResumeSplitTarget(input: {
  operationId: string;
  sourceTagId: string;
  newName: string;
  selection: TagSplitSelection;
}): Promise<string> {
  const firestore = getAdminApp().firestore();
  const operationRef = firestore.collection('tag_split_operations').doc(input.operationId);
  const targetRef = firestore.collection('tags').doc();
  const expectedSignature = signature(input.sourceTagId, input.newName, input.selection);
  return firestore.runTransaction(async (tx) => {
    const existingOperation = await tx.get(operationRef);
    if (existingOperation.exists) {
      const data = existingOperation.data() as Record<string, unknown>;
      if (data.signature !== expectedSignature || typeof data.targetTagId !== 'string') {
        throw new TagSplitConflictError('This retry token belongs to a different Tag split');
      }
      return data.targetTagId;
    }
    const [sourceDoc, tagSnapshot] = await Promise.all([
      tx.get(firestore.collection('tags').doc(input.sourceTagId)),
      tx.get(firestore.collection('tags')),
    ]);
    if (!sourceDoc.exists) throw new TagSplitConflictError('Tag not found');
    const source = { docId: sourceDoc.id, ...sourceDoc.data() } as Tag;
    if (!source.dimension) throw new TagSplitConflictError('The source Tag has no governed dimension');
    const normalizedName = input.newName.trim();
    if (!normalizedName) throw new TagSplitConflictError('New Tag name is required');
    const siblingDuplicate = tagSnapshot.docs.some((doc) => {
      const tag = { docId: doc.id, ...doc.data() } as Tag;
      return tag.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase() &&
        (tag.parentId ?? '') === (source.parentId ?? '') &&
        tag.dimension === source.dimension;
    });
    if (siblingDuplicate) throw new TagSplitConflictError('A sibling Tag already uses that name');
    const siblings = tagSnapshot.docs.map((doc) => doc.data() as Tag).filter((tag) =>
      (tag.parentId ?? '') === (source.parentId ?? '') && tag.dimension === source.dimension
    );
    const now = FieldValue.serverTimestamp();
    tx.create(targetRef, {
      name: normalizedName,
      dimension: source.dimension,
      ...(source.parentId ? { parentId: source.parentId } : {}),
      path: source.path ?? [],
      order: siblings.reduce((max, tag) => Math.max(max, tag.order ?? 0), 0) + 1,
      assignable: true,
      cardCount: 0,
      mediaCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    tx.create(operationRef, {
      signature: expectedSignature,
      sourceTagId: input.sourceTagId,
      targetTagId: targetRef.id,
      newName: normalizedName,
      selection: input.selection,
      status: 'running',
      stage: 'target-created',
      createdAt: now,
      updatedAt: now,
    });
    return targetRef.id;
  });
}

function replaceId(values: unknown, sourceTagId: string, targetTagId: string): string[] {
  const current = ids(values);
  return [...new Set(current.map((id) => id === sourceTagId ? targetTagId : id))];
}

export async function splitTagAssignments(input: {
  operationId: string;
  sourceTagId: string;
  newName: string;
  selection: TagSplitSelection;
}): Promise<TagSplitResult> {
  if (!input.operationId.trim()) throw new TagSplitConflictError('A retry token is required');
  const selection = normalizeSelection(input.selection);
  const selectedCount = selection.cardIds.length + selection.mediaIds.length + selection.questionIds.length;
  if (selectedCount < 1) throw new TagSplitConflictError('Select at least one affected record to move');
  if (selectedCount > MAX_SPLIT_RECORDS) throw new TagSplitConflictError(`Select no more than ${MAX_SPLIT_RECORDS} records at once`);
  const targetTagId = await createOrResumeSplitTarget({ ...input, newName: input.newName.trim(), selection });
  const firestore = getAdminApp().firestore();
  const operationRef = firestore.collection('tag_split_operations').doc(input.operationId);
  try {
    const allTags = await getAllTags();
    for (const cardId of selection.cardIds) {
      const snapshot = await firestore.collection('cards').doc(cardId).get();
      if (!snapshot.exists) throw new TagSplitConflictError(`Selected Card ${cardId} no longer exists`);
      const data = snapshot.data() as Record<string, unknown>;
      const sourcePresent = ids(data.tags).includes(input.sourceTagId) || ids(data.subjectTagIds).includes(input.sourceTagId) || data.subjectTagId === input.sourceTagId;
      const targetPresent = ids(data.tags).includes(targetTagId) || ids(data.subjectTagIds).includes(targetTagId) || data.subjectTagId === targetTagId;
      if (!sourcePresent && !targetPresent) throw new TagSplitConflictError(`Selected Card ${cardId} no longer uses the source Tag`);
      await updateCardTags(cardId, {
        tags: [...new Set([...replaceId(data.tags, input.sourceTagId, targetTagId), targetTagId])],
        subjectTagIds: replaceId(data.subjectTagIds ?? (data.subjectTagId ? [data.subjectTagId] : []), input.sourceTagId, targetTagId),
      }, { allTags });
    }
    for (const mediaId of selection.mediaIds) {
      const snapshot = await firestore.collection('media').doc(mediaId).get();
      if (!snapshot.exists) throw new TagSplitConflictError(`Selected Media ${mediaId} no longer exists`);
      const data = snapshot.data() as Record<string, unknown>;
      const sourcePresent = ids(data.tags).includes(input.sourceTagId) || ids(data.subjectTagIds).includes(input.sourceTagId) || data.subjectTagId === input.sourceTagId;
      const targetPresent = ids(data.tags).includes(targetTagId) || ids(data.subjectTagIds).includes(targetTagId) || data.subjectTagId === targetTagId;
      if (!sourcePresent && !targetPresent) throw new TagSplitConflictError(`Selected Media ${mediaId} no longer uses the source Tag`);
      await bulkApplyMediaTags([mediaId], {
        addTagIds: [targetTagId],
        removeTagIds: [input.sourceTagId],
        addSubjectTagIds: [targetTagId],
        removeSubjectTagIds: [input.sourceTagId],
      });
    }
    for (const questionId of selection.questionIds) {
      const snapshot = await firestore.collection('questions').doc(questionId).get();
      if (!snapshot.exists) throw new TagSplitConflictError(`Selected Prompt ${questionId} no longer exists`);
      const data = snapshot.data() as Record<string, unknown>;
      const sourcePresent = ids(data.tagIds).includes(input.sourceTagId) || ids(data.subjectTagIds).includes(input.sourceTagId) || data.subjectTagId === input.sourceTagId;
      const targetPresent = ids(data.tagIds).includes(targetTagId) || ids(data.subjectTagIds).includes(targetTagId) || data.subjectTagId === targetTagId;
      if (!sourcePresent && !targetPresent) throw new TagSplitConflictError(`Selected Prompt ${questionId} no longer uses the source Tag`);
      await updateQuestion(questionId, {
        tagIds: [...new Set([...replaceId(data.tagIds, input.sourceTagId, targetTagId), targetTagId])],
        subjectTagIds: replaceId(data.subjectTagIds ?? (data.subjectTagId ? [data.subjectTagId] : []), input.sourceTagId, targetTagId),
      });
    }
    await operationRef.update({ status: 'completed', stage: 'completed', updatedAt: FieldValue.serverTimestamp() });
    return {
      operationId: input.operationId,
      targetTagId,
      movedCards: selection.cardIds.length,
      movedMedia: selection.mediaIds.length,
      movedQuestions: selection.questionIds.length,
    };
  } catch (error) {
    await operationRef.update({
      status: 'failed',
      stage: 'reconciliation',
      error: error instanceof Error ? error.message : 'Unknown Tag split failure',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}
