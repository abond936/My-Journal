/**
 * Firebase Storage byte backup: originals + renditions under the default Admin bucket.
 *
 * Writes to OneDrive `Firebase Backups/run-<timestamp>/storage/` with `storage-manifest.json`.
 * Incremental: copies unchanged blobs from the newest prior run with matching md5 instead of
 * re-downloading from Firebase.
 *
 * CLI: `npm run backup:storage` (dry-run) → `backup-storage.ts` (dotenv preload).
 */

import fs from 'fs';
import path from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  pruneOldBackupRuns,
  resolveBackupRootPath,
  safeBackupTimestamp,
} from '@/lib/scripts/firebase/recoveryConstants';

export type StorageBackupAction = 'dry_run' | 'downloaded' | 'copied' | 'skipped_missing_prior';

export type StorageManifestEntry = {
  storagePath: string;
  size: number;
  md5: string | null;
  contentType: string | null;
  action: StorageBackupAction;
  sourceRunId?: string;
};

export type StorageBackupOptions = {
  apply: boolean;
  limit: number | null;
  progressEvery: number;
  runDir?: string;
  runId?: string;
  skipPrune?: boolean;
};

export type StorageBackupResult = {
  runId: string;
  runDir: string;
  bucket: string;
  objectCount: number;
  totalBytes: number;
  downloaded: number;
  copied: number;
  mode: 'apply' | 'dry-run';
};

export function parseStorageBackupArgs(argv: string[]): StorageBackupOptions {
  const apply = argv.includes('--apply');
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const progressEveryArg = argv.find((arg) => arg.startsWith('--progress-every='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const progressEvery = progressEveryArg ? Number(progressEveryArg.split('=')[1]) : 25;
  return {
    apply,
    limit: Number.isFinite(limit) && limit !== null && limit > 0 ? limit : null,
    progressEvery: Number.isFinite(progressEvery) && progressEvery > 0 ? progressEvery : 25,
  };
}

function pruneOldRuns(backupRoot: string, log: (message: string) => void): void {
  pruneOldBackupRuns(backupRoot, log);
}

export function localStorageObjectPath(runDir: string, storagePath: string): string {
  return path.join(runDir, 'storage', ...storagePath.split('/'));
}

type PriorObjectIndex = Map<
  string,
  {
    md5: string | null;
    size: number;
    runId: string;
    localPath: string;
  }
>;

export function loadPriorObjectIndex(backupRoot: string, excludeRunId: string): PriorObjectIndex {
  const index: PriorObjectIndex = new Map();
  if (!fs.existsSync(backupRoot)) {
    return index;
  }

  const runDirs = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => entry.name)
    .filter((name) => name !== excludeRunId)
    .sort()
    .reverse();

  for (const runId of runDirs) {
    const manifestPath = path.join(backupRoot, runId, 'storage-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        objects?: StorageManifestEntry[];
      };
      for (const entry of parsed.objects ?? []) {
        if (!entry.storagePath || index.has(entry.storagePath)) {
          continue;
        }
        index.set(entry.storagePath, {
          md5: entry.md5,
          size: entry.size,
          runId,
          localPath: localStorageObjectPath(path.join(backupRoot, runId), entry.storagePath),
        });
      }
    } catch {
      // Ignore unreadable manifests from older/partial runs.
    }
  }

  return index;
}

function verifyManifestEntries(
  manifest: StorageManifestEntry[],
  runDir: string
): { verified: number; failed: string[] } {
  const failed: string[] = [];
  let verified = 0;

  for (const entry of manifest) {
    if (entry.action === 'dry_run') {
      continue;
    }
    const localPath = localStorageObjectPath(runDir, entry.storagePath);
    if (!fs.existsSync(localPath)) {
      failed.push(`${entry.storagePath}: missing local file`);
      continue;
    }
    const stat = fs.statSync(localPath);
    if (stat.size !== entry.size) {
      failed.push(`${entry.storagePath}: size mismatch (expected ${entry.size}, got ${stat.size})`);
      continue;
    }
    verified += 1;
  }

  return { verified, failed };
}

export async function runStorageBackup(options: StorageBackupOptions): Promise<StorageBackupResult> {
  const lines: string[] = [];
  const log = (message: string) => {
    lines.push(message);
    console.log(message);
  };

  const backupRoot = resolveBackupRootPath();
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const runId = options.runId ?? `run-${safeBackupTimestamp()}`;
  const runDir = options.runDir ?? path.join(backupRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });

  log(`=== Firebase Storage byte backup ===`);
  log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  log(`Run directory: ${runDir}`);

  const adminApp = getAdminApp();
  const bucket = adminApp.storage().bucket();
  log(`Bucket: ${bucket.name}`);

  const priorIndex = loadPriorObjectIndex(backupRoot, runId);
  log(`Prior indexed objects from earlier runs: ${priorIndex.size}`);

  const [files] = await bucket.getFiles();
  const scopedFiles = options.limit != null ? files.slice(0, options.limit) : files;
  log(`Bucket objects: ${files.length}${options.limit != null ? ` (processing first ${scopedFiles.length})` : ''}`);

  const manifest: StorageManifestEntry[] = [];
  let downloaded = 0;
  let copied = 0;
  let dryRunWouldFetch = 0;
  let dryRunWouldCopy = 0;

  for (let index = 0; index < scopedFiles.length; index += 1) {
    const file = scopedFiles[index];
    const storagePath = file.name;
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    const md5 = typeof metadata.md5Hash === 'string' ? metadata.md5Hash : null;
    const contentType = typeof metadata.contentType === 'string' ? metadata.contentType : null;
    const localPath = localStorageObjectPath(runDir, storagePath);
    const prior = priorIndex.get(storagePath);
    const canCopyPrior =
      prior &&
      prior.md5 === md5 &&
      prior.size === size &&
      fs.existsSync(prior.localPath);

    if (options.apply) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      if (canCopyPrior) {
        fs.copyFileSync(prior.localPath, localPath);
        copied += 1;
        manifest.push({
          storagePath,
          size,
          md5,
          contentType,
          action: 'copied',
          sourceRunId: prior.runId,
        });
      } else {
        await file.download({ destination: localPath });
        downloaded += 1;
        manifest.push({
          storagePath,
          size,
          md5,
          contentType,
          action: 'downloaded',
        });
      }
    } else if (canCopyPrior) {
      dryRunWouldCopy += 1;
      manifest.push({
        storagePath,
        size,
        md5,
        contentType,
        action: 'dry_run',
        sourceRunId: prior.runId,
      });
    } else {
      dryRunWouldFetch += 1;
      manifest.push({
        storagePath,
        size,
        md5,
        contentType,
        action: 'dry_run',
      });
    }

    if ((index + 1) % options.progressEvery === 0 || index + 1 === scopedFiles.length) {
      log(
        `  progress ${index + 1}/${scopedFiles.length} downloaded=${downloaded} copied=${copied} dry_run_fetch=${dryRunWouldFetch} dry_run_copy=${dryRunWouldCopy}`
      );
    }
  }

  const totalBytes = manifest.reduce((sum, entry) => sum + entry.size, 0);
  const metadata = {
    timestamp: new Date().toISOString(),
    runId,
    bucket: bucket.name,
    mode: options.apply ? 'apply' : 'dry-run',
    objectCount: manifest.length,
    totalBytes,
    downloaded,
    copied,
    dryRunWouldFetch,
    dryRunWouldCopy,
    limit: options.limit,
  };

  fs.writeFileSync(path.join(runDir, 'storage-manifest.json'), JSON.stringify({ ...metadata, objects: manifest }, null, 2), 'utf8');
  log(`Wrote storage-manifest.json (${manifest.length} object(s), ${totalBytes} bytes)`);

  if (options.apply) {
    const verification = verifyManifestEntries(manifest, runDir);
    log(`Verified local objects: ${verification.verified}/${manifest.length}`);
    if (verification.failed.length > 0) {
      for (const failure of verification.failed.slice(0, 20)) {
        log(`VERIFY FAIL: ${failure}`);
      }
      if (verification.failed.length > 20) {
        log(`VERIFY FAIL: ...and ${verification.failed.length - 20} more`);
      }
      throw new Error(`Storage backup verification failed for ${verification.failed.length} object(s).`);
    }
  }

  fs.writeFileSync(path.join(runDir, 'storage-summary.txt'), lines.join('\n') + '\n', 'utf8');

  if (options.apply && !options.skipPrune) {
    pruneOldRuns(backupRoot, log);
  }

  log('=== Storage backup finished ===');

  return {
    runId,
    runDir,
    bucket: bucket.name,
    objectCount: manifest.length,
    totalBytes,
    downloaded,
    copied,
    mode: options.apply ? 'apply' : 'dry-run',
  };
}
