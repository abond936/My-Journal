import fs from 'fs';
import path from 'path';
import type { Bucket } from '@google-cloud/storage';
import { getAdminApp } from '../src/lib/config/firebase/admin';

const RUN_DIR =
  process.argv[2] ??
  'C:\\Users\\alanb\\OneDrive\\Firebase Backups\\run-2026-07-10T12-41-08-324Z';
const CONCURRENCY = 12;

type ManifestEntry = {
  storagePath: string;
  size: number;
  contentType: string | null;
};

async function uploadOne(bucket: Bucket, runDir: string, entry: ManifestEntry): Promise<void> {
  const localPath = path.join(runDir, 'storage', ...entry.storagePath.split('/'));
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing local file: ${localPath}`);
  }
  const buffer = fs.readFileSync(localPath);
  if (buffer.length !== entry.size) {
    throw new Error(`Size mismatch for ${entry.storagePath}: expected ${entry.size}, got ${buffer.length}`);
  }
  await bucket.file(entry.storagePath).save(buffer, {
    metadata: {
      contentType: entry.contentType ?? 'application/octet-stream',
    },
    resumable: buffer.length > 5 * 1024 * 1024,
  });
}

async function main() {
  const manifestPath = path.join(RUN_DIR, 'storage-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    objects: ManifestEntry[];
  };
  const objects = manifest.objects ?? [];
  const bucket = getAdminApp().storage().bucket();
  console.log(`Bucket: ${bucket.name}`);
  console.log(`Uploading ${objects.length} object(s) from ${RUN_DIR}`);

  let done = 0;
  let failed = 0;
  const queue = [...objects];

  async function worker() {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) return;
      try {
        await uploadOne(bucket, RUN_DIR, entry);
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

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Finished. uploaded=${done - failed} failed=${failed} total=${objects.length}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
