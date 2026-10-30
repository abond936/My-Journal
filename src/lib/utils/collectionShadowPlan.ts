import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import type { CollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';

export type CollectionShadowMigrationOperation = {
  docId: string;
  kind: 'collection-shadow-create';
  status: 'complete';
  collectionId: string;
  legacySourceRootId: string;
  sourceFingerprint: string;
  targetFingerprint: string;
  placementCount: number;
  createdAt: number;
};

export type CollectionShadowWritePlan = {
  collection: Collection;
  placements: CollectionPlacement[];
  operation: CollectionShadowMigrationOperation;
};

function assertFingerprint(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a lowercase SHA-256 fingerprint.`);
}

export function buildCollectionShadowWritePlan(args: {
  preview: CollectionMigrationPreview;
  sourceFingerprint: string;
  targetFingerprint: string;
  now: number;
}): CollectionShadowWritePlan {
  const { preview, sourceFingerprint, targetFingerprint, now } = args;
  assertFingerprint(sourceFingerprint, 'Source fingerprint');
  assertFingerprint(targetFingerprint, 'Target fingerprint');
  if (preview.issues.length || preview.unresolvedSourceCardIds.length) {
    throw new Error('Cannot create a shadow plan from an unresolved migration preview.');
  }
  const legacySourceRootId = preview.collection.introductionCardId;
  if (!legacySourceRootId) throw new Error('Shadow Collection requires a legacy source root introduction Card.');

  const collection: Collection = {
    ...preview.collection,
    lifecycle: 'draft',
    recordState: 'shadow',
    legacySourceRootId,
    migrationSourceFingerprint: sourceFingerprint,
    migrationTargetFingerprint: targetFingerprint,
    createdAt: now,
    updatedAt: now,
  };
  const placements: CollectionPlacement[] = preview.placements.map(({ sourcePathIds, ...placement }) => ({
    ...placement,
    migrationSourcePathIds: sourcePathIds,
    createdAt: now,
    updatedAt: now,
  }));
  const operation: CollectionShadowMigrationOperation = {
    docId: `shadow-${collection.docId}-${targetFingerprint.slice(0, 12)}`,
    kind: 'collection-shadow-create',
    status: 'complete',
    collectionId: collection.docId,
    legacySourceRootId,
    sourceFingerprint,
    targetFingerprint,
    placementCount: placements.length,
    createdAt: now,
  };
  return { collection, placements, operation };
}
