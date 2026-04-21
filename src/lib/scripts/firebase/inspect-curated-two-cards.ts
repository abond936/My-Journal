/** Read-only: dump two cards and any card that lists them in childrenIds. */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

const A = 'gysryORyw4RM3KnhYqXu';
const B = 'n6Z5nRdMA3vMV5KyuN68';

async function run(): Promise<void> {
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
