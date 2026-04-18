/**
 * One-time (idempotent) seed: if `journal_users` is empty, creates the admin
 * from ADMIN_EMAIL / ADMIN_PASSWORD (bcrypt). Run locally with Firebase env vars loaded.
 *
 * Usage: npm run seed:journal-users
 */
import { seedInitialAdminIfEmpty } from '../../auth/journalUsersFirestore';

async function main() {
  const result = await seedInitialAdminIfEmpty();
  if ('reason' in result) {
    console.log(`Skipped: ${result.reason}`);
    return;
  }
  console.log(`Created admin journal user: ${result.docId}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
