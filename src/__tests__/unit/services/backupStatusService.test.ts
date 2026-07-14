import fs from 'fs';
import os from 'os';
import path from 'path';
import { getBackupOperationsStatus, getBackupTriggerPolicy } from '@/lib/services/backupStatusService';

describe('backupStatusService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('blocks backup trigger on hosted runtime', () => {
    process.env.VERCEL = '1';
    process.env.ONEDRIVE_PATH = 'C:\\OneDrive';
    expect(getBackupTriggerPolicy().allowed).toBe(false);
  });

  it('blocks backup trigger when ONEDRIVE_PATH is missing', () => {
    delete process.env.ONEDRIVE_PATH;
    expect(getBackupTriggerPolicy().allowed).toBe(false);
  });

  it('reads latest complete backup pointer from backup root', () => {
    const onedrive = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-status-test-'));
    process.env.ONEDRIVE_PATH = onedrive;
    const backupsDir = path.join(onedrive, 'Firebase Backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    fs.writeFileSync(
      path.join(backupsDir, 'latest-complete-run.json'),
      JSON.stringify({
        runId: 'run-test',
        timestamp: '2026-07-13T12:00:00.000Z',
        runDir: path.join(backupsDir, 'run-test'),
      }),
      'utf8'
    );

    const runDir = path.join(backupsDir, 'run-test');
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(
      path.join(runDir, 'run-manifest.json'),
      JSON.stringify({
        version: 1,
        timestamp: '2026-07-13T12:00:00.000Z',
        runId: 'run-test',
        runDir,
        sourceProjectId: 'my-journal-936',
        firestore: { docCount: 10, jsonBytes: 100, collections: { cards: 1 } },
        storage: {
          mode: 'apply',
          bucket: 'bucket',
          objectCount: 5,
          totalBytes: 50,
          downloaded: 5,
          copied: 0,
        },
        complete: true,
      }),
      'utf8'
    );

    const status = getBackupOperationsStatus();
    expect(status.readable).toBe(true);
    expect(status.latestComplete?.runId).toBe('run-test');
    expect(status.recentRuns[0]?.firestoreDocCount).toBe(10);

    fs.rmSync(onedrive, { recursive: true, force: true });
  });
});
