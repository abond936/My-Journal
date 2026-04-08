// Back-fill script: populates filterTags and dimensional arrays on existing card documents
// Usage: ts-node src/lib/scripts/cards/backfill-derived-tags.ts [--apply]
//  --apply  Actually writes changes. Without it the script runs in dry-run mode (reports only).
//
// This script forces updates on ALL cards to ensure data consistency after tag system changes.

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore, FieldValue, BulkWriter } from 'firebase-admin/firestore';
import { calculateDerivedTagData } from '@/lib/firebase/tagService';
import { Card } from '@/lib/types/card';

// --- Init Firebase Admin ---
getAdminApp();
const db = getFirestore();

const BATCH_SIZE = 100;
const apply = process.argv.includes('--apply');

async function processBatch(cards: FirebaseFirestore.QueryDocumentSnapshot<Card>[], bulk: BulkWriter | null, processedCount: number) {
  for (const docSnap of cards) {
    const data = docSnap.data();

    // Process ALL cards to ensure data consistency
    // (Removed skip logic to force updates after tag system changes)

    const directTags: string[] = data.tags ?? [];
    const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags);

    // Log what we're updating (for first few cards in dry-run mode)
    if (!apply && processedCount < 3) {
      console.log(`\n📄 Card ${docSnap.id}:`);
      console.log(`   Direct tags: [${directTags.join(', ')}]`);
      console.log(`   FilterTags: ${Object.keys(filterTags).length} inherited tags`);
      console.log(`   Who: [${dimensionalTags.who.join(', ')}]`);
      console.log(`   What: [${dimensionalTags.what.join(', ')}]`);
      console.log(`   When: [${dimensionalTags.when.join(', ')}]`);
      console.log(`   Where: [${dimensionalTags.where.join(', ')}]`);
    }

    const updatePayload = {
      filterTags,
      who:        dimensionalTags.who,
      what:       dimensionalTags.what,
      when:       dimensionalTags.when,
      where:      dimensionalTags.where,
      updatedAt:  Date.now(),
    } as Partial<Card>;

    if (apply && bulk) {
      bulk.update(docSnap.ref, updatePayload);
    }
  }
}

async function backfill() {
  console.log(`\n🔄 Starting FORCED card back-fill (${apply ? 'APPLY' : 'dry-run'})`);
  console.log(`⚠️  This will update ALL cards to ensure data consistency after tag system changes`);

  const allCardsSnap = await db.collection('cards').get();
  const docs = allCardsSnap.docs as FirebaseFirestore.QueryDocumentSnapshot<Card>[];
  console.log(`Found ${docs.length} card documents`);

  let processed = 0;
  let updated = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const slice = docs.slice(i, i + BATCH_SIZE);
    const bulk = apply ? db.bulkWriter() : null;

    await processBatch(slice, bulk, processed);

    if (bulk) await bulk.close();

    // Count ALL cards as updated (since we're forcing updates)
    updated += slice.length;

    processed += slice.length;
    console.log(`Processed ${processed}/${docs.length}`);
  }

  console.log(`\n${apply ? '✅ Updated' : 'ℹ️ Would update'} ALL ${updated} cards`);
  console.log('Done.');
}

backfill().catch(err => {
  console.error('❌ Back-fill failed', err);
  process.exit(1);
}); 