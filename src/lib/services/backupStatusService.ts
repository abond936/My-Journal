import fs from 'fs';
import path from 'path';
import type { RunManifest } from '@/lib/scripts/firebase/backup-run';
import { resolveBackupRootPath } from '@/lib/scripts/firebase/recoveryConstants';

export type BackupRunSummary = {
  runId: string;
  timestamp: string;
  runDir: string;
  complete: boolean;
  firestoreDocCount?: number;
  storageObjectCount?: number;
};

export type LatestCompleteBackupPointer = {
  runId: string;
  timestamp: string;
  runDir: string;
};

export type BackupOperationsStatus = {
  readable: boolean;
  backupRoot: string | null;
  triggerAllowed: boolean;
  triggerBlockedReason: string | null;
  latestComplete: LatestCompleteBackupPointer | null;
  recentRuns: BackupRunSummary[];
};

function isHostedRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function summarizeRunDir(runDir: string, runId: string): BackupRunSummary | null {
  const manifest = readJsonFile<RunManifest>(path.join(runDir, 'run-manifest.json'));
  if (manifest) {
    return {
      runId: manifest.runId,
      timestamp: manifest.timestamp,
      runDir: manifest.runDir,
      complete: manifest.complete,
      firestoreDocCount: manifest.firestore.docCount,
      storageObjectCount: manifest.storage.objectCount,
    };
  }

  const firestoreJson = path.join(runDir, 'firestore.json');
  if (!fs.existsSync(firestoreJson)) {
    return null;
  }

  const stat = fs.statSync(runDir);
  return {
    runId,
    timestamp: stat.mtime.toISOString(),
    runDir,
    complete: fs.existsSync(path.join(runDir, 'storage-manifest.json')),
  };
}

export function getBackupTriggerPolicy(): { allowed: boolean; reason: string | null } {
  if (isHostedRuntime()) {
    return {
      allowed: false,
      reason:
        'Backup runs from the operator machine or a trusted local server — not from the hosted web runtime.',
    };
  }
  if (!process.env.ONEDRIVE_PATH?.trim()) {
    return {
      allowed: false,
      reason: 'Set ONEDRIVE_PATH in the environment to enable backup from Settings.',
    };
  }
  return { allowed: true, reason: null };
}

export function getBackupOperationsStatus(): BackupOperationsStatus {
  const trigger = getBackupTriggerPolicy();

  try {
    const backupRoot = resolveBackupRootPath();
    const latestComplete = readJsonFile<LatestCompleteBackupPointer>(
      path.join(backupRoot, 'latest-complete-run.json')
    );

    const recentRuns: BackupRunSummary[] = [];
    if (fs.existsSync(backupRoot)) {
      const runDirs = fs
        .readdirSync(backupRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
        .map((entry) => entry.name)
        .sort()
        .reverse()
        .slice(0, 5);

      for (const runId of runDirs) {
        const summary = summarizeRunDir(path.join(backupRoot, runId), runId);
        if (summary) {
          recentRuns.push(summary);
        }
      }
    }

    return {
      readable: true,
      backupRoot,
      triggerAllowed: trigger.allowed,
      triggerBlockedReason: trigger.reason,
      latestComplete,
      recentRuns,
    };
  } catch (error) {
    return {
      readable: false,
      backupRoot: null,
      triggerAllowed: false,
      triggerBlockedReason:
        error instanceof Error ? error.message : 'Backup status is unavailable in this environment.',
      latestComplete: null,
      recentRuns: [],
    };
  }
}

export function formatBackupTimestamp(iso: string | undefined): string {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
