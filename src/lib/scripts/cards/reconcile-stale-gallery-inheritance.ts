import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync as readFileSyncNode } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { getAllTags } from '@/lib/firebase/tagService';
import { syncGalleryTagInheritanceForCard } from '@/lib/services/galleryTagInheritanceService';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import {
  cardTagsEqual,
  computeGalleryInheritanceResult,
  computeGalleryTemporalRollup,
  effectiveGalleryInheritanceToggles,
  galleryInheritanceTogglesActive,
} from '@/lib/utils/galleryTagInheritance';
import {
  buildSubjectFilterTags,
  filterSubjectTagIdsForTemporal,
  resolveStoredSubjectTagIds,
} from '@/lib/utils/subjectTag';

loadEnv({ path: '.env.local', override: false });

const EXPECTED_PROJECT = 'my-journal-936';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = path.resolve(
  manifestArg?.slice('--manifest='.length) ?? 'temp/gallery-inheritance-reconciliation.json'
);
const mode = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--audit')
    ? 'audit'
    : 'manifest';

type UpdateTime = { seconds: number; nanoseconds: number };

type ManifestEntry = {
  cardId: string;
  title: string;
  updateTime: UpdateTime;
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

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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

function requireFreshCheckpoint(): string {
  const runDir = process.argv
    .find((arg) => arg.startsWith('--firestore-backup-run='))
    ?.slice('--firestore-backup-run='.length);
  if (!runDir) throw new Error('Apply requires --firestore-backup-run=<exact run directory>');
  const metadataPath = path.join(runDir, 'metadata.json');
  const metadata = JSON.parse(readFileSyncNode(metadataPath, 'utf8')) as {
    timestamp: string;
    runId: string;
    firestoreCollections?: Record<string, number>;
    firestoreJsonBytes?: number;
    typesense?: {
      cards?: { ok?: boolean; lines?: number };
      media?: { ok?: boolean; lines?: number };
    };
  };
  const firestoreBytes = readFileSyncNode(path.join(runDir, 'firestore.json')).byteLength;
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
  return runDir;
}

async function loadState(firestore: FirebaseFirestore.Firestore) {
  const [settings, allTags, cardsSnapshot, mediaSnapshot] = await Promise.all([
    getAuthorSettings(),
    getAllTags(),
    firestore.collection('cards').get(),
    firestore.collection('media').get(),
  ]);
  const mediaById = new Map(
    mediaSnapshot.docs.map((doc) => [doc.id, { docId: doc.id, ...doc.data() } as Media])
  );
  return { settings, allTags, cardsSnapshot, mediaById };
}

async function assessCard(
  card: Card,
  galleryMedia: Media[],
  allTags: Awaited<ReturnType<typeof getAllTags>>,
  toggles: ReturnType<typeof effectiveGalleryInheritanceToggles>
): Promise<string[]> {
  const result = computeGalleryInheritanceResult(
    card.tags ?? [],
    galleryMedia,
    toggles,
    allTags,
    card.galleryTagRollupStatuses,
    card.dimensionReview
  );
  const temporalRollup = toggles.when ? computeGalleryTemporalRollup(galleryMedia, allTags) : null;
  if (temporalRollup && temporalRollup.status !== 'empty') {
    result.statuses.when = temporalRollup.status;
    result.dimensionReview = {
      ...(result.dimensionReview ?? {}),
      when: {
        reviewed: temporalRollup.status === 'reviewed',
        resolution:
          temporalRollup.temporal?.status === 'unknown' ||
          temporalRollup.temporal?.status === 'not_applicable'
            ? temporalRollup.temporal.status
            : null,
      },
    };
  }
  const differences: string[] = [];
  if (!cardTagsEqual(card.tags ?? [], result.tags)) differences.push('tags');
  if (!jsonEqual(card.galleryTagRollupStatuses, result.statuses)) differences.push('rollup-statuses');
  if (!jsonEqual(card.dimensionReview, result.dimensionReview)) differences.push('dimension-review');
  if (!cardTagsEqual(card.galleryImplicitSubjectTagIds ?? [], result.implicitSubjectTagIds)) {
    differences.push('implicit-subjects');
  }
  const effectiveTemporal = temporalRollup ? temporalRollup.temporal : card.temporal;
  const expectedSubjectIds = filterSubjectTagIdsForTemporal([
    ...resolveStoredSubjectTagIds(card.subjectTagIds, card.subjectTagId),
    ...result.implicitSubjectTagIds,
  ], effectiveTemporal, allTags);
  const expectedSubjectFilterTags = await buildSubjectFilterTags(expectedSubjectIds, allTags);
  const storedSubjectFilterTagIds = Object.entries(card.subjectFilterTags ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([tagId]) => tagId);
  if (!cardTagsEqual(storedSubjectFilterTagIds, Object.keys(expectedSubjectFilterTags))) {
    differences.push('subject-filter-tags');
  }
  if (
    temporalRollup &&
    (!jsonEqual(card.temporal, temporalRollup.temporal) ||
      card.galleryTemporalRollupStatus !== temporalRollup.status)
  ) {
    differences.push('temporal');
  }
  return differences;
}

async function generateManifest(firestore: FirebaseFirestore.Firestore): Promise<Manifest> {
  const { settings, allTags, cardsSnapshot, mediaById } = await loadState(firestore);
  const entries: ManifestEntry[] = [];
  for (const doc of cardsSnapshot.docs) {
    const card = { docId: doc.id, ...doc.data() } as Card;
    const toggles = effectiveGalleryInheritanceToggles(
      settings.galleryTagInheritance,
      card.galleryTagInheritanceOverrides
    );
    if (!galleryInheritanceTogglesActive(toggles)) continue;
    const galleryMedia = (card.galleryMedia ?? [])
      .map((item) => mediaById.get(item.mediaId))
      .filter((media): media is Media => Boolean(media));
    const differences = await assessCard(card, galleryMedia, allTags, toggles);
    if (differences.length === 0) continue;
    entries.push({
      cardId: doc.id,
      title: card.title ?? '',
      updateTime: {
        seconds: doc.updateTime.seconds,
        nanoseconds: doc.updateTime.nanoseconds,
      },
      differences,
    });
  }
  entries.sort((left, right) => left.cardId.localeCompare(right.cardId));
  return {
    version: 1,
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ?? getAdminApp().options.projectId ?? null,
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprint(entries),
    entries,
  };
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (
    manifest.version !== 1 ||
    manifest.projectId !== EXPECTED_PROJECT ||
    manifest.fingerprint !== fingerprint(manifest.entries) ||
    new Set(manifest.entries.map((entry) => entry.cardId)).size !== manifest.entries.length
  ) {
    throw new Error('Reconciliation manifest is invalid or modified');
  }
  return manifest;
}

async function auditManifest(
  firestore: FirebaseFirestore.Firestore,
  manifest: Manifest
): Promise<{ remaining: ManifestEntry[] }> {
  const current = await generateManifest(firestore);
  const targetIds = new Set(manifest.entries.map((entry) => entry.cardId));
  return { remaining: current.entries.filter((entry) => targetIds.has(entry.cardId)) };
}

async function main(): Promise<void> {
  const app = getAdminApp();
  try {
    const firestore = app.firestore();
    if (mode === 'manifest') {
      const manifest = await generateManifest(firestore);
      await mkdir(path.dirname(manifestPath), { recursive: true });
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      console.log(JSON.stringify({
        manifestPath,
        projectId: manifest.projectId,
        fingerprint: manifest.fingerprint,
        affectedCards: manifest.entries.length,
        differences: manifest.entries.reduce<Record<string, number>>((counts, entry) => {
          entry.differences.forEach((difference) => {
            counts[difference] = (counts[difference] ?? 0) + 1;
          });
          return counts;
        }, {}),
        sample: manifest.entries.slice(0, 10),
      }, null, 2));
      return;
    }

    const manifest = await loadManifest();
    if (mode === 'audit') {
      const audit = await auditManifest(firestore, manifest);
      console.log(JSON.stringify({ auditedCards: manifest.entries.length, remaining: audit.remaining }, null, 2));
      if (audit.remaining.length > 0) process.exitCode = 1;
      return;
    }

    requireProductionConfirmation();
    const checkpoint = requireFreshCheckpoint();
    for (const [index, entry] of manifest.entries.entries()) {
      const snapshot = await firestore.collection('cards').doc(entry.cardId).get();
      if (
        !snapshot.exists ||
        snapshot.updateTime.seconds !== entry.updateTime.seconds ||
        snapshot.updateTime.nanoseconds !== entry.updateTime.nanoseconds
      ) {
        throw new Error(`Card changed after manifest generation: ${entry.cardId}`);
      }
      await syncGalleryTagInheritanceForCard(entry.cardId);
      console.log(`reconciled ${index + 1}/${manifest.entries.length}: ${entry.cardId}`);
    }
    const audit = await auditManifest(firestore, manifest);
    if (audit.remaining.length > 0) {
      throw new Error(`Reconciliation audit failed for ${audit.remaining.length} Cards`);
    }
    console.log(JSON.stringify({
      applied: manifest.entries.length,
      fingerprint: manifest.fingerprint,
      checkpoint,
      auditRemaining: 0,
    }, null, 2));
  } finally {
    await app.delete();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
