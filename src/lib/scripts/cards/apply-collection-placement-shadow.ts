/**
 * Guarded, create-only execution of a previously frozen Collection shadow manifest.
 * Requires --apply and an existing recovery manifest. Existing target records abort the run.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import { createCollectionShadow } from '@/lib/services/collections/collectionShadowMigrationService';
import type { Card } from '@/lib/types/card';
import type { CollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import { buildCollectionShadowWritePlan } from '@/lib/utils/collectionShadowPlan';
import { isAbsolute } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';

type RecoveryManifest = {
  kind: 'collection-shadow-recovery-manifest';
  backupRunId: string;
  sourceFingerprint: string;
  targetFingerprint: string;
  preview: CollectionMigrationPreview;
};

function readArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1).trim() || undefined;
}

function parseManifest(path: string): RecoveryManifest {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RecoveryManifest>;
  if (
    parsed.kind !== 'collection-shadow-recovery-manifest' ||
    !parsed.backupRunId ||
    !parsed.sourceFingerprint ||
    !parsed.targetFingerprint ||
    !parsed.preview
  ) {
    throw new Error('Recovery manifest is missing required Collection shadow fields.');
  }
  return parsed as RecoveryManifest;
}

async function main() {
  if (!process.argv.includes('--apply')) throw new Error('Refusing to write without explicit --apply.');
  const manifestPath = readArg('--manifest');
  if (!manifestPath || !isAbsolute(manifestPath)) throw new Error('--manifest must be an absolute path.');
  const manifest = parseManifest(manifestPath);
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore
    .collection('cards')
    .select('title', 'status', 'isCollectionRoot', 'childrenIds')
    .get();
  const cards = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  const sourceFingerprint = fingerprintLegacyCollectionSource(cards);
  if (sourceFingerprint !== manifest.sourceFingerprint) {
    throw new Error(`Source fingerprint changed: expected ${manifest.sourceFingerprint}, received ${sourceFingerprint}.`);
  }

  const sourceRootId = manifest.preview.collection.introductionCardId;
  if (!sourceRootId) throw new Error('Recovery manifest has no source root introduction Card.');
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId,
    collectionId: manifest.preview.collection.docId,
    collectionTitle: manifest.preview.collection.title,
    now: 0,
  });
  const targetFingerprint = fingerprintCollectionMigrationPreview(preview);
  if (targetFingerprint !== manifest.targetFingerprint) {
    throw new Error(`Target fingerprint changed: expected ${manifest.targetFingerprint}, received ${targetFingerprint}.`);
  }

  const collectionId = preview.collection.docId;
  const [collectionBefore, placementsBefore] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).select().get(),
  ]);
  if (collectionBefore.exists || placementsBefore.size > 0) {
    throw new Error(
      `Target collision: collectionExists=${collectionBefore.exists} existingPlacementCount=${placementsBefore.size}.`
    );
  }

  const plan = buildCollectionShadowWritePlan({
    preview,
    sourceFingerprint,
    targetFingerprint,
    now: Date.now(),
  });
  if (plan.placements.length !== 197) {
    throw new Error(`Expected 197 placements, received ${plan.placements.length}.`);
  }
  await createCollectionShadow(plan);

  const [collectionAfter, placementsAfter, operationAfter] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).get(),
    firestore.collection('collection_migration_operations').doc(plan.operation.docId).get(),
  ]);
  if (!collectionAfter.exists) throw new Error('Post-write readback could not find the shadow Collection.');
  if (placementsAfter.size !== plan.placements.length) {
    throw new Error(`Post-write placement count mismatch: expected ${plan.placements.length}, received ${placementsAfter.size}.`);
  }
  if (!operationAfter.exists) throw new Error('Post-write readback could not find the migration operation.');
  const collection = collectionAfter.data()!;
  const operation = operationAfter.data()!;
  if (
    collection.recordState !== 'shadow' ||
    collection.lifecycle !== 'draft' ||
    collection.migrationSourceFingerprint !== sourceFingerprint ||
    collection.migrationTargetFingerprint !== targetFingerprint
  ) {
    throw new Error('Post-write Collection provenance or inactive state does not match the approved plan.');
  }
  if (operation.status !== 'complete' || operation.placementCount !== plan.placements.length) {
    throw new Error('Post-write migration operation does not match the approved plan.');
  }
  const roleCounts = placementsAfter.docs.reduce<Record<string, number>>((counts, doc) => {
    const role = String(doc.data().role);
    counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, {});

  process.stdout.write(`${JSON.stringify({
    ok: true,
    backupRunId: manifest.backupRunId,
    collectionId,
    collectionTitle: collection.title,
    recordState: collection.recordState,
    lifecycle: collection.lifecycle,
    placementCount: placementsAfter.size,
    roleCounts,
    operationId: operationAfter.id,
    sourceFingerprint,
    targetFingerprint,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
