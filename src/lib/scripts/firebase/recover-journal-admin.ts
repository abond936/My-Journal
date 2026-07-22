/**
 * Guarded administrator password recovery for total application lockout.
 * Dry-run is the default. The replacement password is read only from
 * JOURNAL_RECOVERY_PASSWORD so it does not appear in shell history.
 */

import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  listJournalUsers,
  normalizeJournalUsername,
  updateJournalUser,
} from '@/lib/auth/journalUsersFirestore';

export type RecoverJournalAdminArgs = {
  apply: boolean;
  confirmProject: string | null;
  username: string | null;
};

export function parseRecoverJournalAdminArgs(argv: string[]): RecoverJournalAdminArgs {
  const parsed: RecoverJournalAdminArgs = {
    apply: false,
    confirmProject: null,
    username: null,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      parsed.apply = true;
    } else if (arg.startsWith('--confirm-project=')) {
      parsed.confirmProject = arg.slice('--confirm-project='.length).trim() || null;
    } else if (arg.startsWith('--username=')) {
      parsed.username = normalizeJournalUsername(arg.slice('--username='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

export async function runRecoverJournalAdmin(argv: string[]): Promise<void> {
  const args = parseRecoverJournalAdminArgs(argv);
  if (!args.username) {
    throw new Error('Provide the exact administrator username with --username=<username>.');
  }

  const projectId = String(
    getAdminApp().options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || ''
  );
  if (!projectId) {
    throw new Error('Could not determine the Firebase project id.');
  }

  const users = await listJournalUsers();
  const account = users.find((user) => user.username === args.username);
  if (!account || account.role !== 'admin') {
    throw new Error(`No administrator account matches ${args.username}.`);
  }

  console.log(`Target project: ${projectId}`);
  console.log(`Administrator: ${account.username} (${account.docId})`);
  console.log(`Currently disabled: ${account.disabled ? 'yes' : 'no'}`);

  if (!args.apply) {
    console.log('Dry run only. No password was changed.');
    return;
  }
  if (args.confirmProject !== projectId) {
    throw new Error('Apply requires --confirm-project=<exact target project id>.');
  }

  const password = process.env.JOURNAL_RECOVERY_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set JOURNAL_RECOVERY_PASSWORD to a replacement password of at least 12 characters.');
  }

  await updateJournalUser(account.docId, { password, disabled: false });
  console.log('Administrator password reset and account enabled. Sign in and rotate the recovery password immediately.');
}

if (require.main === module) {
  runRecoverJournalAdmin(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
