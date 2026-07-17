import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { resolveBackupRootPath } from './recoveryConstants';

loadEnv({ path: '.env.local', override: false, quiet: true });

const EXPECTED_PROJECT = 'my-journal-936';
const EXPECTED_MEDIA_COUNT = 3503;
const EXPECTED_ACCESSIBLE = 3064;
const EXPECTED_UNAVAILABLE = 101;
const EXPECTED_NON_LOCAL = 338;
const EXPECTED_DUPLICATE_DIGEST = '72779ff5e84eca5600931e3ff545461d13be578efa32decbddb9c4d631610356';
const EXPECTED_DUPLICATE_IDS = ['HcdSOUeqx3YY3LeedXVa', 'wpQVDYRH3ExuPrcX1GET'];
const HASH_CONCURRENCY = 8;
const ASSETS_PER_BATCH = 100;
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;

type MediaRow = {
  docId: string;
  source?: string;
  sourcePath?: string;
  contentIdentity?: { algorithm?: string; digest?: string; basis?: string };
  updateTime: FirebaseFirestore.Timestamp;
};

type HashResult =
  | { row: MediaRow; status: 'hashed'; digest: string }
  | { row: MediaRow; status: 'unavailable' }
  | { row: MediaRow; status: 'not-local' };

type BackupManifest = {
  runId: string;
  timestamp: string;
  sourceProjectId: string | null;
  complete: boolean;
  storage?: { mode?: string; objectCount?: number };
};

function requireApprovedArgs(): void {
  if (!process.argv.includes('--apply')) {
    throw new Error('Backfill is write-enabled only with --apply');
  }
  const confirmation = process.argv.find(arg => arg.startsWith('--confirm-project='))?.split('=')[1];
  if (confirmation !== EXPECTED_PROJECT) {
    throw new Error(`Pass --confirm-project=${EXPECTED_PROJECT} to confirm the production target`);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID !== EXPECTED_PROJECT) {
    throw new Error('Configured Firebase project does not match the approved production target');
  }
}

function requireFreshBackup(): BackupManifest {
  const backupRoot = resolveBackupRootPath();
  const pointer = JSON.parse(
    readFileSync(path.join(backupRoot, 'latest-complete-run.json'), 'utf8')
  ) as { runDir?: string };
  if (!pointer.runDir) throw new Error('Latest complete backup pointer has no run directory');
  const manifest = JSON.parse(
    readFileSync(path.join(pointer.runDir, 'run-manifest.json'), 'utf8')
  ) as BackupManifest;
  const age = Date.now() - Date.parse(manifest.timestamp);
  if (!manifest.complete || manifest.storage?.mode !== 'apply') {
    throw new Error('Latest backup is not a complete paired Firestore and Storage run');
  }
  if (manifest.sourceProjectId !== EXPECTED_PROJECT) {
    throw new Error('Latest backup does not belong to the approved production project');
  }
  if (!Number.isFinite(age) || age < 0 || age > MAX_BACKUP_AGE_MS) {
    throw new Error('Latest complete backup is not fresh enough for this backfill');
  }
  return manifest;
}

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
  return relative.startsWith('..') || path.isAbsolute(relative) ? null : candidate;
}

async function inspect(row: MediaRow, root: string | undefined): Promise<HashResult> {
  if (row.source !== 'local') return { row, status: 'not-local' };
  if (!root || !row.sourcePath) return { row, status: 'unavailable' };
  const filePath = resolveSafeSourcePath(root, row.sourcePath);
  if (!filePath) return { row, status: 'unavailable' };
  try {
    await access(filePath);
    return { row, status: 'hashed', digest: await sha256File(filePath) };
  } catch {
    return { row, status: 'unavailable' };
  }
}

async function mapConcurrent<T, R>(values: T[], work: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(HASH_CONCURRENCY, values.length) }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= values.length) return;
        results[index] = await work(values[index]!);
      }
    })
  );
  return results;
}

function assertExpectedPopulation(results: HashResult[]): void {
  const hashed = results.filter(result => result.status === 'hashed');
  const unavailable = results.filter(result => result.status === 'unavailable');
  const nonLocal = results.filter(result => result.status === 'not-local');
  if (
    results.length !== EXPECTED_MEDIA_COUNT ||
    hashed.length !== EXPECTED_ACCESSIBLE ||
    unavailable.length !== EXPECTED_UNAVAILABLE ||
    nonLocal.length !== EXPECTED_NON_LOCAL
  ) {
    throw new Error(
      `Population drift: total=${results.length}, accessible=${hashed.length}, unavailable=${unavailable.length}, nonLocal=${nonLocal.length}`
    );
  }

  const groups = new Map<string, string[]>();
  for (const result of hashed) {
    const ids = groups.get(result.digest) ?? [];
    ids.push(result.row.docId);
    groups.set(result.digest, ids);
  }
  const duplicates = Array.from(groups, ([digest, ids]) => ({ digest, ids: ids.sort() })).filter(
    group => group.ids.length > 1
  );
  if (
    duplicates.length !== 1 ||
    duplicates[0]?.digest !== EXPECTED_DUPLICATE_DIGEST ||
    JSON.stringify(duplicates[0]?.ids) !== JSON.stringify(EXPECTED_DUPLICATE_IDS)
  ) {
    throw new Error(`Exact-match groups drifted: ${JSON.stringify(duplicates)}`);
  }
}

async function main(): Promise<void> {
  requireApprovedArgs();
  const backup = requireFreshBackup();
  const app = getAdminApp();
  try {
    const firestore = app.firestore();
    const snapshot = await firestore
      .collection('media')
      .select('source', 'sourcePath', 'contentIdentity')
      .get();
    const rows = snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data(),
      updateTime: doc.updateTime,
    })) as MediaRow[];
    const results = await mapConcurrent(rows, row => inspect(row, process.env.ONEDRIVE_ROOT_FOLDER));
    assertExpectedPopulation(results);

    const hashed = results.filter(
      (result): result is Extract<HashResult, { status: 'hashed' }> => result.status === 'hashed'
    );
    for (const result of hashed) {
      const stored = result.row.contentIdentity;
      if (stored?.digest && (
        stored.algorithm !== 'sha256' ||
        stored.basis !== 'source-bytes' ||
        stored.digest !== result.digest
      )) {
        throw new Error(`Stored evidence conflicts with source bytes for media ${result.row.docId}`);
      }
    }

    const duplicateIds = new Set(EXPECTED_DUPLICATE_IDS);
    const uniqueResults = hashed.filter(result => !duplicateIds.has(result.row.docId));
    const identityRefs = uniqueResults.map(result =>
      firestore.collection('mediaContentIdentities').doc(result.digest)
    );
    const identitySnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
    for (let index = 0; index < identityRefs.length; index += 250) {
      identitySnapshots.push(...(await firestore.getAll(...identityRefs.slice(index, index + 250))));
    }
    for (let index = 0; index < identitySnapshots.length; index += 1) {
      const identity = identitySnapshots[index];
      const expectedMediaId = uniqueResults[index]!.row.docId;
      if (identity?.exists && identity.data()?.mediaId !== expectedMediaId) {
        throw new Error(`Identity registry conflict for digest ${identity.id}`);
      }
    }

    let mediaWrites = 0;
    let registryWrites = 0;
    for (let index = 0; index < hashed.length; index += ASSETS_PER_BATCH) {
      const batchResults = hashed.slice(index, index + ASSETS_PER_BATCH);
      const batch = firestore.batch();
      for (const result of batchResults) {
        if (!result.row.contentIdentity?.digest) {
          batch.update(
            firestore.collection('media').doc(result.row.docId),
            {
              contentIdentity: {
                algorithm: 'sha256',
                digest: result.digest,
                basis: 'source-bytes',
              },
            },
            { lastUpdateTime: result.row.updateTime }
          );
          mediaWrites += 1;
        }
        if (!duplicateIds.has(result.row.docId)) {
          const uniqueIndex = uniqueResults.findIndex(item => item.row.docId === result.row.docId);
          const identity = identitySnapshots[uniqueIndex];
          if (!identity?.exists) {
            batch.create(firestore.collection('mediaContentIdentities').doc(result.digest), {
              mediaId: result.row.docId,
              algorithm: 'sha256',
              createdAt: Date.now(),
            });
            registryWrites += 1;
          }
        }
      }
      await batch.commit();
      console.log(`Committed ${Math.min(index + batchResults.length, hashed.length)}/${hashed.length}`);
    }

    console.log(JSON.stringify({
      applied: true,
      backupRunId: backup.runId,
      mediaCount: rows.length,
      accessibleOriginalCount: hashed.length,
      mediaWrites,
      registryWrites,
      exactMatchEvidenceOnly: EXPECTED_DUPLICATE_IDS,
      unavailableUnchanged: EXPECTED_UNAVAILABLE,
      nonLocalUnchanged: EXPECTED_NON_LOCAL,
    }, null, 2));
  } finally {
    await app.delete();
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
