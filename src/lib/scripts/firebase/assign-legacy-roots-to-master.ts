/**
 * Migrate legacy curated roots into a configured master card's `childrenIds`.
 *
 * Default mode is dry-run (no writes). Use `--apply` to write.
 *
 * Usage:
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/assign-legacy-roots-to-master.ts --master-id <id>
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/assign-legacy-roots-to-master.ts --apply --master-id <id>
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/assign-legacy-roots-to-master.ts --apply   # reads NEXT_PUBLIC_CURATED_TREE_MASTER_ID
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { compareCuratedRootCards, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

const CARDS_COLLECTION = 'cards';

function parseFlag(flag: string): string | null {
  const idx = process.argv.findIndex((arg) => arg === flag);
  if (idx < 0) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const masterId = parseFlag('--master-id') || process.env.NEXT_PUBLIC_CURATED_TREE_MASTER_ID || null;
  if (!masterId) {
    throw new Error('Missing master id. Pass --master-id <id> or set NEXT_PUBLIC_CURATED_TREE_MASTER_ID.');
  }

  const db = getAdminApp().firestore();
  const cardsSnap = await db.collection(CARDS_COLLECTION).get();
  const cards = cardsSnap.docs.map((doc) => ({ docId: doc.id, ...(doc.data() as Card) }));
  const byId = new Map(cards.map((c) => [c.docId, c]));
  const master = byId.get(masterId);
  if (!master) {
    throw new Error(`Master card not found: ${masterId}`);
  }

  const parentByChild = new Map<string, string>();
  for (const parent of cards) {
    for (const childId of normalizeCuratedChildIds(parent.childrenIds)) {
      parentByChild.set(childId, parent.docId);
    }
  }

  const legacyRoots = cards.filter((card) => {
    if (card.docId === masterId) return false;
    if (parentByChild.has(card.docId)) return false;
    const hasChildren = normalizeCuratedChildIds(card.childrenIds).length > 0;
    return hasChildren || card.curatedRoot === true;
  });
  legacyRoots.sort(compareCuratedRootCards);
  const nextChildrenIds = legacyRoots.map((c) => c.docId);
  const currentMasterChildren = normalizeCuratedChildIds(master.childrenIds);

  console.log('=== Assign Legacy Roots To Master ===');
  console.log(`Mode: ${apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`);
  console.log(`Master id: ${masterId}`);
  console.log(`Master title: ${master.title || '(untitled)'}`);
  console.log(`Current master children: ${currentMasterChildren.length}`);
  console.log(`Detected legacy roots: ${nextChildrenIds.length}`);
  console.log('Next master childrenIds order:');
  nextChildrenIds.forEach((id, i) => {
    const c = byId.get(id);
    console.log(`${String(i + 1).padStart(3, ' ')}. ${id}  ${c?.title ? `(${c.title})` : ''}`);
  });

  if (!apply) {
    console.log('\nDry run complete. Re-run with --apply to write this childrenIds list to the master card.');
    return;
  }

  await db.collection(CARDS_COLLECTION).doc(masterId).update({
    childrenIds: nextChildrenIds,
    updatedAt: Date.now(),
  });
  console.log('\nWrite complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

