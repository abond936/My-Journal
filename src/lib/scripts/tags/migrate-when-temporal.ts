import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { temporalValueSchema, type TemporalValue } from '@/lib/types/temporal';

loadEnv({ path: '.env.local', override: false, quiet: true });

const EXPECTED_PROJECT = 'my-journal-936';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
const mode = process.argv.includes('--rollback')
  ? 'rollback'
  : process.argv.includes('--audit')
    ? 'audit'
    : process.argv.includes('--apply')
      ? 'apply'
      : 'preview';
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = path.resolve(
  manifestArg?.slice('--manifest='.length) ?? 'temp/when-temporal-migration.json'
);

type Entry = {
  collection: 'media' | 'cards';
  docId: string;
  result: 'convert' | 'ambiguous' | 'unparseable' | 'already-populated' | 'no-when-tags';
  whenTagIds: string[];
  whenTagNames: string[];
  existingTemporal: TemporalValue | null;
  proposedTemporal: TemporalValue | null;
  candidates?: TemporalValue[];
  updateTime: { seconds: number; nanoseconds: number };
};

type Manifest = {
  version: 1;
  generatedAt: string;
  fingerprint: string;
  entries: Entry[];
};

type CurrentRow = {
  temporal: TemporalValue | null;
  updateTime: { seconds: number; nanoseconds: number };
};

function fingerprint(entries: Entry[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function temporalEqual(left: TemporalValue | null, right: TemporalValue | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireProductionConfirmation(): void {
  const confirmation = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];
  if (
    confirmation !== EXPECTED_PROJECT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID !== EXPECTED_PROJECT
  ) {
    throw new Error(
      `Production mutation requires --confirm-project=${EXPECTED_PROJECT} and matching credentials`
    );
  }
}

function requireFreshFirestoreCheckpoint(): string {
  const runArg = process.argv.find((arg) => arg.startsWith('--firestore-backup-run='));
  const runDir = runArg?.slice('--firestore-backup-run='.length);
  if (!runDir) {
    throw new Error('Production mutation requires --firestore-backup-run=<exact run directory>');
  }
  const backup = JSON.parse(
    readFileSync(path.join(runDir, 'metadata.json'), 'utf8')
  ) as {
    timestamp: string;
    runId: string;
    firestoreCollections: Record<string, number>;
    firestoreJsonBytes: number;
    typesense?: {
      cards?: { ok?: boolean; lines?: number };
      media?: { ok?: boolean; lines?: number };
    };
  };
  const age = Date.now() - Date.parse(backup.timestamp);
  const firestorePath = path.join(runDir, 'firestore.json');
  const firestoreBytes = readFileSync(firestorePath).byteLength;
  if (
    !backup.runId ||
    path.basename(runDir) !== backup.runId ||
    firestoreBytes !== backup.firestoreJsonBytes ||
    backup.firestoreCollections.media !== 3503 ||
    backup.firestoreCollections.cards !== 1284 ||
    backup.firestoreCollections.tags !== 556 ||
    backup.typesense?.media?.ok !== true ||
    backup.typesense.media.lines !== 3503 ||
    backup.typesense?.cards?.ok !== true ||
    backup.typesense.cards.lines !== 1284 ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > MAX_BACKUP_AGE_MS
  ) {
    throw new Error('A complete, internally consistent Firestore checkpoint less than 24 hours old is required');
  }
  return runDir;
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (
    manifest.version !== 1 ||
    fingerprint(manifest.entries) !== manifest.fingerprint ||
    new Set(manifest.entries.map((entry) => `${entry.collection}/${entry.docId}`)).size !==
      manifest.entries.length
  ) {
    throw new Error('Temporal migration manifest is invalid or modified');
  }
  for (const entry of manifest.entries) {
    if (entry.result !== 'convert') continue;
    const parsed = temporalValueSchema.safeParse(entry.proposedTemporal);
    if (!parsed.success || parsed.data.status === 'known' && parsed.data.source !== 'migrated') {
      throw new Error(`Invalid proposed temporal value for ${entry.collection}/${entry.docId}`);
    }
  }
  return manifest;
}

async function loadCurrentRows(
  firestore: FirebaseFirestore.Firestore
): Promise<Map<string, CurrentRow>> {
  const [media, cards] = await Promise.all([
    firestore.collection('media').select('temporal').get(),
    firestore.collection('cards').select('temporal').get(),
  ]);
  const rows = new Map<string, CurrentRow>();
  for (const [collection, snapshot] of [['media', media], ['cards', cards]] as const) {
    for (const doc of snapshot.docs) {
      const data = doc.data() as { temporal?: TemporalValue | null };
      rows.set(`${collection}/${doc.id}`, {
        temporal: data.temporal ?? null,
        updateTime: { seconds: doc.updateTime.seconds, nanoseconds: doc.updateTime.nanoseconds },
      });
    }
  }
  return rows;
}

function assess(
  manifest: Manifest,
  rows: Map<string, CurrentRow>,
  target: 'apply' | 'rollback'
): { pending: Entry[]; alreadyTarget: Entry[] } {
  const pending: Entry[] = [];
  const alreadyTarget: Entry[] = [];
  for (const entry of manifest.entries.filter((candidate) => candidate.result === 'convert')) {
    const key = `${entry.collection}/${entry.docId}`;
    const row = rows.get(key);
    if (!row) throw new Error(`Missing current document: ${key}`);
    const targetValue = target === 'apply' ? entry.proposedTemporal : entry.existingTemporal;
    const sourceValue = target === 'apply' ? entry.existingTemporal : entry.proposedTemporal;
    if (temporalEqual(row.temporal, targetValue)) {
      alreadyTarget.push(entry);
      continue;
    }
    if (!temporalEqual(row.temporal, sourceValue)) {
      throw new Error(`Temporal value changed outside this migration: ${key}`);
    }
    if (
      target === 'apply' &&
      (row.updateTime.seconds !== entry.updateTime.seconds ||
        row.updateTime.nanoseconds !== entry.updateTime.nanoseconds)
    ) {
      throw new Error(`Document changed after manifest generation: ${key}`);
    }
    pending.push(entry);
  }
  return { pending, alreadyTarget };
}

async function mutate(
  firestore: FirebaseFirestore.Firestore,
  entries: Entry[],
  rows: Map<string, CurrentRow>,
  target: 'apply' | 'rollback'
): Promise<void> {
  for (let start = 0; start < entries.length; start += 300) {
    const batch = firestore.batch();
    for (const entry of entries.slice(start, start + 300)) {
      const key = `${entry.collection}/${entry.docId}`;
      const row = rows.get(key)!;
      const ref = firestore.collection(entry.collection).doc(entry.docId);
      const temporal =
        target === 'apply'
          ? entry.proposedTemporal
          : entry.existingTemporal === null
            ? FieldValue.delete()
            : entry.existingTemporal;
      batch.update(
        ref,
        { temporal, updatedAt: Date.now() },
        { lastUpdateTime: new Timestamp(row.updateTime.seconds, row.updateTime.nanoseconds) }
      );
    }
    await batch.commit();
    console.log(`${target}: ${Math.min(start + 300, entries.length)}/${entries.length}`);
  }
}

function audit(manifest: Manifest, rows: Map<string, CurrentRow>): void {
  let converted = 0;
  let untouchedExceptions = 0;
  for (const entry of manifest.entries) {
    const row = rows.get(`${entry.collection}/${entry.docId}`);
    if (!row) throw new Error(`Missing current document: ${entry.collection}/${entry.docId}`);
    if (entry.result === 'convert') {
      if (!temporalEqual(row.temporal, entry.proposedTemporal)) {
        throw new Error(`Conversion audit mismatch: ${entry.collection}/${entry.docId}`);
      }
      converted += 1;
    } else if (
      (entry.result === 'ambiguous' || entry.result === 'unparseable') &&
      !temporalEqual(row.temporal, entry.existingTemporal)
    ) {
      throw new Error(`Exception was unexpectedly changed: ${entry.collection}/${entry.docId}`);
    } else if (entry.result === 'ambiguous' || entry.result === 'unparseable') {
      untouchedExceptions += 1;
    }
  }
  console.log(JSON.stringify({ audit: true, converted, untouchedExceptions }, null, 2));
}

async function main(): Promise<void> {
  const manifest = await loadManifest();
  const app = getAdminApp();
  try {
    const firestore = app.firestore();
    const rows = await loadCurrentRows(firestore);
    if (mode === 'audit') {
      audit(manifest, rows);
      return;
    }
    const target = mode === 'rollback' ? 'rollback' : 'apply';
    const state = assess(manifest, rows, target);
    if (mode === 'preview') {
      console.log(JSON.stringify({
        preview: true,
        target,
        manifestPath,
        pending: state.pending.length,
        alreadyTarget: state.alreadyTarget.length,
      }, null, 2));
      return;
    }
    requireProductionConfirmation();
    const backupRun = requireFreshFirestoreCheckpoint();
    console.log(JSON.stringify({
      target,
      manifestPath,
      backupRun,
      pending: state.pending.length,
      alreadyTarget: state.alreadyTarget.length,
    }, null, 2));
    await mutate(firestore, state.pending, rows, target);
    const refreshed = await loadCurrentRows(firestore);
    if (target === 'apply') audit(manifest, refreshed);
    else {
      const rollbackState = assess(manifest, refreshed, 'rollback');
      if (rollbackState.pending.length > 0) {
        throw new Error(`Rollback audit failed for ${rollbackState.pending.length} documents`);
      }
      console.log(JSON.stringify({ rollbackAudit: true, restored: manifest.entries.filter((entry) => entry.result === 'convert').length }, null, 2));
    }
  } finally {
    await app.delete();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
