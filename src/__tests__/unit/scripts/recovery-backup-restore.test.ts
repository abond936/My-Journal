import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  parseRestoreStorageArgs,
  resolveStorageBackupRunDir,
  verifyLocalStorageObject,
} from '@/lib/scripts/firebase/restore-storage';
import { writeRunManifest, type RunManifest } from '@/lib/scripts/firebase/backup-run';
import { parseRestoreRunArgs } from '@/lib/scripts/firebase/restore-run';
import {
  readRunManifestSummary,
  resolvePairedBackupRunDir,
} from '@/lib/scripts/firebase/recoveryRunPaths';

describe('recovery backup/restore helpers', () => {
  it('parseRestoreStorageArgs reads apply and backup path', () => {
    expect(
      parseRestoreStorageArgs([
        '--backup=C:\\backups\\run-test',
        '--apply',
        '--confirm-project=drill-project',
        '--concurrency=4',
      ])
    ).toEqual({
      apply: true,
      backupPath: 'C:\\backups\\run-test',
      confirmProject: 'drill-project',
      concurrency: 4,
    });
  });

  it('resolveStorageBackupRunDir accepts a run directory with storage-manifest.json', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-run-'));
    const manifestPath = path.join(tempDir, 'storage-manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ objects: [{ storagePath: 'images/a.jpg', size: 3, contentType: 'image/jpeg' }] }),
      'utf8'
    );

    expect(resolveStorageBackupRunDir(tempDir)).toBe(tempDir);
  });

  it('verifyLocalStorageObject checks size against manifest entry', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-object-'));
    const runDir = tempDir;
    const storagePath = 'images/test.jpg';
    const localPath = path.join(runDir, 'storage', 'images', 'test.jpg');
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from('abc'));

    expect(
      verifyLocalStorageObject(runDir, {
        storagePath,
        size: 3,
        contentType: 'image/jpeg',
      })
    ).toBeNull();

    expect(
      verifyLocalStorageObject(runDir, {
        storagePath,
        size: 4,
        contentType: 'image/jpeg',
      })
    ).toMatch(/size mismatch/);
  });

  it('writeRunManifest writes run-manifest.json into the run directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-manifest-'));
    const manifest: RunManifest = {
      version: 1,
      timestamp: '2026-07-10T12:00:00.000Z',
      runId: 'run-test',
      runDir: tempDir,
      sourceProjectId: 'source-project',
      firestore: { docCount: 1, jsonBytes: 10, collections: { cards: 1 } },
      storage: {
        mode: 'apply',
        bucket: 'source-project.firebasestorage.app',
        objectCount: 1,
        totalBytes: 3,
        downloaded: 1,
        copied: 0,
      },
      complete: true,
    };

    writeRunManifest(tempDir, manifest);

    expect(JSON.parse(fs.readFileSync(path.join(tempDir, 'run-manifest.json'), 'utf8'))).toEqual(manifest);
  });

  it('parseRestoreRunArgs reads paired restore flags', () => {
    expect(
      parseRestoreRunArgs([
        '--backup=C:\\backups\\run-test',
        '--apply',
        '--confirm-project=drill-project',
        '--allow-non-empty',
        '--concurrency=8',
      ])
    ).toEqual({
      allowNonEmpty: true,
      apply: true,
      backupPath: 'C:\\backups\\run-test',
      confirmProject: 'drill-project',
      concurrency: 8,
    });
  });

  it('resolvePairedBackupRunDir requires firestore.json and storage-manifest.json', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-run-'));
    fs.writeFileSync(path.join(tempDir, 'firestore.json'), '{}', 'utf8');
    fs.writeFileSync(
      path.join(tempDir, 'storage-manifest.json'),
      JSON.stringify({ objects: [] }),
      'utf8'
    );

    expect(resolvePairedBackupRunDir(tempDir)).toBe(tempDir);

    const incompleteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-incomplete-'));
    fs.writeFileSync(path.join(incompleteDir, 'firestore.json'), '{}', 'utf8');
    expect(() => resolvePairedBackupRunDir(incompleteDir)).toThrow(/missing required file/);
  });

  it('readRunManifestSummary reads complete flag when present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-summary-'));
    fs.writeFileSync(
      path.join(tempDir, 'run-manifest.json'),
      JSON.stringify({ complete: true, sourceProjectId: 'source-project' }),
      'utf8'
    );

    expect(readRunManifestSummary(tempDir)).toEqual({
      hasRunManifest: true,
      complete: true,
      sourceProjectId: 'source-project',
    });
  });
});
