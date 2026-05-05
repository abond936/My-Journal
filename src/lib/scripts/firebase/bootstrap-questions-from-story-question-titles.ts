import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { syncCardToTypesense } from '@/lib/services/typesenseService';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

const firestore = getAdminApp().firestore();

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function normalizeQuestionTagNames(tags: Tag[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag.name ?? '').trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 50);
}

function selectDirectWhatTags(card: Card, tagsById: Map<string, Tag>): Tag[] {
  const directTagIds = Array.isArray(card.tags) ? card.tags : [];
  return directTagIds
    .map((tagId) => tagsById.get(tagId))
    .filter((tag): tag is Tag => Boolean(tag) && tag.dimension === 'what');
}

function looksLikeQuestionTitle(title: string): boolean {
  return title.trim().endsWith('?');
}

async function main(): Promise<void> {
  const apply = hasArg('--apply');
  const tags = await getAllTags();
  const tagsById = new Map(tags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));

  const cardsSnap = await firestore.collection('cards').where('type', '==', 'story').get();
  const candidates: Array<{
    id: string;
    title: string;
    status: Card['status'] | string;
    whatTagIds: string[];
    whatTagNames: string[];
  }> = [];

  for (const cardDoc of cardsSnap.docs) {
    const card = { docId: cardDoc.id, ...cardDoc.data() } as Card;
    const title = typeof card.title === 'string' ? card.title.trim() : '';
    if (!title || !looksLikeQuestionTitle(title)) continue;
    if (card.questionId) continue;

    const directWhatTags = selectDirectWhatTags(card, tagsById);
    candidates.push({
      id: cardDoc.id,
      title,
      status: card.status,
      whatTagIds: directWhatTags.map((tag) => tag.docId!).filter(Boolean),
      whatTagNames: normalizeQuestionTagNames(directWhatTags),
    });
  }

  console.log(`[bootstrap-questions-from-story-titles] apply=${apply}`);
  console.log(`[bootstrap-questions-from-story-titles] scannedStories=${cardsSnap.size}`);
  console.log(`[bootstrap-questions-from-story-titles] planned=${candidates.length}`);
  console.log(
    `[bootstrap-questions-from-story-titles] publishedToDraft=${candidates.filter((card) => card.status === 'published').length}`
  );
  console.log(
    `[bootstrap-questions-from-story-titles] sample=${JSON.stringify(
      candidates.slice(0, 10),
      null,
      2
    )}`
  );

  if (!apply) {
    console.log(
      '[bootstrap-questions-from-story-titles] dry run only; rerun with --apply to write.'
    );
    return;
  }

  let batch = firestore.batch();
  let pendingWrites = 0;
  let writtenCards = 0;
  const syncedCards: Card[] = [];

  for (const candidate of candidates) {
    const now = Date.now();
    const questionRef = firestore.collection('questions').doc();
    const cardRef = firestore.collection('cards').doc(candidate.id);
    const nextDisplayMode = normalizeDisplayModeForType('qa', 'navigate');

    batch.set(questionRef, {
      prompt: candidate.title,
      prompt_lowercase: candidate.title.toLowerCase(),
      tagIds: candidate.whatTagIds,
      tags: candidate.whatTagNames,
      usedByCardIds: [candidate.id],
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(cardRef, {
      questionId: questionRef.id,
      type: 'qa',
      status: 'draft',
      displayMode: nextDisplayMode,
      updatedAt: now,
    });
    pendingWrites += 2;
    writtenCards += 1;

    const cardSnap = await cardRef.get();
    const nextCard = { docId: candidate.id, ...cardSnap.data() } as Card;
    syncedCards.push({
      ...nextCard,
      questionId: questionRef.id,
      type: 'qa',
      status: 'draft',
      displayMode: nextDisplayMode,
      updatedAt: now,
    });

    if (pendingWrites >= 400) {
      await batch.commit();
      batch = firestore.batch();
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  for (const card of syncedCards) {
    await syncCardToTypesense(card);
  }

  console.log(`[bootstrap-questions-from-story-titles] written=${writtenCards}`);
  console.log(`[bootstrap-questions-from-story-titles] typesenseSynced=${syncedCards.length}`);
}

main().catch((error) => {
  console.error('[bootstrap-questions-from-story-titles] failed', error);
  process.exitCode = 1;
});
