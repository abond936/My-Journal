import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import { compareStoredPlacementsToPreview } from '@/lib/utils/collectionPlacementProjection';

export type CollectionShadowReadiness = {
  ready: boolean;
  currentSourceFingerprint: string;
  currentTargetFingerprint: string;
  sourceFingerprintMatches: boolean;
  targetFingerprintMatches: boolean;
  parityIssues: string[];
  sourceIssueCount: number;
};

export function evaluateCollectionShadowReadiness(args: {
  collection: Collection;
  placements: CollectionPlacement[];
  sourceCards: Card[];
}): CollectionShadowReadiness {
  const { collection, placements, sourceCards } = args;
  const sourceRootId = collection.legacySourceRootId ?? collection.introductionCardId;
  if (!sourceRootId) throw new Error('Shadow Collection has no legacy source root.');
  const preview = buildCollectionMigrationPreview({
    cards: sourceCards,
    sourceRootId,
    collectionId: collection.docId,
    collectionTitle: collection.title,
    now: 0,
  });
  const currentSourceFingerprint = fingerprintLegacyCollectionSource(sourceCards);
  const currentTargetFingerprint = fingerprintCollectionMigrationPreview(preview);
  const sourceFingerprintMatches = currentSourceFingerprint === collection.migrationSourceFingerprint;
  const targetFingerprintMatches = currentTargetFingerprint === collection.migrationTargetFingerprint;
  const parityIssues = compareStoredPlacementsToPreview({ placements, preview });
  const sourceIssueCount = preview.issues.length + preview.unresolvedSourceCardIds.length;
  return {
    ready: sourceFingerprintMatches && targetFingerprintMatches && parityIssues.length === 0 && sourceIssueCount === 0,
    currentSourceFingerprint,
    currentTargetFingerprint,
    sourceFingerprintMatches,
    targetFingerprintMatches,
    parityIssues,
    sourceIssueCount,
  };
}
