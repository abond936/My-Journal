/**
 * Paired Firestore + Storage restore for disposable recovery targets.
 *
 * CLI: `npm run restore:run -- --backup="<run-dir>"` (dry-run)
 *      `npm run restore:run -- --backup="<run-dir>" --apply --confirm-project=<id>`
 */

import { getAdminApp } from '../../config/firebase/admin';
import { PRODUCTION_PROJECT_ID } from './recoveryConstants';
import {
  printPostRestoreChecklist,
  readRunManifestSummary,
  resolvePairedBackupRunDir,
} from './recoveryRunPaths';
import { runFirestoreRestore } from './restore-firestore';
import { runStorageRestore } from './restore-storage';

export type RestoreRunArgs = {
  allowNonEmpty: boolean;
  apply: boolean;
  backupPath: string | null;
  confirmProject: string | null;
  concurrency: number;
};

export function parseRestoreRunArgs(argv: string[]): RestoreRunArgs {
  let allowNonEmpty = false;
  let apply = false;
  let backupPath: string | null = null;
  let confirmProject: string | null = null;
  let concurrency = 12;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--allow-non-empty') {
      allowNonEmpty = true;
      continue;
    }
    if (arg.startsWith('--backup=')) {
      backupPath = arg.slice('--backup='.length).trim() || null;
      continue;
    }
    if (arg.startsWith('--confirm-project=')) {
      confirmProject = arg.slice('--confirm-project='.length).trim() || null;
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      const value = Number(arg.slice('--concurrency='.length));
      if (Number.isFinite(value) && value > 0) {
        concurrency = Math.floor(value);
      }
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printRestoreRunUsageAndExit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { allowNonEmpty, apply, backupPath, confirmProject, concurrency };
}

function printRestoreRunUsageAndExit(code: number): never {
  const lines = [
    'Usage:',
    '  npm run restore:run -- --backup="<path-to-run-dir>"',
    '  npm run restore:run -- --backup="<path>" --apply --confirm-project=<targetProjectId>',
    '',
    'Flags:',
    '  --backup=<path>             Paired backup run (firestore.json + storage-manifest.json)',
    '  --apply                     Restore Firestore then Storage; otherwise dry-run only',
    '  --confirm-project=<id>      Required with --apply; must match Firebase Admin target project',
    '  --allow-non-empty           Allow Firestore writes when target already has data',
    '  --concurrency=<n>           Storage upload parallelism (default 12)',
    '  --help                      Show this help',
    '',
    'Safety:',
    `  - Writes are blocked for the production project (${PRODUCTION_PROJECT_ID}).`,
    '  - Dry-run is the default.',
    '  - Use DOTENV_CONFIG_PATH=.env.test (or another disposable env) before apply.',
  ];

  console.log(lines.join('\n'));
  process.exit(code);
}

function getTargetProjectId(): string {
  const app = getAdminApp();
  const projectId =
    app.options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || null;

  if (!projectId) {
    throw new Error('Could not determine target Firebase project id from Firebase Admin config.');
  }

  return String(projectId);
}

function buildChildArgv(args: RestoreRunArgs, runDir: string): string[] {
  const childArgv = [`--backup=${runDir}`];
  if (args.apply) {
    childArgv.push('--apply');
  }
  if (args.confirmProject) {
    childArgv.push(`--confirm-project=${args.confirmProject}`);
  }
  if (args.allowNonEmpty) {
    childArgv.push('--allow-non-empty');
  }
  if (args.concurrency !== 12) {
    childArgv.push(`--concurrency=${args.concurrency}`);
  }
  return childArgv;
}

export async function runPairedRestore(argv: string[]): Promise<void> {
  const args = parseRestoreRunArgs(argv);
  if (!args.backupPath) {
    printRestoreRunUsageAndExit(1);
  }

  const runDir = resolvePairedBackupRunDir(args.backupPath);
  const manifestSummary = readRunManifestSummary(runDir);
  const targetProjectId = getTargetProjectId();
  const childArgv = buildChildArgv(args, runDir);

  console.log('=== Paired restore run ===');
  console.log(`Backup run: ${runDir}`);
  console.log(`Target project: ${targetProjectId}`);
  if (manifestSummary.hasRunManifest) {
    console.log(`Run manifest: present${manifestSummary.complete === false ? ' (storage backup was dry-run)' : ''}`);
    if (manifestSummary.sourceProjectId) {
      console.log(`Source project: ${manifestSummary.sourceProjectId}`);
    }
  } else {
    console.log('Run manifest: missing (legacy or manual paired folder)');
  }

  if (targetProjectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Restore helper is blocked for the production project (${PRODUCTION_PROJECT_ID}). Use a disposable recovery target instead.`
    );
  }

  console.log('\n--- Step 1/2: Firestore ---');
  await runFirestoreRestore(childArgv);

  console.log('\n--- Step 2/2: Storage ---');
  await runStorageRestore(childArgv);

  if (args.apply) {
    console.log('\nPaired restore apply completed.');
  } else {
    console.log('\nPaired restore dry-run completed. No writes were made.');
    console.log('To apply: add --apply --confirm-project=<targetProjectId>');
  }

  printPostRestoreChecklist(runDir);
}
