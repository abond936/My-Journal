/**
 * Sets journalWhenSortAsc / journalWhenSortDesc on all cards from current When tags.
 * Run after deploying journal-time sort (required before /api/cards list queries work).
 *
 * Usage: npx tsx src/lib/scripts/cards/backfill-journal-when-sort.ts [--apply]
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAllTags } from '@/lib/firebase/tagService';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import type { Card } from '@/lib/types/card';

getAdminApp();
const db = getFirestore();

const BATCH = 200;
const apply = process.argv.includes('--apply');

async function main() {
  const allTags = await getAllTags();
  const tagMap = buildTagMap(allTags);

  const snap = await db.collection('cards').get();
  console.log(`Cards: ${snap.size} (${apply ? 'APPLY' : 'dry-run'})`);

  let logged = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const slice = snap.docs.slice(i, i + BATCH);
    const writeBatch = db.batch();
    for (const doc of slice) {
      const data = doc.data() as Card;
      const when = data.when ?? [];
      const j = computeJournalWhenSortKeys(when, tagMap);
      if (!apply) {
        if (logged < 5) {
          console.log(`  ${doc.id}: when=${when.length} tags -> asc=${j.journalWhenSortAsc} desc=${j.journalWhenSortDesc}`);
          logged++;
        }
        continue;
      }
      writeBatch.update(doc.ref, {
        journalWhenSortAsc: j.journalWhenSortAsc,
        journalWhenSortDesc: j.journalWhenSortDesc,
        updatedAt: Date.now(),
      });
    }
    if (apply) await writeBatch.commit();
  }

  console.log(`Done. ${apply ? 'Updated' : 'Sampled'} ${snap.size} cards.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
