/**
 * Legacy entrypoint for scheduled tasks / old paths.
 * Prefer: `npm run backup:database` → `firebase/backup-firestore.ts`
 *
 * Loads `.env` from cwd before pulling in Firebase Admin (import order).
 */
import { config } from 'dotenv';

config();

async function main() {
  const { runFullBackup } = await import('./firebase/full-database-backup');
  await runFullBackup();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
