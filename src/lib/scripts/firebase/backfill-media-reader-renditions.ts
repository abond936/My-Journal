import { getAdminApp } from '@/lib/config/firebase/admin';
import { refreshMediaReaderRendition } from '@/lib/services/images/imageImportService';
import type { Media } from '@/lib/types/photo';

type BackfillOptions = {
  apply: boolean;
  force: boolean;
  limit: number | null;
  progressEvery: number;
};

function parseArgs(argv: string[]): BackfillOptions {
  const apply = argv.includes('--apply');
  const force = argv.includes('--force');
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const progressEveryArg = argv.find((arg) => arg.startsWith('--progress-every='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const progressEvery = progressEveryArg ? Number(progressEveryArg.split('=')[1]) : 50;
  return {
    apply,
    force,
    limit: Number.isFinite(limit) && limit !== null && limit > 0 ? limit : null,
    progressEvery: Number.isFinite(progressEvery) && progressEvery > 0 ? progressEvery : 50,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection('media').get();
  const startedAt = Date.now();

  let scanned = 0;
  let targeted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const total = options.limit != null ? Math.min(options.limit, snap.docs.length) : snap.docs.length;

  for (const doc of snap.docs) {
    if (options.limit != null && scanned >= options.limit) break;
    scanned += 1;

    const media = { ...(doc.data() as Media), docId: doc.id };
    const hasReaderRendition = Boolean(media.renditions?.reader?.storagePath);
    if (hasReaderRendition && !options.force) {
      skipped += 1;
      continue;
    }

    targeted += 1;
    const result = await refreshMediaReaderRendition(doc.id, { dryRun: !options.apply });
    if (!result.ok) {
      failed += 1;
      console.warn(`[backfill-media-reader-renditions] ${doc.id} failed: ${result.message}`);
      continue;
    }

    if (options.apply && result.updated) {
      updated += 1;
    }

    if (scanned % options.progressEvery === 0 || scanned === total) {
      const elapsedMs = Date.now() - startedAt;
      const avgMsPerScanned = scanned > 0 ? Math.round(elapsedMs / scanned) : 0;
      console.log(
        `[backfill-media-reader-renditions] progress mode=${options.apply ? 'apply' : 'dry-run'} scanned=${scanned}/${total} targeted=${targeted} updated=${updated} skipped=${skipped} failed=${failed} elapsed_s=${Math.round(elapsedMs / 1000)} avg_ms_per_item=${avgMsPerScanned}`
      );
    }
  }

  console.log(
    `[backfill-media-reader-renditions] mode=${options.apply ? 'apply' : 'dry-run'} scanned=${scanned} targeted=${targeted} updated=${updated} skipped=${skipped} failed=${failed}`
  );
}

main().catch((error) => {
  console.error('[backfill-media-reader-renditions] failed', error);
  process.exitCode = 1;
});
