/**
 * Paired Firestore + Storage backup into one run directory.
 *
 * CLI: `npm run backup:run` (storage dry-run) or `npm run backup:run -- --apply`.
 */

import fs from 'fs';
import path from 'path';
import { runFullBackup } from './full-database-backup';
import { parseStorageBackupArgs, runStorageBackup } from './full-storage-backup';
import {
  pruneOldBackupRuns,
  requestOnlineOnlyBackupRun,
  resolveBackupRootPath,
  safeBackupTimestamp,
} from './recoveryConstants';

export type RunManifest = {
  version: 1;
  timestamp: string;
  runId: string;
  runDir: string;
  sourceProjectId: string | null;
  firestore: {
    docCount: number;
    jsonBytes: number;
    collections: Record<string, number>;
  };
  storage: {
    mode: 'apply' | 'dry-run';
    bucket: string;
    objectCount: number;
    totalBytes: number;
    downloaded: number;
    copied: number;
  };
  complete: boolean;
};

export function writeRunManifest(runDir: string, manifest: RunManifest): void {
  fs.writeFileSync(path.join(runDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

export function writeLatestCompleteRunPointer(backupRoot: string, manifest: RunManifest): void {
  fs.writeFileSync(
    path.join(backupRoot, 'latest-complete-run.json'),
    JSON.stringify(
      {
        runId: manifest.runId,
        runDir: manifest.runDir,
        timestamp: manifest.timestamp,
      },
      null,
      2
    ),
    'utf8'
  );
}

export async function runPairedBackup(argv: string[]): Promise<RunManifest> {
  const storageOptions = parseStorageBackupArgs(argv);
  const backupRoot = resolveBackupRootPath();
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const resumeArg = argv.find((arg) => arg.startsWith('--resume-run='));
  const requestedRunId = resumeArg?.slice('--resume-run='.length).trim();
  if (requestedRunId && !/^run-[A-Za-z0-9-]+$/.test(requestedRunId)) {
    throw new Error('Invalid --resume-run value. Expected an existing run-* directory name.');
  }
  const runId = requestedRunId || `run-${safeBackupTimestamp()}`;
  const runDir = path.join(backupRoot, runId);
  if (requestedRunId && !fs.existsSync(runDir)) {
    throw new Error(`Cannot resume missing backup run: ${requestedRunId}`);
  }
  const existingManifestPath = path.join(runDir, 'run-manifest.json');
  if (requestedRunId && fs.existsSync(existingManifestPath)) {
    const existing = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8')) as { complete?: boolean };
    if (existing.complete) {
      throw new Error(`Backup run is already complete: ${requestedRunId}`);
    }
  }
  fs.mkdirSync(runDir, { recursive: true });

  console.log('=== Paired backup run ===');
  console.log(`Run directory: ${runDir}`);

  const databaseResult = await runFullBackup({
    runDir,
    runId,
    skipPrune: true,
    bundledWithStorage: true,
  });

  const storageResult = await runStorageBackup({
    ...storageOptions,
    runDir,
    runId,
    skipPrune: true,
  });

  const manifest: RunManifest = {
    version: 1,
    timestamp: new Date().toISOString(),
    runId,
    runDir,
    sourceProjectId: databaseResult.sourceProjectId,
    firestore: {
      docCount: databaseResult.firestoreDocCount,
      jsonBytes: databaseResult.firestoreJsonBytes,
      collections: databaseResult.firestoreCollections,
    },
    storage: {
      mode: storageResult.mode,
      bucket: storageResult.bucket,
      objectCount: storageResult.objectCount,
      totalBytes: storageResult.totalBytes,
      downloaded: storageResult.downloaded,
      copied: storageResult.copied,
    },
    complete: storageOptions.apply,
  };

  writeRunManifest(runDir, manifest);

  if (storageOptions.apply) {
    writeLatestCompleteRunPointer(backupRoot, manifest);
    pruneOldBackupRuns(backupRoot, (message) => console.log(message));
    requestOnlineOnlyBackupRun(runDir, (message) => console.log(message));
  }

  console.log('Wrote run-manifest.json');
  if (storageOptions.apply) {
    console.log('Updated latest-complete-run.json');
  } else {
    console.log('Storage dry-run only. Re-run with --apply to download bytes and mark the run complete.');
  }
  console.log('=== Paired backup finished ===');

  return manifest;
}
