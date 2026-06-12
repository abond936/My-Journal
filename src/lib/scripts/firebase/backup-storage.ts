/**
 * CLI entry for `npm run backup:storage`.
 * Requires `tsx -r dotenv/config` so Firebase Admin sees `.env` before loading.
 */
import { parseStorageBackupArgs, runStorageBackup } from './full-storage-backup';

const options = parseStorageBackupArgs(process.argv.slice(2));

runStorageBackup(options).catch((error) => {
  console.error(error);
  process.exit(1);
});
