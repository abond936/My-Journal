/**
 * Remove a doc id from another card's childrenIds (stale duplicate parentage).
 * gysry was still listed under C4v… so it never appeared as a curated root.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

const WRONG_PARENT_DOC_ID = 'C4vNTDgFSHOBCRUgutaL';
const REMOVE_CHILD_ID = 'gysryORyw4RM3KnhYqXu';

async function run(): Promise<void> {
  const dry = process.argv.includes('--dry-run');
  const db = getAdminApp().firestore();
  const ref = db.collection('cards').doc(WRONG_PARENT_DOC_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Doc not found: ${WRONG_PARENT_DOC_ID}`);
  const ids = normalizeCuratedChildIds(snap.data()?.childrenIds);
  const title = (snap.data() as { title?: string })?.title;
  console.log(`Parent ${WRONG_PARENT_DOC_ID} title=${JSON.stringify(title)}`);
  console.log('childrenIds before:', ids);
  const next = ids.filter((id) => id !== REMOVE_CHILD_ID);
  if (next.length === ids.length) {
    console.log('Nothing to remove; already clean.');
    return;
  }
  console.log(`${dry ? '[dry-run] ' : ''}childrenIds after:`, next);
  if (!dry) await ref.update({ childrenIds: next, updatedAt: Date.now() });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
