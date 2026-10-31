import type {
  Collection,
  CollectionPlacement,
  CollectionPlacementStructureInput,
} from '@/lib/types/collection';
import { sha256Json } from '@/lib/utils/collectionMigrationFingerprint';
import { validateCollectionPlacementGraph } from '@/lib/utils/collectionPlacementMigration';

export type CollectionPlacementMutationErrorCode =
  | 'COLLECTION_NOT_ACTIVE'
  | 'COLLECTION_PUBLISHED_LOCKED'
  | 'COLLECTION_REVISION_CONFLICT'
  | 'COLLECTION_STRUCTURE_INVALID'
  | 'COLLECTION_MUTATION_TOO_LARGE';

export class CollectionPlacementMutationError extends Error {
  constructor(
    public readonly code: CollectionPlacementMutationErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CollectionPlacementMutationError';
  }
}

export type CollectionPlacementStructureSnapshot = Pick<
  CollectionPlacement,
  'docId' | 'collectionId' | 'cardId' | 'parentPlacementId' | 'role' | 'order'
>;

export type CollectionStructureOperation = {
  docId: string;
  kind: 'collection-structure-replace';
  status: 'complete';
  collectionId: string;
  previousRevision: number;
  nextRevision: number;
  beforeFingerprint: string;
  afterFingerprint: string;
  beforePlacements: CollectionPlacementStructureSnapshot[];
  placementCount: number;
  createdAt: number;
};

export type CollectionPlacementMutationPlan = {
  changed: boolean;
  nextRevision: number;
  upserts: CollectionPlacement[];
  deletePlacementIds: string[];
  operation: CollectionStructureOperation | null;
};

function snapshotPlacement(placement: CollectionPlacement): CollectionPlacementStructureSnapshot {
  return {
    docId: placement.docId,
    collectionId: placement.collectionId,
    cardId: placement.cardId,
    parentPlacementId: placement.parentPlacementId ?? null,
    role: placement.role,
    order: placement.order,
  };
}

function compareSnapshots(a: CollectionPlacementStructureSnapshot, b: CollectionPlacementStructureSnapshot): number {
  return a.docId.localeCompare(b.docId);
}

function sameStructure(a: CollectionPlacementStructureSnapshot, b: CollectionPlacementStructureSnapshot): boolean {
  return a.docId === b.docId
    && a.collectionId === b.collectionId
    && a.cardId === b.cardId
    && (a.parentPlacementId ?? null) === (b.parentPlacementId ?? null)
    && a.role === b.role
    && a.order === b.order;
}

function duplicateSiblingOrderIssues(placements: CollectionPlacementStructureSnapshot[]): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  placements.forEach((placement) => {
    const parentKey = placement.parentPlacementId ?? '__root__';
    const key = `${parentKey}:${placement.order}`;
    const existing = seen.get(key);
    if (existing) {
      issues.push(`Placements ${existing} and ${placement.docId} have the same order beneath ${parentKey}.`);
    } else {
      seen.set(key, placement.docId);
    }
  });
  return issues;
}

export function buildCollectionPlacementMutationPlan(args: {
  collection: Collection;
  currentPlacements: CollectionPlacement[];
  proposedPlacements: CollectionPlacementStructureInput[];
  existingCardIds: ReadonlySet<string>;
  expectedStructureRevision: number;
  now: number;
}): CollectionPlacementMutationPlan {
  const {
    collection,
    currentPlacements,
    proposedPlacements,
    existingCardIds,
    expectedStructureRevision,
    now,
  } = args;
  if (collection.recordState !== 'active') {
    throw new CollectionPlacementMutationError(
      'COLLECTION_NOT_ACTIVE',
      'The Collection placement graph is not active for Studio authoring.'
    );
  }
  if (collection.lifecycle === 'published') {
    throw new CollectionPlacementMutationError(
      'COLLECTION_PUBLISHED_LOCKED',
      'Return the Collection to Draft before changing its structure.'
    );
  }
  const currentRevision = collection.structureRevision ?? 0;
  if (expectedStructureRevision !== currentRevision) {
    throw new CollectionPlacementMutationError(
      'COLLECTION_REVISION_CONFLICT',
      `The Collection changed after this Studio view loaded. Expected revision ${expectedStructureRevision}; current revision is ${currentRevision}.`
    );
  }

  const currentById = new Map(currentPlacements.map((placement) => [placement.docId, placement]));
  const proposedSnapshots = proposedPlacements.map((placement) => ({
    docId: placement.docId,
    collectionId: collection.docId,
    cardId: placement.cardId,
    parentPlacementId: placement.parentPlacementId ?? null,
    role: placement.role,
    order: placement.order,
  } satisfies CollectionPlacementStructureSnapshot));
  const graphIssues = validateCollectionPlacementGraph({
    collection,
    placements: proposedSnapshots,
    existingCardIds,
  });
  const orderIssues = duplicateSiblingOrderIssues(proposedSnapshots);
  if (graphIssues.length || orderIssues.length) {
    throw new CollectionPlacementMutationError(
      'COLLECTION_STRUCTURE_INVALID',
      'The proposed Collection structure is invalid.',
      { graphIssues, orderIssues }
    );
  }

  const proposedIds = new Set(proposedSnapshots.map((placement) => placement.docId));
  const deletePlacementIds = currentPlacements
    .map((placement) => placement.docId)
    .filter((placementId) => !proposedIds.has(placementId))
    .sort();
  const upserts = proposedSnapshots.flatMap((snapshot) => {
    const current = currentById.get(snapshot.docId);
    if (current && sameStructure(snapshotPlacement(current), snapshot)) return [];
    return [{
      ...snapshot,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    } satisfies CollectionPlacement];
  });
  if (upserts.length + deletePlacementIds.length + 2 > 450) {
    throw new CollectionPlacementMutationError(
      'COLLECTION_MUTATION_TOO_LARGE',
      'The Collection structure change is too large for one atomic save.',
      { upsertCount: upserts.length, deleteCount: deletePlacementIds.length }
    );
  }
  if (!upserts.length && !deletePlacementIds.length) {
    return {
      changed: false,
      nextRevision: currentRevision,
      upserts: [],
      deletePlacementIds: [],
      operation: null,
    };
  }

  const beforePlacements = currentPlacements.map(snapshotPlacement).sort(compareSnapshots);
  const afterPlacements = proposedSnapshots.sort(compareSnapshots);
  const beforeFingerprint = sha256Json(beforePlacements);
  const afterFingerprint = sha256Json(afterPlacements);
  const nextRevision = currentRevision + 1;
  const operation: CollectionStructureOperation = {
    docId: `structure-${collection.docId}-${nextRevision}-${afterFingerprint.slice(0, 12)}`,
    kind: 'collection-structure-replace',
    status: 'complete',
    collectionId: collection.docId,
    previousRevision: currentRevision,
    nextRevision,
    beforeFingerprint,
    afterFingerprint,
    beforePlacements,
    placementCount: afterPlacements.length,
    createdAt: now,
  };
  if (Buffer.byteLength(JSON.stringify(operation), 'utf8') > 900_000) {
    throw new CollectionPlacementMutationError(
      'COLLECTION_MUTATION_TOO_LARGE',
      'The recoverable Collection operation exceeds the safe document size.'
    );
  }
  return { changed: true, nextRevision, upserts, deletePlacementIds, operation };
}
