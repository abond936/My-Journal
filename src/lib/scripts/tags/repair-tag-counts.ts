import 'dotenv/config';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { computeHierarchicalUniqueIds } from './tag-count-utils';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 350;
type TagCountDoc = {
  docId: string;
  parentId?: string;
  cardCount?: number;
  mediaCount?: number;
  uniqueCardIds?: string[];
  uniqueMediaIds?: string[];
};

function sameIds(actual: string[] | undefined, expected: Set<string>): boolean {
  if ((actual?.length ?? 0) !== expected.size) return false;
  return (actual ?? []).every((id) => expected.has(id));
}

async function run() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, cardSnap, mediaSnap] = await Promise.all([
    firestore.collection('tags').get(),
    firestore.collection('cards').where('status', '==', 'published').select('tags').get(),
    firestore.collection('media').select('tags').get(),
  ]);
  const tags = tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as TagCountDoc);
  const cardIds = computeHierarchicalUniqueIds(tags, cardSnap.docs.map((doc) => ({ objectId: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })));
  const mediaIds = computeHierarchicalUniqueIds(tags, mediaSnap.docs.map((doc) => ({ objectId: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })));
  const cardCountMismatches = tags.filter((tag) => tag.cardCount !== (cardIds.get(tag.docId)?.size ?? 0));
  const cardIdMismatches = tags.filter((tag) => !sameIds(tag.uniqueCardIds, cardIds.get(tag.docId) ?? new Set()));
  const mediaCountMismatches = tags.filter((tag) => tag.mediaCount !== (mediaIds.get(tag.docId)?.size ?? 0));
  const mediaIdMismatches = tags.filter((tag) => !sameIds(tag.uniqueMediaIds, mediaIds.get(tag.docId) ?? new Set()));
  const cardMismatches = tags.filter((tag) => cardCountMismatches.includes(tag) || cardIdMismatches.includes(tag));
  const mediaMismatches = tags.filter((tag) => mediaCountMismatches.includes(tag) || mediaIdMismatches.includes(tag));
  const affected = tags.filter((tag) => cardMismatches.includes(tag) || mediaMismatches.includes(tag));
  console.log(`Tags: ${tags.length}`);
  console.log(`Card count mismatches: ${cardCountMismatches.length}; unique-card-ID mismatches: ${cardIdMismatches.length}`);
  console.log(`Media count mismatches: ${mediaCountMismatches.length}; unique-media-ID mismatches: ${mediaIdMismatches.length}`);
  console.log(`Affected tags: ${affected.length}`);
  if (!APPLY) {
    console.log('Audit only. No writes performed.');
    return;
  }
  for (let start = 0; start < affected.length; start += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const tag of affected.slice(start, start + BATCH_SIZE)) {
      const expectedCards = [...(cardIds.get(tag.docId) ?? [])];
      const expectedMedia = [...(mediaIds.get(tag.docId) ?? [])];
      batch.update(firestore.collection('tags').doc(tag.docId), {
        cardCount: expectedCards.length,
        uniqueCardIds: expectedCards,
        mediaCount: expectedMedia.length,
        uniqueMediaIds: expectedMedia,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  console.log(`Updated ${affected.length} tag count projections.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
