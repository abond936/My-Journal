import type { Collection, CollectionPlacement, CollectionPlacementRole } from '@/lib/types/collection';
import { validateCollectionPlacementGraph } from '@/lib/utils/collectionPlacementMigration';

export type CollectionStructurePromotionErrorCode =
  | 'SOURCE_COLLECTION_NOT_ACTIVE'
  | 'SOURCE_COLLECTION_REVISION_CONFLICT'
  | 'SOURCE_PLACEMENT_NOT_FOUND'
  | 'SOURCE_PLACEMENT_NOT_STRUCTURAL'
  | 'SOURCE_STRUCTURE_INVALID'
  | 'PROMOTION_TOO_LARGE';

export class CollectionStructurePromotionError extends Error {
  constructor(
    public readonly code: CollectionStructurePromotionErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CollectionStructurePromotionError';
  }
}

export type CollectionStructurePromotionOperation = {
  docId: string;
  kind: 'collection-structure-promote';
  status: 'complete';
  sourceCollectionId: string;
  sourcePlacementId: string;
  sourceStructureRevision: number;
  targetCollectionId: string;
  targetPlacementCount: number;
  sourceToTargetPlacementIds: Record<string, string>;
  createdAt: number;
};

export type CollectionStructurePromotionPlan = {
  collection: Collection;
  placements: CollectionPlacement[];
  operation: CollectionStructurePromotionOperation;
};

function promotedRootRole(role: CollectionPlacementRole): CollectionPlacementRole {
  return role === 'section' ? 'chapter' : role;
}

export function buildCollectionStructurePromotionPlan(args: {
  sourceCollection: Collection;
  sourcePlacements: CollectionPlacement[];
  sourcePlacementId: string;
  expectedStructureRevision: number;
  targetCollectionId: string;
  targetTitle: string;
  targetOrder: number;
  targetPlacementId: (sourcePlacementId: string) => string;
  existingCardIds: ReadonlySet<string>;
  now: number;
}): CollectionStructurePromotionPlan {
  const {
    sourceCollection,
    sourcePlacements,
    sourcePlacementId,
    expectedStructureRevision,
    targetCollectionId,
    targetTitle,
    targetOrder,
    targetPlacementId,
    existingCardIds,
    now,
  } = args;
  if (sourceCollection.recordState !== 'active') {
    throw new CollectionStructurePromotionError(
      'SOURCE_COLLECTION_NOT_ACTIVE',
      'Only an active Collection can supply promoted structure.'
    );
  }
  if (sourceCollection.structureRevision !== expectedStructureRevision) {
    throw new CollectionStructurePromotionError(
      'SOURCE_COLLECTION_REVISION_CONFLICT',
      `The source Collection changed after this Studio view loaded. Expected revision ${expectedStructureRevision}; current revision is ${sourceCollection.structureRevision}.`
    );
  }
  const sourceById = new Map(sourcePlacements.map((placement) => [placement.docId, placement]));
  const sourcePlacement = sourceById.get(sourcePlacementId);
  if (!sourcePlacement) {
    throw new CollectionStructurePromotionError(
      'SOURCE_PLACEMENT_NOT_FOUND',
      'The selected Part, Chapter, or Section no longer exists.'
    );
  }
  if (sourcePlacement.role === 'card') {
    throw new CollectionStructurePromotionError(
      'SOURCE_PLACEMENT_NOT_STRUCTURAL',
      'Choose a Part, Chapter, or Section to create a Collection.'
    );
  }
  const sourceIssues = validateCollectionPlacementGraph({
    collection: sourceCollection,
    placements: sourcePlacements,
    existingCardIds,
  });
  if (sourceIssues.length) {
    throw new CollectionStructurePromotionError(
      'SOURCE_STRUCTURE_INVALID',
      'The source Collection structure must be repaired before it can be promoted.',
      sourceIssues
    );
  }

  const descendantIds = new Set<string>();
  let frontier = [sourcePlacementId];
  while (frontier.length) {
    const parents = new Set(frontier);
    frontier = sourcePlacements
      .filter((placement) => placement.parentPlacementId && parents.has(placement.parentPlacementId))
      .map((placement) => placement.docId)
      .filter((placementId) => {
        if (descendantIds.has(placementId)) return false;
        descendantIds.add(placementId);
        return true;
      });
  }
  if (descendantIds.size + 3 > 450) {
    throw new CollectionStructurePromotionError(
      'PROMOTION_TOO_LARGE',
      'This structure is too large to create as one atomic Collection.',
      { descendantCount: descendantIds.size }
    );
  }

  const sourceToTargetPlacementIds: Record<string, string> = {};
  descendantIds.forEach((sourceId) => {
    sourceToTargetPlacementIds[sourceId] = targetPlacementId(sourceId);
  });
  const placements = sourcePlacements
    .filter((placement) => descendantIds.has(placement.docId))
    .map((placement) => {
      const parentIsPromotedRoot = placement.parentPlacementId === sourcePlacementId;
      return {
        docId: sourceToTargetPlacementIds[placement.docId],
        collectionId: targetCollectionId,
        cardId: placement.cardId,
        parentPlacementId: parentIsPromotedRoot
          ? null
          : sourceToTargetPlacementIds[placement.parentPlacementId!],
        role: parentIsPromotedRoot ? promotedRootRole(placement.role) : placement.role,
        order: placement.order,
        createdAt: now,
        updatedAt: now,
      } satisfies CollectionPlacement;
    });
  const collection: Collection = {
    docId: targetCollectionId,
    title: targetTitle,
    description: null,
    introductionCardId: sourcePlacement.cardId,
    lifecycle: 'draft',
    recordState: 'active',
    structureRevision: 0,
    authorityRevision: 1,
    authorityEstablishedAt: now,
    order: targetOrder,
    createdAt: now,
    updatedAt: now,
  };
  const targetIssues = validateCollectionPlacementGraph({
    collection,
    placements,
    existingCardIds,
  });
  if (targetIssues.length) {
    throw new CollectionStructurePromotionError(
      'SOURCE_STRUCTURE_INVALID',
      'The selected structure cannot become a legal Collection.',
      targetIssues
    );
  }
  return {
    collection,
    placements,
    operation: {
      docId: `promote-${targetCollectionId}`,
      kind: 'collection-structure-promote',
      status: 'complete',
      sourceCollectionId: sourceCollection.docId,
      sourcePlacementId,
      sourceStructureRevision: sourceCollection.structureRevision,
      targetCollectionId,
      targetPlacementCount: placements.length,
      sourceToTargetPlacementIds,
      createdAt: now,
    },
  };
}
