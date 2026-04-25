import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';

const firestore = getAdminApp().firestore();

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

async function main(): Promise<void> {
  const apply = hasArg('--apply');
  const cardsSnap = await firestore.collection('cards').where('type', '==', 'qa').get();
  let scanned = 0;
  let alreadyLinked = 0;
  let planned = 0;
  let written = 0;

  let batch = firestore.batch();
  let pendingWrites = 0;
  const now = Date.now();

  for (const cardDoc of cardsSnap.docs) {
    scanned += 1;
    const card = cardDoc.data() as Card;
    if (card.questionId) {
      alreadyLinked += 1;
      continue;
    }

    planned += 1;
    if (!apply) continue;

    const questionRef = firestore.collection('questions').doc();
    const prompt = (card.title || 'Untitled question').trim();
    batch.set(questionRef, {
      prompt,
      prompt_lowercase: prompt.toLowerCase(),
      tagIds: [],
      tags: [],
      usedByCardIds: [cardDoc.id],
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(cardDoc.ref, {
      questionId: questionRef.id,
      updatedAt: now,
    });
    pendingWrites += 2;
    written += 1;
    if (pendingWrites >= 400) {
      await batch.commit();
      batch = firestore.batch();
      pendingWrites = 0;
    }
  }

  if (apply && pendingWrites > 0) {
    await batch.commit();
  }

  console.log(`[bootstrap-questions] apply=${apply}`);
  console.log(`[bootstrap-questions] scanned=${scanned}`);
  console.log(`[bootstrap-questions] alreadyLinked=${alreadyLinked}`);
  console.log(`[bootstrap-questions] planned=${planned}`);
  console.log(`[bootstrap-questions] written=${written}`);
  if (!apply) {
    console.log('[bootstrap-questions] dry run only; rerun with --apply to write.');
  }
}

main().catch(error => {
  console.error('[bootstrap-questions] failed', error);
  process.exitCode = 1;
});
