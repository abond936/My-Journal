/**
 * Read-only manifest for the legacy Card hierarchy and a proposed durable Collection projection.
 * This script never writes Firestore. Pass explicit target identity because Collection boundaries
 * and titles are author decisions rather than facts inferred from the legacy root.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';
import {
  buildCollectionMigrationPreview,
  buildLegacyCollectionInventory,
} from '@/lib/utils/collectionPlacementMigration';
import { buildCollectionShadowWritePlan } from '@/lib/utils/collectionShadowPlan';

function readArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1).trim() || undefined;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const sourceRootId = readArg('--source-root');
  const collectionId = readArg('--collection-id');
  const collectionTitle = readArg('--title');
  if (!sourceRootId || !collectionId || !collectionTitle) {
    throw new Error(
      'Usage: npm run manifest:collection-placement -- --source-root=<card-id> --collection-id=<id> --title=<title>'
    );
  }

  const firestore = getAdminApp().firestore();
  const snapshot = await firestore
    .collection('cards')
    .select('title', 'status', 'isCollectionRoot', 'childrenIds')
    .get();
  const cards = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId,
    collectionId,
    collectionTitle,
    now: 0,
  });
  const inventory = buildLegacyCollectionInventory(cards);
  const sourceFingerprint = fingerprintLegacyCollectionSource(cards);
  const targetFingerprint = fingerprintCollectionMigrationPreview(preview);
  const [existingCollection, existingPlacements] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).select().get(),
  ]);
  const targetCollision = {
    collectionExists: existingCollection.exists,
    existingPlacementCount: existingPlacements.size,
  };
  const outputPath = readArg('--output');
  if (outputPath) {
    if (!isAbsolute(outputPath)) throw new Error('--output must be an absolute path.');
    const backupRunId = readArg('--backup-run');
    if (!backupRunId) throw new Error('--backup-run is required when writing a recovery manifest.');
    const recoveryManifest = {
      kind: 'collection-shadow-recovery-manifest',
      generatedFromReadOnlySource: true,
      backupRunId,
      sourceFingerprint,
      targetFingerprint,
      targetCollision,
      inventory,
      preview,
      writePlan: buildCollectionShadowWritePlan({
        preview,
        sourceFingerprint,
        targetFingerprint,
        now: 0,
      }),
    };
    writeFileSync(outputPath, `${JSON.stringify(recoveryManifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`${JSON.stringify({
      recoveryManifestPath: outputPath,
      sourceFingerprint,
      targetFingerprint,
      targetCollision,
      writeDocumentCount: 2 + preview.placements.length,
    }, null, 2)}\n`);
    return;
  }

  if (hasArg('--summary')) {
    const titleById = new Map(cards.map((card) => [card.docId!, card.title || 'Untitled']));
    const roleCounts = preview.placements.reduce<Record<string, number>>((counts, placement) => {
      counts[placement.role] = (counts[placement.role] ?? 0) + 1;
      return counts;
    }, {});
    process.stdout.write(`${JSON.stringify({
      generatedFromReadOnlySource: true,
      inventory: {
        ...inventory,
        reachableCardIds: undefined,
      },
      collection: preview.collection,
      sourceFingerprint,
      targetFingerprint,
      targetCollision,
      placementCount: preview.placements.length,
      roleCounts,
      reusedCards: preview.reusedCardIds.map((cardId) => ({ cardId, title: titleById.get(cardId) })),
      sourceSharedCards: buildLegacyCollectionInventory(cards).sharedCardIds.map((cardId) => ({
        cardId,
        title: titleById.get(cardId),
      })),
      unresolvedSourceCards: preview.unresolvedSourceCardIds.map((cardId) => ({
        cardId,
        title: titleById.get(cardId),
      })),
      issues: preview.issues.map((issue) => ({
        ...issue,
        sourceTitle: issue.sourceCardId ? titleById.get(issue.sourceCardId) : undefined,
        sourcePathTitles: issue.sourcePathIds?.map((cardId) => titleById.get(cardId) ?? `Missing: ${cardId}`),
      })),
    }, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify({
    generatedFromReadOnlySource: true,
    sourceFingerprint,
    targetFingerprint,
    targetCollision,
    inventory,
    preview,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
