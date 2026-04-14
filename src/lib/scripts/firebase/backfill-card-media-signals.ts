import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { Card } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';

const firestore = getAdminApp().firestore();

function getMediaIdsFromCard(card: Card): Set<string> {
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  (card.galleryMedia || []).forEach((item) => {
    if (item.mediaId) ids.add(item.mediaId);
  });
  (card.contentMedia || []).forEach((item) => {
    if (item.mediaId) ids.add(item.mediaId);
  });
  return ids;
}

function computeSignals(mediaTagIds: string[], allTags: Map<string, { dimension?: string }>) {
  const out = {
    mediaWho: new Set<string>(),
    mediaWhat: new Set<string>(),
    mediaWhen: new Set<string>(),
    mediaWhere: new Set<string>(),
  };
  mediaTagIds.forEach((tagId) => {
    const dim = String(allTags.get(tagId)?.dimension || '');
    if (dim === 'who') out.mediaWho.add(tagId);
    else if (dim === 'what' || dim === 'reflection') out.mediaWhat.add(tagId);
    else if (dim === 'when') out.mediaWhen.add(tagId);
    else if (dim === 'where') out.mediaWhere.add(tagId);
  });
  return {
    mediaWho: Array.from(out.mediaWho),
    mediaWhat: Array.from(out.mediaWhat),
    mediaWhen: Array.from(out.mediaWhen),
    mediaWhere: Array.from(out.mediaWhere),
  };
}

async function main() {
  const allTags = await getAllTags();
  const tagsById = new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));
  const cardsSnap = await firestore.collection('cards').get();
  let scanned = 0;
  let updated = 0;
  let unchanged = 0;

  for (const cardDoc of cardsSnap.docs) {
    scanned += 1;
    const card = cardDoc.data() as Card;
    const mediaIds = Array.from(getMediaIdsFromCard(card));
    const mediaDocs = await Promise.all(mediaIds.map((id) => firestore.collection('media').doc(id).get()));
    const mediaTagIds = new Set<string>();
    mediaDocs.forEach((doc) => {
      const media = doc.exists ? (doc.data() as Media) : undefined;
      (media?.tags || []).forEach((tagId) => {
        if (typeof tagId === 'string' && tagId.trim()) mediaTagIds.add(tagId);
      });
    });
    const next = computeSignals(Array.from(mediaTagIds), tagsById);
    const same =
      JSON.stringify(card.mediaWho || []) === JSON.stringify(next.mediaWho) &&
      JSON.stringify(card.mediaWhat || []) === JSON.stringify(next.mediaWhat) &&
      JSON.stringify(card.mediaWhen || []) === JSON.stringify(next.mediaWhen) &&
      JSON.stringify(card.mediaWhere || []) === JSON.stringify(next.mediaWhere);
    if (same) {
      unchanged += 1;
      continue;
    }
    await cardDoc.ref.update({
      mediaWho: next.mediaWho,
      mediaWhat: next.mediaWhat,
      mediaWhen: next.mediaWhen,
      mediaWhere: next.mediaWhere,
      updatedAt: Date.now(),
    });
    updated += 1;
  }

  console.log(`[backfill-card-media-signals] scanned=${scanned} updated=${updated} unchanged=${unchanged}`);
}

main().catch((error) => {
  console.error('[backfill-card-media-signals] failed', error);
  process.exitCode = 1;
});
