import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { LEGACY_IMPORT_BATCH_ID } from '@/lib/utils/mediaOrganizeUtils';
import type { Media } from '@/lib/types/photo';

type BackfillReport = {
  totalMediaDocs: number;
  missingImportBatchId: number;
  updatedMediaDocs: number;
  dryRun: boolean;
  processingTimeMs: number;
};

function parseArgs(argv: string[]): { apply: boolean } {
  return { apply: argv.includes('--apply') };
}

export async function backfillLegacyImportBatchId(dryRun: boolean): Promise<BackfillReport> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection('media').get();
  const startedAt = Date.now();

  const report: BackfillReport = {
    totalMediaDocs: snap.size,
    missingImportBatchId: 0,
    updatedMediaDocs: 0,
    dryRun,
    processingTimeMs: 0,
  };

  console.log(`Scanning ${report.totalMediaDocs} media documents…`);
  if (dryRun) {
    console.log('DRY RUN — no writes. Pass --apply to update documents.');
  }

  let batch = firestore.batch();
  let batchOps = 0;

  const flushBatch = async () => {
    if (batchOps === 0) return;
    await batch.commit();
    batch = firestore.batch();
    batchOps = 0;
  };

  for (const doc of snap.docs) {
    const data = doc.data() as Media;
    const existing = data.importBatchId?.trim();
    if (existing) continue;

    report.missingImportBatchId += 1;
    if (!dryRun) {
      batch.update(doc.ref, { importBatchId: LEGACY_IMPORT_BATCH_ID });
      batchOps += 1;
      if (batchOps >= 400) {
        await flushBatch();
      }
    }
    report.updatedMediaDocs += 1;
  }

  if (!dryRun) {
    await flushBatch();
  }

  report.processingTimeMs = Date.now() - startedAt;
  return report;
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const report = await backfillLegacyImportBatchId(!apply);

  console.log('\nLegacy import batch backfill report');
  console.log(`  Total media:              ${report.totalMediaDocs}`);
  console.log(`  Missing importBatchId:    ${report.missingImportBatchId}`);
  console.log(`  ${report.dryRun ? 'Would update' : 'Updated'}:              ${report.updatedMediaDocs}`);
  console.log(`  Batch id:                 ${LEGACY_IMPORT_BATCH_ID}`);
  console.log(`  Time:                     ${report.processingTimeMs}ms`);

  if (report.dryRun && report.missingImportBatchId > 0) {
    console.log('\nRe-run with --apply to write.');
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
