/** Read-only diagnostics: inspect two cards, or verify curated master card existence. */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

const A = 'gysryORyw4RM3KnhYqXu';
const B = 'n6Z5nRdMA3vMV5KyuN68';

function parseFlag(flag: string): string | null {
  const idx = process.argv.findIndex((arg) => arg === flag);
  if (idx < 0) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function inspectMaster(masterId: string): Promise<void> {
  const db = getAdminApp().firestore();
  const masterSnap = await db.collection('cards').doc(masterId).get();
  if (!masterSnap.exists) {
    console.error(`Master card not found: ${masterId}`);
    process.exitCode = 2;
    return;
  }

  const master = masterSnap.data() as Card;
  const topLevelIds = normalizeCuratedChildIds(master.childrenIds);
  const topLevelSnaps = await Promise.all(topLevelIds.map((id) => db.collection('cards').doc(id).get()));
  const missingChildren = topLevelIds.filter((id, i) => !topLevelSnaps[i]?.exists);
  const presentChildren = topLevelSnaps.filter((s): s is FirebaseFirestore.DocumentSnapshot => Boolean(s?.exists));

  console.log('=== Curated Master Check ===');
  console.log(`Master ID: ${masterId}`);
  console.log(`Master title: ${master.title || '(untitled)'}`);
  console.log(`Direct child refs: ${topLevelIds.length}`);
  console.log(`Resolvable direct children: ${presentChildren.length}`);
  if (missingChildren.length > 0) {
    console.log(`Missing referenced children (${missingChildren.length}): ${missingChildren.join(', ')}`);
  } else {
    console.log('Missing referenced children: none');
  }
}

async function run(): Promise<void> {
  const masterId = parseFlag('--master-id') || process.env.NEXT_PUBLIC_CURATED_TREE_MASTER_ID || null;
  if (masterId) {
    await inspectMaster(masterId);
    return;
  }

  const db = getAdminApp().firestore();
  const [aSnap, bSnap] = await Promise.all([db.collection('cards').doc(A).get(), db.collection('cards').doc(B).get()]);
  console.log('--- Doc A (My Future) ---');
  console.log(aSnap.exists ? JSON.stringify(aSnap.data(), null, 2) : 'MISSING');
  console.log('--- Doc B (I have a Dream) ---');
  console.log(bSnap.exists ? JSON.stringify(bSnap.data(), null, 2) : 'MISSING');

  const snap = await db.collection('cards').get();
  const refsA: string[] = [];
  const refsB: string[] = [];
  for (const doc of snap.docs) {
    const ids = normalizeCuratedChildIds((doc.data() as Card).childrenIds);
    if (ids.includes(A)) refsA.push(doc.id);
    if (ids.includes(B)) refsB.push(doc.id);
  }
  console.log('--- Cards whose childrenIds include A ---', refsA.length ? refsA.join(', ') : '(none)');
  console.log('--- Cards whose childrenIds include B ---', refsB.length ? refsB.join(', ') : '(none)');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
