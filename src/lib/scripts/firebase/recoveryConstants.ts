import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export const PRODUCTION_PROJECT_ID = 'my-journal-936';
export const BACKUPS_SUBDIR = 'Firebase Backups';
export const KEEP_RUNS = 3;

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

export function requestOnlineOnlyBackupRun(
  runDir: string,
  log: (message: string) => void
): void {
  if (process.platform !== 'win32') {
    log('Skipped online-only request: OneDrive Files On-Demand automation is Windows-only.');
    return;
  }

  const result = spawnSync(
    'attrib.exe',
    ['+U', '-P', path.join(runDir, '*'), '/S', '/D'],
    { encoding: 'utf8', windowsHide: true }
  );

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit ${result.status}`;
    log(`Warning: backup completed, but OneDrive online-only request failed: ${detail}`);
    return;
  }

  log(`Requested OneDrive Free up space for completed backup: ${path.basename(runDir)}`);
}
