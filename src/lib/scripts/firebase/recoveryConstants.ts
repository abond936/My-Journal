import fs from 'fs';
import path from 'path';

export const PRODUCTION_PROJECT_ID = 'my-journal-936';
export const BACKUPS_SUBDIR = 'Firebase Backups';
export const KEEP_RUNS = 5;

export function safeBackupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function resolveBackupRootPath(): string {
  const onedrive = process.env.ONEDRIVE_PATH?.trim();
  if (!onedrive) {
    throw new Error('ONEDRIVE_PATH is not set; cannot write backup under OneDrive.');
  }
  return path.join(onedrive, BACKUPS_SUBDIR);
}

export function pruneOldBackupRuns(backupRoot: string, log: (message: string) => void): void {
  if (!fs.existsSync(backupRoot)) {
    return;
  }

  const entries = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (entries.length <= KEEP_RUNS) {
    return;
  }

  for (const name of entries.slice(KEEP_RUNS)) {
    const runPath = path.join(backupRoot, name);
    fs.rmSync(runPath, { recursive: true, force: true });
    log(`Removed old backup run: ${name}`);
  }
}
