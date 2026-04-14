/**
 * CLI entry for `npm run backup:database`.
 * Requires `tsx -r dotenv/config` so Firebase Admin sees `.env` before loading.
 */
import { runFullBackup } from './full-database-backup';

runFullBackup().catch((err) => {
  console.error(err);
  process.exit(1);
});
