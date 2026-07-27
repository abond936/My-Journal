import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import type { TemporalValue } from '@/lib/types/temporal';
import {
  buildSubjectFilterTags,
  filterSubjectTagIdsForTemporal,
} from '@/lib/utils/subjectTag';
import {
  normalizeSubjectTagIds,
  resolveStoredSubjectTagIds,
} from '@/lib/utils/storedSubjectTags';

const EXPECTED_PROJECT = 'my-journal-936';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 300;
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = path.resolve(
  manifestArg?.slice('--manifest='.length) ?? 'temp/subject-contract-reconciliation.json'
);
const mode = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--audit')
    ? 'audit'
    : 'manifest';

type CollectionName = 'cards' | 'media' | 'questions';
type UpdateTime = { seconds: number; nanoseconds: number };
type ManifestEntry = {
  collection: CollectionName;
  id: string;
  updateTime: UpdateTime;
  subjectTagId: string | null;
  subjectTagIds: string[];
  subjectFilterTags: Record<string, boolean>;
  galleryImplicitSubjectTagIds?: string[];
  differences: string[];
};
type Manifest = {
  version: 1;
  projectId: string | null;
  generatedAt: string;
  fingerprint: string;
  entries: ManifestEntry[];
};

function fingerprint(entries: ManifestEntry[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function requireProductionConfirmation(): void {
  const confirmation = process.argv
    .find((arg) => arg.startsWith('--confirm-project='))
    ?.split('=')[1];
  if (
    confirmation !== EXPECTED_PROJECT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID !== EXPECTED_PROJECT
  ) {
    throw new Error(
      `Production mutation requires --confirm-project=${EXPECTED_PROJECT} and matching credentials`
    );
  }
}

function requireFreshCheckpoint(): void {
  const runDir = process.argv
    .find((arg) => arg.startsWith('--firestore-backup-run='))
    ?.slice('--firestore-backup-run='.length);
  if (!runDir) throw new Error('Apply requires --firestore-backup-run=<exact run directory>');
  const metadata = JSON.parse(
    readFileSync(path.join(runDir, 'metadata.json'), 'utf8')
  ) as {
    timestamp: string;
    runId: string;
    firestoreCollections?: Record<string, number>;
    firestoreJsonBytes?: number;
    typesense?: {
      cards?: { ok?: boolean };
      media?: { ok?: boolean };
    };
  };
  const firestoreBytes = readFileSync(path.join(runDir, 'firestore.json')).byteLength;
  const age = Date.now() - Date.parse(metadata.timestamp);
  if (
    path.basename(runDir) !== metadata.runId ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > MAX_BACKUP_AGE_MS ||
    metadata.firestoreJsonBytes !== firestoreBytes ||
    !metadata.firestoreCollections?.cards ||
    !metadata.firestoreCollections?.media ||
    metadata.typesense?.cards?.ok !== true ||
    metadata.typesense?.media?.ok !== true
  ) {
    throw new Error('A complete Firestore and Typesense checkpoint less than 24 hours old is required');
  }
}

async function computeManifest(): Promise<Manifest> {
  const firestore = getAdminApp().firestore();
  const allTags = await getAllTags();
  const entries: ManifestEntry[] = [];
  for (const collection of ['cards', 'media', 'questions'] as const) {
    const snapshot = await firestore.collection(collection).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const assigned = normalizeSubjectTagIds(
        (collection === 'questions' ? data.tagIds : data.tags) as string[] | undefined
      );
      const temporal = data.temporal as TemporalValue | null | undefined;
      const explicit = filterSubjectTagIdsForTemporal(
        resolveStoredSubjectTagIds(
          Array.isArray(data.subjectTagIds) ? data.subjectTagIds : undefined,
          typeof data.subjectTagId === 'string' ? data.subjectTagId : null
        ).filter((tagId) => assigned.includes(tagId)),
        temporal,
        allTags
      );
      const implicit = collection === 'cards'
        ? filterSubjectTagIdsForTemporal(
            normalizeSubjectTagIds(data.galleryImplicitSubjectTagIds as string[] | undefined)
              .filter((tagId) => assigned.includes(tagId)),
            temporal,
            allTags
          )
        : [];
      const subjectFilterTags = await buildSubjectFilterTags(
        [...explicit, ...implicit],
        allTags
      );
      const subjectTagId = explicit[0] ?? null;
      const differences: string[] = [];
      if ((data.subjectTagId ?? null) !== subjectTagId) differences.push('subjectTagId');
      const shouldMaterializeArray =
        Array.isArray(data.subjectTagIds) ||
        data.subjectTagId != null ||
        explicit.length > 0;
      if (shouldMaterializeArray && !sameJson(data.subjectTagIds ?? null, explicit)) {
        differences.push('subjectTagIds');
      }
      if (!sameJson(data.subjectFilterTags ?? {}, subjectFilterTags)) {
        differences.push('subjectFilterTags');
      }
      if (
        collection === 'cards' &&
        !sameJson(data.galleryImplicitSubjectTagIds ?? [], implicit)
      ) {
        differences.push('galleryImplicitSubjectTagIds');
      }
      if (differences.length === 0) continue;
      entries.push({
        collection,
        id: doc.id,
        updateTime: {
          seconds: doc.updateTime.seconds,
          nanoseconds: doc.updateTime.nanoseconds,
        },
        subjectTagId,
        subjectTagIds: explicit,
        subjectFilterTags,
        ...(collection === 'cards' ? { galleryImplicitSubjectTagIds: implicit } : {}),
        differences,
      });
    }
  }
  entries.sort((left, right) =>
    left.collection.localeCompare(right.collection) || left.id.localeCompare(right.id)
  );
  return {
    version: 1,
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ?? null,
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprint(entries),
    entries,
  };
}

async function main() {
  if (mode === 'audit') {
    const manifest = await computeManifest();
    console.log(JSON.stringify({
      affectedRecords: manifest.entries.length,
      differences: manifest.entries.reduce<Record<string, number>>((counts, entry) => {
        for (const difference of entry.differences) {
          counts[difference] = (counts[difference] ?? 0) + 1;
        }
        return counts;
      }, {}),
      sample: manifest.entries.slice(0, 30).map(({ collection, id, differences }) => ({
        collection,
        id,
        differences,
      })),
    }, null, 2));
    console.log('Read-only audit. No Firestore writes performed.');
    if (manifest.entries.length > 0) process.exitCode = 2;
    return;
  }

  if (mode === 'manifest') {
    const manifest = await computeManifest();
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(JSON.stringify({
      manifestPath,
      projectId: manifest.projectId,
      fingerprint: manifest.fingerprint,
      affectedRecords: manifest.entries.length,
      differences: manifest.entries.reduce<Record<string, number>>((counts, entry) => {
        for (const difference of entry.differences) {
          counts[difference] = (counts[difference] ?? 0) + 1;
        }
        return counts;
      }, {}),
    }, null, 2));
    return;
  }

  requireProductionConfirmation();
  requireFreshCheckpoint();
  const stored = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (stored.fingerprint !== fingerprint(stored.entries)) {
    throw new Error('Stored subject manifest fingerprint is invalid');
  }
  const current = await computeManifest();
  if (current.fingerprint !== stored.fingerprint) {
    throw new Error('Subject state changed after manifest generation; generate a new manifest');
  }

  const firestore = getAdminApp().firestore();
  for (let start = 0; start < stored.entries.length; start += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const entry of stored.entries.slice(start, start + BATCH_SIZE)) {
      const ref = firestore.collection(entry.collection).doc(entry.id);
      batch.update(ref, {
        subjectTagId: entry.subjectTagId,
        subjectTagIds: entry.subjectTagIds,
        subjectFilterTags: entry.subjectFilterTags,
        ...(entry.galleryImplicitSubjectTagIds
          ? { galleryImplicitSubjectTagIds: entry.galleryImplicitSubjectTagIds }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  const after = await computeManifest();
  if (after.entries.length > 0) {
    throw new Error(`Subject reconciliation left ${after.entries.length} inconsistent records`);
  }
  console.log(`Reconciled and verified ${stored.entries.length} subject records.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
