/**
 * One-off repair: break a curated childrenIds cycle / wrong parentage, then attach CHILD under PARENT.
 *
 * Usage (requires admin Firebase env / .env):
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/repair-curated-parent-child.ts --dry-run
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/repair-curated-parent-child.ts
 *
 * Edit PARENT_DOC_ID / CHILD_DOC_ID below before running.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

/** Card that should own the relationship (TOC / parent row). */
const PARENT_DOC_ID = 'gysryORyw4RM3KnhYqXu';
/** Card that should become the last direct child of PARENT. */
const CHILD_DOC_ID = 'n6Z5nRdMA3vMV5KyuN68';

function normChildren(data: unknown): string[] {
  return normalizeCuratedChildIds((data as { childrenIds?: unknown })?.childrenIds);
}

async function run(): Promise<void> {
  const dry = process.argv.includes('--dry-run');
  const db = getAdminApp().firestore();
  const parentRef = db.collection('cards').doc(PARENT_DOC_ID);
  const childRef = db.collection('cards').doc(CHILD_DOC_ID);

  const [parentSnap, childSnap] = await Promise.all([parentRef.get(), childRef.get()]);
  if (!parentSnap.exists) throw new Error(`Parent doc not found: ${PARENT_DOC_ID}`);
  if (!childSnap.exists) throw new Error(`Child doc not found: ${CHILD_DOC_ID}`);

  const p0 = parentSnap.data() as Partial<Card>;
  const c0 = childSnap.data() as Partial<Card>;
  console.log('Before:');
  console.log(`  parent ${PARENT_DOC_ID} title=${JSON.stringify(p0.title)} childrenIds=${JSON.stringify(normChildren(p0))}`);
  console.log(`  child  ${CHILD_DOC_ID} title=${JSON.stringify(c0.title)} childrenIds=${JSON.stringify(normChildren(c0))} curatedRoot=${c0.curatedRoot}`);

  const snap = await db.collection('cards').get();
  const touched: string[] = [];

  for (const doc of snap.docs) {
    const ids = normChildren(doc.data());
    if (!ids.includes(CHILD_DOC_ID)) continue;
    const next = ids.filter((id) => id !== CHILD_DOC_ID);
    if (next.length === ids.length) continue;
    touched.push(doc.id);
    console.log(`${dry ? '[dry-run] ' : ''}Strip ${CHILD_DOC_ID} from childrenIds of ${doc.id}`);
    if (!dry) {
      await doc.ref.update({ childrenIds: next, updatedAt: Date.now() });
    }
  }

  const parentSnap2 = await parentRef.get();
  const pIds = normChildren(parentSnap2.data());
  const parentChildren = [...pIds.filter((id) => id !== CHILD_DOC_ID), CHILD_DOC_ID];

  const childSnap2 = await childRef.get();
  const cIds = normChildren(childSnap2.data()).filter((id) => id !== PARENT_DOC_ID);

  console.log(`${dry ? '[dry-run] ' : ''}Set parent ${PARENT_DOC_ID} childrenIds ->`, parentChildren);
  console.log(`${dry ? '[dry-run] ' : ''}Set child ${CHILD_DOC_ID} childrenIds ->`, cIds, 'curatedRoot: false');

  if (!dry) {
    await parentRef.update({ childrenIds: parentChildren, updatedAt: Date.now() });
    await childRef.update({
      childrenIds: cIds,
      curatedRoot: false,
      updatedAt: Date.now(),
    });
  }

  console.log('Done.', dry ? '(no writes)' : 'Writes applied.');
  if (touched.length) console.log('Previously listed child on docs:', touched.join(', '));
  console.log('If you use Typesense for cards, run: npm run sync:typesense');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
