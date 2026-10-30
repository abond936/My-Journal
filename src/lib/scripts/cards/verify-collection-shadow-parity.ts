/** Read-only parity verification between a stored shadow Collection and the legacy Card hierarchy. */
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import {
  buildReaderCollectionProjection,
  compareStoredPlacementsToPreview,
  flattenReaderCollectionProjection,
} from '@/lib/utils/collectionPlacementProjection';

function readArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1).trim() || undefined;
}

async function main() {
  const collectionId = readArg('--collection-id');
  if (!collectionId) throw new Error('--collection-id is required.');
  const firestore = getAdminApp().firestore();
  const [collectionSnap, placementsSnap, cardsSnap] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).get(),
    firestore.collection('cards').get(),
  ]);
  if (!collectionSnap.exists) throw new Error(`Collection ${collectionId} was not found.`);
  const collection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });
  const placements = placementsSnap.docs.map((doc) => collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() }));
  const cards = cardsSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  const sourceRootId = collection.legacySourceRootId ?? collection.introductionCardId;
  if (!sourceRootId) throw new Error('Collection has no legacy source root.');
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId,
    collectionId: collection.docId,
    collectionTitle: collection.title,
    now: 0,
  });
  const parityIssues = compareStoredPlacementsToPreview({ placements, preview });
  if (parityIssues.length) throw new Error(`Placement parity failed: ${parityIssues.join(' ')}`);
  const projection = buildReaderCollectionProjection({ collection, placements, cards });
  const flattened = flattenReaderCollectionProjection(projection.roots);
  const roleCounts = flattened.reduce<Record<string, number>>((counts, node) => {
    counts[node.role] = (counts[node.role] ?? 0) + 1;
    return counts;
  }, {});
  process.stdout.write(`${JSON.stringify({
    ok: true,
    collectionId,
    recordState: collection.recordState,
    lifecycle: collection.lifecycle,
    introductionCardId: projection.introductionCard?.docId ?? null,
    rootPlacementCount: projection.roots.length,
    placementCount: flattened.length,
    uniqueCardCount: new Set(flattened.map((node) => node.cardId)).size,
    reusedOccurrenceCount: flattened.length - new Set(flattened.map((node) => node.cardId)).size,
    roleCounts,
    parityIssueCount: parityIssues.length,
    sourcePreviewIssueCount: preview.issues.length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
