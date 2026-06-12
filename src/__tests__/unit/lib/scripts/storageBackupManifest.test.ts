import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  localStorageObjectPath,
  loadPriorObjectIndex,
  parseStorageBackupArgs,
} from '@/lib/scripts/firebase/full-storage-backup';

describe('storage backup helpers', () => {
  it('parses apply, limit, and progress flags', () => {
    expect(parseStorageBackupArgs([])).toEqual({
      apply: false,
      limit: null,
      progressEvery: 25,
    });
    expect(parseStorageBackupArgs(['--apply', '--limit=10', '--progress-every=5'])).toEqual({
      apply: true,
      limit: 10,
      progressEvery: 5,
    });
  });

  it('builds local storage paths from firebase storage paths', () => {
    expect(localStorageObjectPath('/tmp/run-1', 'images/renditions/studio/media-1.webp')).toBe(
      path.join('/tmp/run-1', 'storage', 'images', 'renditions', 'studio', 'media-1.webp')
    );
  });

  it('indexes prior manifest entries for incremental copy decisions', () => {
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-backup-test-'));
    const priorRunId = 'run-prior';
    const priorRunDir = path.join(backupRoot, priorRunId);
    fs.mkdirSync(priorRunDir, { recursive: true });

    const storagePath = 'images/sample.webp';
    const localPath = localStorageObjectPath(priorRunDir, storagePath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, 'webp-bytes');

    fs.writeFileSync(
      path.join(priorRunDir, 'storage-manifest.json'),
      JSON.stringify({
        objects: [
          {
            storagePath,
            size: 10,
            md5: 'abc123',
            contentType: 'image/webp',
            action: 'downloaded',
          },
        ],
      })
    );

    const index = loadPriorObjectIndex(backupRoot, 'run-new');
    expect(index.get(storagePath)).toMatchObject({
      md5: 'abc123',
      size: 10,
      runId: priorRunId,
      localPath,
    });

    fs.rmSync(backupRoot, { recursive: true, force: true });
  });
});
