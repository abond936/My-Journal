import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { Card } from '@/lib/types/card';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';

function computeDimensionSortKeys(
  directTagIds: string[] | undefined,
  tagsById: Map<string, { name?: string; dimension?: string }>
): Pick<Card, 'whoSortKey' | 'whatSortKey' | 'whereSortKey'> {
  const buckets: Record<'who' | 'what' | 'where', string[]> = {
    who: [],
    what: [],
    where: [],
  };

  for (const tagId of directTagIds || []) {
    const tag = tagsById.get(tagId);
    if (!tag?.name || !tag.dimension) continue;
    const dim = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
    if (dim === 'who' || dim === 'what' || dim === 'where') {
      buckets[dim].push(tag.name.trim().toLowerCase());
    }
  }

  const pick = (values: string[]) => values.filter(Boolean).sort((a, b) => a.localeCompare(b))[0] || '\uffff';

  return {
    whoSortKey: pick(buckets.who),
    whatSortKey: pick(buckets.what),
    whereSortKey: pick(buckets.where),
  };
}

async function main() {
  const allTags = await getAllTags();
  const tagsById = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));

  const snapshot = await firestore.collection(CARDS_COLLECTION).get();
  let scanned = 0;
  let updated = 0;
  let unchanged = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const card = doc.data() as Card;
    const next = computeDimensionSortKeys(card.tags || [], tagsById);

    const same =
      (card.whoSortKey || '\uffff') === next.whoSortKey &&
      (card.whatSortKey || '\uffff') === next.whatSortKey &&
      (card.whereSortKey || '\uffff') === next.whereSortKey;

    if (same) {
      unchanged += 1;
      continue;
    }

    await doc.ref.update({
      whoSortKey: next.whoSortKey,
      whatSortKey: next.whatSortKey,
      whereSortKey: next.whereSortKey,
      updatedAt: Date.now(),
    });
    updated += 1;
  }

  console.log(`[backfill-card-dimension-sort-keys] scanned=${scanned} updated=${updated} unchanged=${unchanged}`);
}

main().catch((error) => {
  console.error('[backfill-card-dimension-sort-keys] failed', error);
  process.exitCode = 1;
});
