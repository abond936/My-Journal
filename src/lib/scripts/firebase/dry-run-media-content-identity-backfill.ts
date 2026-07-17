import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';

const CONCURRENCY = 8;

// The command preloads shared credentials from .env. Add machine-local paths
// without overriding any shared values that are already present.
loadEnv({ path: '.env.local', override: false, quiet: true });

type MediaRow = {
  docId: string;
  source?: string;
  sourcePath?: string;
  contentIdentity?: { digest?: string };
};

type HashResult =
  | { mediaId: string; status: 'hashed'; digest: string }
  | { mediaId: string; status: 'unavailable'; reason: string }
  | { mediaId: string; status: 'not-local'; reason: string };

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function resolveSafeSourcePath(root: string, sourcePath: string): string | null {
  const rootPath = path.resolve(root);
  const candidate = path.resolve(rootPath, ...sourcePath.replaceAll('\\', '/').split('/'));
  const relative = path.relative(rootPath, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

async function inspect(row: MediaRow, root: string | undefined): Promise<HashResult> {
  if (row.source !== 'local') {
    return { mediaId: row.docId, status: 'not-local', reason: 'original source bytes unavailable' };
  }
  if (!root || !row.sourcePath) {
    return { mediaId: row.docId, status: 'unavailable', reason: 'local source configuration missing' };
  }
  const filePath = resolveSafeSourcePath(root, row.sourcePath);
  if (!filePath) {
    return { mediaId: row.docId, status: 'unavailable', reason: 'source path escaped configured root' };
  }
  try {
    await access(filePath);
    return { mediaId: row.docId, status: 'hashed', digest: await sha256File(filePath) };
  } catch {
    return { mediaId: row.docId, status: 'unavailable', reason: 'original local file not found' };
  }
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  work: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= values.length) return;
        results[index] = await work(values[index]!);
      }
    })
  );
  return results;
}

async function main() {
  if (process.argv.includes('--apply')) {
    throw new Error('This command is dry-run only and cannot apply writes');
  }
  const app = getAdminApp();
  const firestore = app.firestore();
  const snapshot = await firestore
    .collection('media')
    .select('source', 'sourcePath', 'contentIdentity')
    .get();
  const rows = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as MediaRow[];
  const alreadyEvidenced = rows.filter(row => row.contentIdentity?.digest);
  const pending = rows.filter(row => !row.contentIdentity?.digest);
  const results = await mapConcurrent(pending, CONCURRENCY, row =>
    inspect(row, process.env.ONEDRIVE_ROOT_FOLDER)
  );

  const digestGroups = new Map<string, string[]>();
  for (const result of results) {
    if (result.status !== 'hashed') continue;
    const mediaIds = digestGroups.get(result.digest) ?? [];
    mediaIds.push(result.mediaId);
    digestGroups.set(result.digest, mediaIds);
  }
  const exactMatchGroups = Array.from(digestGroups, ([digest, mediaIds]) => ({
    digest,
    mediaIds: mediaIds.sort(),
  }))
    .filter(group => group.mediaIds.length > 1)
    .sort((a, b) => b.mediaIds.length - a.mediaIds.length || a.digest.localeCompare(b.digest));
  const hashed = results.filter(
    (result): result is Extract<HashResult, { status: 'hashed' }> => result.status === 'hashed'
  );
  const unavailable = results.filter(result => result.status === 'unavailable');
  const notLocal = results.filter(result => result.status === 'not-local');
  const duplicateMediaIds = new Set(exactMatchGroups.flatMap(group => group.mediaIds));

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        mediaCount: rows.length,
        alreadyEvidencedCount: alreadyEvidenced.length,
        pendingCount: pending.length,
        accessibleOriginalCount: hashed.length,
        unavailableLocalCount: unavailable.length,
        nonLocalWithoutOriginalCount: notLocal.length,
        exactMatchGroupCount: exactMatchGroups.length,
        exactMatchMediaCount: duplicateMediaIds.size,
        projectedMediaWrites: hashed.length,
        projectedUncontestedIdentityRegistryWrites: hashed.length - duplicateMediaIds.size,
        unavailableSample: unavailable.slice(0, 25),
        nonLocalSample: notLocal.slice(0, 25),
        exactMatchGroups,
      },
      null,
      2
    )
  );
  await app.delete();
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
