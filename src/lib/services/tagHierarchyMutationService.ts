import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { calculateDerivedTagData } from '@/lib/firebase/tagService';
import { buildTypesenseCardDocumentFromData, importCardsStrict } from '@/lib/services/typesenseService';
import { importMediaDocsStrict, mediaToTypesenseDocument } from '@/lib/services/typesenseMediaService';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type { Question } from '@/lib/types/question';
import type { Tag } from '@/lib/types/tag';
import { buildSubjectFilterTags, normalizeSubjectTagId, normalizeSubjectTagIds } from '@/lib/utils/subjectTag';
import { buildCanonicalTagPaths } from '@/lib/utils/tagHierarchy';
import { buildMutatedTagCatalog, type TagHierarchyMutation } from '@/lib/utils/tagHierarchyMutation';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { computeHierarchicalUniqueIds } from '@/lib/scripts/tags/tag-count-utils';

const BATCH_SIZE = 350;
const INDEX_BATCH_SIZE = 100;

type Projection = Record<string, unknown>;
type PendingWrite = { ref: FirebaseFirestore.DocumentReference; payload: Projection };

export type TagHierarchyMutationResult = {
  operationId: string;
  tagWrites: number;
  cardWrites: number;
  mediaWrites: number;
  questionWrites: number;
  countWrites: number;
  indexedCards: number;
  indexedMedia: number;
};

function normalizedIds(values: unknown): string[] {
  return Array.from(new Set(Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []));
}

function enabledIds(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, enabled]) => enabled === true)
    .map(([id]) => id)
    .sort();
}

function sameIds(left: unknown, right: string[]): boolean {
  const a = normalizedIds(left).sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function projectionMatches(current: Record<string, unknown>, expected: Projection): boolean {
  return Object.entries(expected).every(([key, value]) => {
    if (key === 'filterTags' || key === 'subjectFilterTags') {
      return sameIds(enabledIds(current[key]), enabledIds(value));
    }
    if (Array.isArray(value)) return sameIds(current[key], value as string[]);
    return current[key] === value;
  });
}

function materializeProjectionForIndex<T extends Record<string, unknown>>(current: T, expected: Projection): T {
  const next = { ...current, ...expected } as T;
  for (const [key, value] of Object.entries(expected)) {
    if (value instanceof FieldValue) delete next[key];
  }
  return next;
}

async function expectedCardProjection(card: Card, tags: Tag[]): Promise<Projection> {
  const directTags = normalizedIds(card.tags);
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags, tags);
  const explicitSubjects = normalizeSubjectTagIds(card.subjectTagIds);
  const legacySubject = normalizeSubjectTagId(card.subjectTagId);
  const subjectIds = [
    ...(explicitSubjects.length > 0 ? explicitSubjects : legacySubject ? [legacySubject] : []),
    ...normalizedIds(card.galleryImplicitSubjectTagIds),
  ];
  const tagMap = buildTagMap(tags);
  const journal = computeJournalWhenSortKeys(dimensionalTags.when ?? [], tagMap);
  return {
    filterTags,
    who: dimensionalTags.who ?? [],
    what: dimensionalTags.what ?? [],
    when: dimensionalTags.when ?? [],
    where: dimensionalTags.where ?? [],
    subjectFilterTags: await buildSubjectFilterTags(subjectIds, tags),
    journalWhenSortAsc: journal.journalWhenSortAsc,
    journalWhenSortDesc: journal.journalWhenSortDesc,
  };
}

function transformIds(values: unknown, mutation: TagHierarchyMutation): string[] {
  const current = normalizedIds(values);
  if (mutation.kind === 'cleanup') {
    const removeIds = new Set(mutation.removeTagIds);
    return current.filter((id) => !removeIds.has(id));
  }
  if (mutation.kind === 'remove') return current.filter((id) => id !== mutation.tagId);
  if (mutation.kind === 'merge') {
    return Array.from(new Set(current.map((id) => id === mutation.tagId ? mutation.targetTagId : id)));
  }
  return current;
}

function directAssignmentProjection(record: Record<string, unknown>, mutation: TagHierarchyMutation): Projection {
  if (mutation.kind !== 'remove' && mutation.kind !== 'merge' && mutation.kind !== 'cleanup') return {};
  const subjectTagIds = transformIds(record.subjectTagIds, mutation);
  const legacySubject = normalizeSubjectTagId(
    typeof record.subjectTagId === 'string' ? record.subjectTagId : undefined
  );
  const payload: Projection = {
    tags: transformIds(record.tags, mutation),
    subjectTagIds,
  };
  const removesLegacySubject = mutation.kind === 'cleanup'
    ? mutation.removeTagIds.includes(legacySubject ?? '')
    : legacySubject === mutation.tagId;
  if (removesLegacySubject) {
    payload.subjectTagId = mutation.kind === 'merge' ? mutation.targetTagId : FieldValue.delete();
  }
  if (Array.isArray(record.galleryImplicitSubjectTagIds)) {
    payload.galleryImplicitSubjectTagIds = transformIds(record.galleryImplicitSubjectTagIds, mutation);
  }
  return payload;
}

async function expectedMediaProjection(media: Media, tags: Tag[]): Promise<Projection> {
  const directTags = normalizedIds(media.tags);
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags, tags);
  const explicitSubjects = normalizeSubjectTagIds(media.subjectTagIds);
  const legacySubject = normalizeSubjectTagId(media.subjectTagId);
  const subjectIds = explicitSubjects.length > 0 ? explicitSubjects : legacySubject ? [legacySubject] : [];
  return {
    filterTags,
    who: dimensionalTags.who ?? [],
    what: dimensionalTags.what ?? [],
    when: dimensionalTags.when ?? [],
    where: dimensionalTags.where ?? [],
    subjectFilterTags: await buildSubjectFilterTags(subjectIds, tags),
    hasTags: directTags.length > 0,
    hasWho: (dimensionalTags.who ?? []).length > 0,
    hasWhat: (dimensionalTags.what ?? []).length > 0,
    hasWhen: (dimensionalTags.when ?? []).length > 0,
    hasWhere: (dimensionalTags.where ?? []).length > 0,
  };
}

async function expectedQuestionProjection(question: Question, tags: Tag[]): Promise<Projection> {
  const explicitSubjects = normalizeSubjectTagIds(question.subjectTagIds);
  const legacySubject = normalizeSubjectTagId(question.subjectTagId);
  const subjectIds = explicitSubjects.length > 0 ? explicitSubjects : legacySubject ? [legacySubject] : [];
  return { subjectFilterTags: await buildSubjectFilterTags(subjectIds, tags) };
}

async function commitWrites(writes: PendingWrite[]) {
  const firestore = getAdminApp().firestore();
  for (let start = 0; start < writes.length; start += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const write of writes.slice(start, start + BATCH_SIZE)) {
      batch.update(write.ref, { ...write.payload, updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
  }
}

async function indexProjections(cards: Card[], media: Media[], tags: Tag[]) {
  const tagMap = new Map(tags.map((tag) => [tag.docId!, tag.name || tag.docId!]));
  for (let start = 0; start < cards.length; start += INDEX_BATCH_SIZE) {
    const docs = cards.slice(start, start + INDEX_BATCH_SIZE).map((card) =>
      buildTypesenseCardDocumentFromData(card.docId, card as unknown as Record<string, unknown>, tagMap));
    await importCardsStrict(docs);
  }
  for (let start = 0; start < media.length; start += INDEX_BATCH_SIZE) {
    const docs = media.slice(start, start + INDEX_BATCH_SIZE).map((item) =>
      mediaToTypesenseDocument(item, tagMap));
    await importMediaDocsStrict(docs);
  }
}

function referencesTag(record: Record<string, unknown>, tagId: string): boolean {
  return normalizedIds(record.tags).includes(tagId) ||
    enabledIds(record.filterTags).includes(tagId) ||
    enabledIds(record.subjectFilterTags).includes(tagId);
}

export async function mutateTagHierarchy(mutation: TagHierarchyMutation): Promise<TagHierarchyMutationResult> {
  const firestore = getAdminApp().firestore();
  const operationRef = firestore.collection('tag_mutation_operations').doc();
  const operationId = operationRef.id;
  await operationRef.set({
    kind: mutation.kind,
    tagId: mutation.tagId,
    status: 'running',
    stage: 'planning',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const [tagSnap, cardSnap, mediaSnap, questionSnap] = await Promise.all([
      firestore.collection('tags').get(),
      firestore.collection('cards').get(),
      firestore.collection('media').get(),
      firestore.collection('questions').get(),
    ]);
    const currentTags = tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
    const nextTags = buildMutatedTagCatalog(currentTags, mutation);
    buildCanonicalTagPaths(nextTags);

    const currentById = new Map(currentTags.map((tag) => [tag.docId!, tag]));
    const tagWrites: PendingWrite[] = [];
    for (const tag of nextTags) {
      if (!tag.docId) continue;
      const before = currentById.get(tag.docId)!;
      const payload: Projection = {};
      if (before.name !== tag.name) payload.name = tag.name;
      if ((before.parentId ?? '') !== (tag.parentId ?? '')) payload.parentId = tag.parentId ?? FieldValue.delete();
      if (!sameIds(before.path, tag.path ?? [])) payload.path = tag.path ?? [];
      if (Object.keys(payload).length > 0) tagWrites.push({ ref: firestore.collection('tags').doc(tag.docId), payload });
    }

    const cardWrites: PendingWrite[] = [];
    const mediaWrites: PendingWrite[] = [];
    const questionWrites: PendingWrite[] = [];
    const cardsToIndex: Card[] = [];
    const mediaToIndex: Media[] = [];

    for (const doc of cardSnap.docs) {
      const current = { docId: doc.id, ...doc.data() } as Card;
      const direct = directAssignmentProjection(current as unknown as Record<string, unknown>, mutation);
      const effective = { ...current, ...direct } as Card;
      const expected = { ...direct, ...(await expectedCardProjection(effective, nextTags)) };
      const shouldIndex = mutation.kind === 'remove' || mutation.kind === 'merge' || mutation.kind === 'cleanup' || referencesTag(current as unknown as Record<string, unknown>, mutation.tagId) || !projectionMatches(current as unknown as Record<string, unknown>, expected);
      if (!projectionMatches(current as unknown as Record<string, unknown>, expected)) {
        cardWrites.push({ ref: doc.ref, payload: expected });
      }
      if (shouldIndex) cardsToIndex.push(materializeProjectionForIndex(
        current as unknown as Record<string, unknown>, expected
      ) as unknown as Card);
    }

    for (const doc of mediaSnap.docs) {
      const current = { docId: doc.id, ...doc.data() } as Media;
      const direct = directAssignmentProjection(current as unknown as Record<string, unknown>, mutation);
      const effective = { ...current, ...direct } as Media;
      const expected = { ...direct, ...(await expectedMediaProjection(effective, nextTags)) };
      const shouldIndex = mutation.kind === 'remove' || mutation.kind === 'merge' || mutation.kind === 'cleanup' || referencesTag(current as unknown as Record<string, unknown>, mutation.tagId) || !projectionMatches(current as unknown as Record<string, unknown>, expected);
      if (!projectionMatches(current as unknown as Record<string, unknown>, expected)) {
        mediaWrites.push({ ref: doc.ref, payload: expected });
      }
      if (shouldIndex) mediaToIndex.push(materializeProjectionForIndex(
        current as unknown as Record<string, unknown>, expected
      ) as unknown as Media);
    }

    for (const doc of questionSnap.docs) {
      const current = { docId: doc.id, ...doc.data() } as Question;
      const direct = directAssignmentProjection(current as unknown as Record<string, unknown>, mutation);
      const effective = { ...current, ...direct } as Question;
      const expected = { ...direct, ...(await expectedQuestionProjection(effective, nextTags)) };
      if (!projectionMatches(current as unknown as Record<string, unknown>, expected)) {
        questionWrites.push({ ref: doc.ref, payload: expected });
      }
    }

    const publishedCards = cardSnap.docs
      .filter((doc) => doc.data().status === 'published')
      .map((doc) => ({ objectId: doc.id, tagIds: transformIds(doc.data().tags, mutation) }));
    const mediaAssignments = mediaSnap.docs
      .map((doc) => ({ objectId: doc.id, tagIds: transformIds(doc.data().tags, mutation) }));
    const cardCounts = computeHierarchicalUniqueIds(nextTags, publishedCards);
    const mediaCounts = computeHierarchicalUniqueIds(nextTags, mediaAssignments);
    const countWrites: PendingWrite[] = [];
    for (const tag of nextTags) {
      if (!tag.docId) continue;
      const expectedCards = [...(cardCounts.get(tag.docId) ?? [])];
      const expectedMedia = [...(mediaCounts.get(tag.docId) ?? [])];
      if (tag.cardCount !== expectedCards.length || !sameIds(tag.uniqueCardIds, expectedCards) ||
          tag.mediaCount !== expectedMedia.length || !sameIds(tag.uniqueMediaIds, expectedMedia)) {
        countWrites.push({
          ref: firestore.collection('tags').doc(tag.docId),
          payload: {
            cardCount: expectedCards.length,
            uniqueCardIds: expectedCards,
            mediaCount: expectedMedia.length,
            uniqueMediaIds: expectedMedia,
          },
        });
      }
    }

    await operationRef.update({ stage: 'authoritative-write', updatedAt: FieldValue.serverTimestamp() });
    await commitWrites(tagWrites);
    await operationRef.update({ stage: 'projection-write', updatedAt: FieldValue.serverTimestamp() });
    await commitWrites([...cardWrites, ...mediaWrites, ...questionWrites]);
    await operationRef.update({ stage: 'count-write', updatedAt: FieldValue.serverTimestamp() });
    await commitWrites(countWrites);
    await operationRef.update({ stage: 'search-index', updatedAt: FieldValue.serverTimestamp() });
    await indexProjections(cardsToIndex, mediaToIndex, nextTags);
    if (mutation.kind === 'remove' || mutation.kind === 'merge' || mutation.kind === 'cleanup') {
      await operationRef.update({ stage: 'tag-delete', updatedAt: FieldValue.serverTimestamp() });
      const deleteIds = mutation.kind === 'cleanup' ? mutation.removeTagIds : [mutation.tagId];
      for (let start = 0; start < deleteIds.length; start += BATCH_SIZE) {
        const batch = firestore.batch();
        deleteIds.slice(start, start + BATCH_SIZE).forEach((tagId) => {
          batch.delete(firestore.collection('tags').doc(tagId));
        });
        await batch.commit();
      }
    }

    const result: TagHierarchyMutationResult = {
      operationId,
      tagWrites: tagWrites.length,
      cardWrites: cardWrites.length,
      mediaWrites: mediaWrites.length,
      questionWrites: questionWrites.length,
      countWrites: countWrites.length,
      indexedCards: cardsToIndex.length,
      indexedMedia: mediaToIndex.length,
    };
    await operationRef.update({
      status: 'complete',
      stage: 'complete',
      result,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return result;
  } catch (error) {
    try {
      await operationRef.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (statusError) {
      console.error(`[Tag mutation ${operationId}] Failed to persist failure status:`, statusError);
    }
    throw error;
  }
}
