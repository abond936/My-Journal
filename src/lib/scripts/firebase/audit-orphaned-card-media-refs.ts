import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { extractMediaFromContent } from '@/lib/utils/cardUtils';

const db = getAdminApp().firestore();
const APPLY_MODE = process.argv.includes('--apply');

function removeMediaFigureFromContent(
  html: string | null | undefined,
  mediaId: string
): string {
  if (!html || typeof html !== 'string') return html ?? '';
  const escaped = mediaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html
    .replace(
      new RegExp(
        `<figure[^>]*data-media-id=["']${escaped}["'][^>]*>[\\s\\S]*?<\\/figure>`,
        'gi'
      ),
      ''
    )
    .replace(/\n\s*\n\s*\n/g, '\n\n');
}

async function main(): Promise<void> {
  const [cardsSnap, mediaSnap] = await Promise.all([
    db.collection('cards').get(),
    db.collection('media').get(),
  ]);

  const mediaIds = new Set(mediaSnap.docs.map((doc) => doc.id));

  let coverImageId = 0;
  let galleryMedia = 0;
  let contentHtml = 0;
  let cardsUpdated = 0;
  const sample: Array<{ cardId: string; title: string; type: string; mediaId: string }> = [];

  for (const doc of cardsSnap.docs) {
    const card = doc.data() as Card;
    const cardId = doc.id;
    const title = card.title ?? '(untitled)';

    let cardChanged = false;
    const updates: Partial<Card> = {};
    let cleanedContent = card.content ?? '';
    const invalidEmbeddedIds: string[] = [];

    if (card.coverImageId && !mediaIds.has(card.coverImageId)) {
      coverImageId += 1;
      updates.coverImageId = null;
      cardChanged = true;
      if (sample.length < 25) {
        sample.push({ cardId, title, type: 'coverImageId', mediaId: card.coverImageId });
      }
    }

    for (const item of card.galleryMedia ?? []) {
      if (item.mediaId && !mediaIds.has(item.mediaId)) {
        galleryMedia += 1;
        if (sample.length < 25) {
          sample.push({ cardId, title, type: 'galleryMedia', mediaId: item.mediaId });
        }
      }
    }

    for (const mediaId of extractMediaFromContent(card.content)) {
      if (!mediaIds.has(mediaId)) {
        contentHtml += 1;
        invalidEmbeddedIds.push(mediaId);
        cleanedContent = removeMediaFigureFromContent(cleanedContent, mediaId);
        cardChanged = true;
        if (sample.length < 25) {
          sample.push({ cardId, title, type: 'contentHtml', mediaId });
        }
      }
    }

    if (cardChanged && APPLY_MODE) {
      updates.content = cleanedContent;
      updates.contentMedia = extractMediaFromContent(cleanedContent);
      updates.updatedAt = Date.now();
      await doc.ref.update(updates);
      cardsUpdated += 1;
    }
  }

  const total = coverImageId + galleryMedia + contentHtml;
  console.log(
    JSON.stringify(
      {
        cardsScanned: cardsSnap.size,
        mediaDocs: mediaSnap.size,
        orphanedReferences: {
          coverImageId,
          galleryMedia,
          contentHtml,
          total,
        },
        mode: APPLY_MODE ? 'apply' : 'dry-run',
        cardsUpdated,
        sample,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('[audit-orphaned-card-media-refs] failed', error);
  process.exitCode = 1;
});
