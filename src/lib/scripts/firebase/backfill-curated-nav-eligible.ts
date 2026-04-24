/**
 * One-time backfill: set `curatedNavEligible` on every card document for `getCollectionCards` queries.
 *
 * Usage:
 *   npx tsx src/lib/scripts/firebase/backfill-curated-nav-eligible.ts
 *   npx tsx src/lib/scripts/firebase/backfill-curated-nav-eligible.ts --dry-run
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { computeCuratedNavEligible } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';

const CARDS_COLLECTION = 'cards';
const BATCH_SIZE = 400;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();

  console.log(dryRun ? 'Dry run (no writes)' : 'Writing curatedNavEligible on all cards…');

  const snap = await firestore.collection(CARDS_COLLECTION).get();
  let updated = 0;
  let skipped = 0;
  let batch = firestore.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Card;
    const next = computeCuratedNavEligible({
      childrenIds: data.childrenIds,
    });
    if (data.curatedNavEligible === next) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] ${doc.id} -> curatedNavEligible=${next}`);
      updated++;
      continue;
    }
    batch.update(doc.ref, { curatedNavEligible: next });
    batchCount++;
    updated++;
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = firestore.batch();
      batchCount = 0;
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log(`Done. updated=${updated} skipped=${skipped} total=${snap.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
