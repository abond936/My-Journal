import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { computeHierarchicalUniqueIds } from './tag-count-utils';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 350;
const EXPECTED_PROJECT = 'my-journal-936';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
const manifestPath = path.resolve(
  process.argv.find((arg) => arg.startsWith('--manifest='))?.slice('--manifest='.length)
    ?? 'temp/tag-count-repair.json'
);
type TagCountDoc = {
  docId: string;
  parentId?: string;
  cardCount?: number;
  mediaCount?: number;
  uniqueCardIds?: string[];
  uniqueMediaIds?: string[];
};
type ManifestEntry = {
  tagId: string;
  updateTime: { seconds: number; nanoseconds: number };
  cardIds: string[];
  mediaIds: string[];
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
    typesense?: { cards?: { ok?: boolean }; media?: { ok?: boolean } };
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

function sameIds(actual: string[] | undefined, expected: Set<string>): boolean {
  if ((actual?.length ?? 0) !== expected.size) return false;
  return (actual ?? []).every((id) => expected.has(id));
}

async function run() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, cardSnap, mediaSnap] = await Promise.all([
    firestore.collection('tags').get(),
    firestore.collection('cards').select('tags').get(),
    firestore.collection('media').select('tags').get(),
  ]);
  const tags = tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as TagCountDoc);
  const cardIds = computeHierarchicalUniqueIds(tags, cardSnap.docs.map((doc) => ({ objectId: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })));
  const mediaIds = computeHierarchicalUniqueIds(tags, mediaSnap.docs.map((doc) => ({ objectId: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })));
  const cardCountMismatches = tags.filter((tag) => tag.cardCount !== (cardIds.get(tag.docId)?.size ?? 0));
  const cardIdMismatches = tags.filter((tag) => !sameIds(tag.uniqueCardIds, cardIds.get(tag.docId) ?? new Set()));
  const mediaCountMismatches = tags.filter((tag) => tag.mediaCount !== (mediaIds.get(tag.docId)?.size ?? 0));
  const mediaIdMismatches = tags.filter((tag) => !sameIds(tag.uniqueMediaIds, mediaIds.get(tag.docId) ?? new Set()));
  const cardMismatches = tags.filter((tag) => cardCountMismatches.includes(tag) || cardIdMismatches.includes(tag));
  const mediaMismatches = tags.filter((tag) => mediaCountMismatches.includes(tag) || mediaIdMismatches.includes(tag));
  const affected = tags.filter((tag) => cardMismatches.includes(tag) || mediaMismatches.includes(tag));
  const updateTimeByTagId = new Map(
    tagSnap.docs.map((doc) => [
      doc.id,
      {
        seconds: doc.updateTime.seconds,
        nanoseconds: doc.updateTime.nanoseconds,
      },
    ])
  );
  const entries: ManifestEntry[] = affected.map((tag) => ({
    tagId: tag.docId,
    updateTime: updateTimeByTagId.get(tag.docId)!,
    cardIds: [...(cardIds.get(tag.docId) ?? [])].sort((a, b) => a.localeCompare(b)),
    mediaIds: [...(mediaIds.get(tag.docId) ?? [])].sort((a, b) => a.localeCompare(b)),
  }));
  entries.sort((left, right) => left.tagId.localeCompare(right.tagId));
  const manifest: Manifest = {
    version: 1,
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ?? null,
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprint(entries),
    entries,
  };
  console.log(`Tags: ${tags.length}`);
  console.log(`Card count mismatches: ${cardCountMismatches.length}; unique-card-ID mismatches: ${cardIdMismatches.length}`);
  console.log(`Media count mismatches: ${mediaCountMismatches.length}; unique-media-ID mismatches: ${mediaIdMismatches.length}`);
  console.log(`Affected tags: ${affected.length}`);
  if (!APPLY) {
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest: ${manifestPath}`);
    console.log(`Fingerprint: ${manifest.fingerprint}`);
    console.log('Audit only. No writes performed.');
    return;
  }
  requireProductionConfirmation();
  requireFreshCheckpoint();
  const stored = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  if (
    stored.fingerprint !== fingerprint(stored.entries) ||
    stored.fingerprint !== manifest.fingerprint
  ) {
    throw new Error('Tag count state changed after manifest generation; generate a new manifest');
  }
  for (let start = 0; start < stored.entries.length; start += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const entry of stored.entries.slice(start, start + BATCH_SIZE)) {
      batch.update(firestore.collection('tags').doc(entry.tagId), {
        cardCount: entry.cardIds.length,
        uniqueCardIds: entry.cardIds,
        mediaCount: entry.mediaIds.length,
        uniqueMediaIds: entry.mediaIds,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  console.log(`Updated ${stored.entries.length} tag count projections.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
