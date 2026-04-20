/**
 * Re-upload a missing Storage object for a media doc (local sourcePath only).
 *
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/repair-missing-storage-media.ts --mediaId=<id>
 *   npx tsx -r dotenv/config src/lib/scripts/firebase/repair-missing-storage-media.ts --mediaId=<id> --apply
 */
import { repairMissingStorageFromLocalSource } from '@/lib/services/images/imageImportService';

function getMediaIdFromArgv(): string | undefined {
  for (let i = 0; i < process.argv.length; i++) {
    const a = process.argv[i]!;
    if (a.startsWith('--mediaId=')) return a.slice('--mediaId='.length).trim();
    if (a === '--mediaId' && process.argv[i + 1]) return process.argv[i + 1]!.trim();
  }
  return undefined;
}

async function main() {
  const mediaId = getMediaIdFromArgv();
  const apply = process.argv.includes('--apply');

  if (!mediaId) {
    console.error('Usage: repair-missing-storage-media.ts --mediaId=<firestoreMediaDocId> [--apply]');
    console.error('  Omit --apply for a dry run (checks only, no Storage/Firestore writes).');
    process.exit(1);
  }

  const result = await repairMissingStorageFromLocalSource(mediaId, { dryRun: !apply });
  if (result.ok) {
    console.log(result.dryRun ? '[dry-run]' : '[apply]', result.message);
    process.exit(0);
  }
  console.error(result.message);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
