/**
 * Firebase Storage restore helper for isolated recovery drills.
 *
 * Default behavior is dry-run only. To write, pass `--apply` and confirm the
 * target project with `--confirm-project=<projectId>`.
 */

import fs from 'fs';
import path from 'path';
import type { Bucket } from '@google-cloud/storage';
import { getAdminApp } from '../../config/firebase/admin';
import { PRODUCTION_PROJECT_ID } from './recoveryConstants';
import { localStorageObjectPath } from './full-storage-backup';

const DEFAULT_CONCURRENCY = 12;

export type StorageManifestObject = {
  storagePath: string;
  size: number;
  contentType: string | null;
};

type ParsedArgs = {
  apply: boolean;
  backupPath: string | null;
  confirmProject: string | null;
  concurrency: number;
};

export function parseRestoreStorageArgs(argv: string[]): ParsedArgs {
  let apply = false;
  let backupPath: string | null = null;
  let confirmProject: string | null = null;
  let concurrency = DEFAULT_CONCURRENCY;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
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
      printUsageAndExit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { apply, backupPath, confirmProject, concurrency };
}

function printUsageAndExit(code: number): never {
  const lines = [
    'Usage:',
    '  npm run restore:storage -- --backup="<path-to-run-dir>"',
    '  npm run restore:storage -- --backup="<path>" --apply --confirm-project=<targetProjectId>',
    '',
    'Flags:',
    '  --backup=<path>             Path to a backup run directory with storage-manifest.json',
    '  --apply                     Upload objects to Storage; otherwise dry-run only',
    '  --confirm-project=<id>      Required with --apply; must match the Firebase Admin target project id',
    '  --concurrency=<n>           Parallel uploads (default 12)',
    '  --help                      Show this help',
    '',
    'Safety:',
    `  - Writes are blocked for the production project (${PRODUCTION_PROJECT_ID}).`,
    '  - Dry-run is the default.',
  ];

  console.log(lines.join('\n'));
  process.exit(code);
}

export function resolveStorageBackupRunDir(inputPath: string): string {
  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup path does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  const runDir = stat.isDirectory() ? resolved : path.dirname(resolved);
  const manifestPath = path.join(runDir, 'storage-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup run does not contain storage-manifest.json: ${runDir}`);
  }

  return runDir;
}

export function loadStorageManifestObjects(runDir: string): StorageManifestObject[] {
  const manifestPath = path.join(runDir, 'storage-manifest.json');
  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    objects?: StorageManifestObject[];
  };

  return (parsed.objects ?? []).map((entry) => ({
    storagePath: entry.storagePath,
    size: entry.size,
    contentType: entry.contentType ?? null,
  }));
}

export function verifyLocalStorageObject(runDir: string, entry: StorageManifestObject): string | null {
  const localPath = localStorageObjectPath(runDir, entry.storagePath);
  if (!fs.existsSync(localPath)) {
    return `${entry.storagePath}: missing local file`;
  }
  const stat = fs.statSync(localPath);
  if (stat.size !== entry.size) {
    return `${entry.storagePath}: size mismatch (expected ${entry.size}, got ${stat.size})`;
  }
  return null;
}

export async function uploadStorageObject(
  bucket: Bucket,
  runDir: string,
  entry: StorageManifestObject
): Promise<void> {
  const localPath = localStorageObjectPath(runDir, entry.storagePath);
  const failure = verifyLocalStorageObject(runDir, entry);
  if (failure) {
    throw new Error(failure);
  }

  const buffer = fs.readFileSync(localPath);
  await bucket.file(entry.storagePath).save(buffer, {
    metadata: {
      contentType: entry.contentType ?? 'application/octet-stream',
    },
    resumable: buffer.length > 5 * 1024 * 1024,
  });
}

async function getTargetProjectId(): Promise<string> {
  const app = getAdminApp();
  const projectId =
    app.options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || null;

  if (!projectId) {
    throw new Error('Could not determine target Firebase project id from Firebase Admin config.');
  }

  return String(projectId);
}

export async function runStorageRestore(argv: string[]): Promise<void> {
  const args = parseRestoreStorageArgs(argv);
  if (!args.backupPath) {
    printUsageAndExit(1);
  }

  const runDir = resolveStorageBackupRunDir(args.backupPath);
  const objects = loadStorageManifestObjects(runDir);
  const targetProjectId = await getTargetProjectId();
  const verificationFailures = objects
    .map((entry) => verifyLocalStorageObject(runDir, entry))
    .filter((failure): failure is string => failure != null);

  console.log('=== Storage restore helper ===');
  console.log(`Backup run: ${runDir}`);
  console.log(`Target project: ${targetProjectId}`);
  console.log(`Manifest objects: ${objects.length}`);

  if (verificationFailures.length > 0) {
    for (const failure of verificationFailures.slice(0, 20)) {
      console.log(`LOCAL VERIFY FAIL: ${failure}`);
    }
    if (verificationFailures.length > 20) {
      console.log(`LOCAL VERIFY FAIL: ...and ${verificationFailures.length - 20} more`);
    }
    throw new Error(`Local storage backup verification failed for ${verificationFailures.length} object(s).`);
  }

  if (targetProjectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Restore helper is blocked for the production project (${PRODUCTION_PROJECT_ID}). Use a disposable recovery target instead.`
    );
  }

  if (!args.apply) {
    console.log('\nDry run only. No Storage uploads were made.');
    console.log('To apply: add --apply --confirm-project=<targetProjectId>');
    return;
  }

  if (!args.confirmProject) {
    throw new Error('Missing --confirm-project=<targetProjectId> for apply mode.');
  }
  if (args.confirmProject !== targetProjectId) {
    throw new Error(
      `Confirmed project "${args.confirmProject}" does not match target Firebase project "${targetProjectId}".`
    );
  }

  const bucket = getAdminApp().storage().bucket();
  console.log(`Bucket: ${bucket.name}`);
  console.log(`Uploading ${objects.length} object(s)...`);

  let done = 0;
  let failed = 0;
  const queue = [...objects];

  async function worker() {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) return;
      try {
        await uploadStorageObject(bucket, runDir, entry);
        done += 1;
        if (done % 50 === 0 || done === objects.length) {
          console.log(`Progress ${done}/${objects.length}`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAILED ${entry.storagePath}: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  console.log(`Upload finished. uploaded=${done - failed} failed=${failed} total=${objects.length}`);
  if (failed > 0) {
    throw new Error(`Storage restore failed for ${failed} object(s).`);
  }
}
