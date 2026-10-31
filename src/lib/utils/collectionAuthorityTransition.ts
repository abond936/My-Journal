import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement, CollectionRecordState } from '@/lib/types/collection';
import { evaluateCollectionShadowReadiness } from '@/lib/utils/collectionShadowReadiness';
import { validateCollectionPlacementGraph } from '@/lib/utils/collectionPlacementMigration';

export type CollectionAuthorityTransitionErrorCode =
  | 'COLLECTION_AUTHORITY_CONFLICT'
  | 'COLLECTION_PUBLISHED_LOCKED'
  | 'COLLECTION_ACTIVATION_NOT_READY';

export class CollectionAuthorityTransitionError extends Error {
  constructor(
    public readonly code: CollectionAuthorityTransitionErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CollectionAuthorityTransitionError';
  }
}

export type CollectionAuthorityOperation = {
  docId: string;
  kind: 'collection-authority-transition';
  status: 'complete';
  collectionId: string;
  previousState: CollectionRecordState;
  nextState: CollectionRecordState;
  previousAuthorityRevision: number;
  nextAuthorityRevision: number;
  structureRevision: number;
  initialActivation: boolean;
  readiness: ReturnType<typeof evaluateCollectionShadowReadiness> | null;
  createdAt: number;
};

export type CollectionAuthorityTransitionPlan = {
  changed: boolean;
  nextAuthorityRevision: number;
  patch: {
    recordState: CollectionRecordState;
    authorityRevision: number;
    authorityEstablishedAt?: number;
    updatedAt: number;
  } | null;
  operation: CollectionAuthorityOperation | null;
};

export function buildCollectionAuthorityTransitionPlan(args: {
  collection: Collection;
  placements: CollectionPlacement[];
  sourceCards: Card[];
  desiredState: CollectionRecordState;
  expectedStructureRevision: number;
  expectedAuthorityRevision: number;
  now: number;
}): CollectionAuthorityTransitionPlan {
  const {
    collection,
    placements,
    sourceCards,
    desiredState,
    expectedStructureRevision,
    expectedAuthorityRevision,
    now,
  } = args;
  if (
    collection.structureRevision !== expectedStructureRevision
    || collection.authorityRevision !== expectedAuthorityRevision
  ) {
    throw new CollectionAuthorityTransitionError(
      'COLLECTION_AUTHORITY_CONFLICT',
      'The Collection changed after this authority transition was prepared.',
      {
        expectedStructureRevision,
        currentStructureRevision: collection.structureRevision,
        expectedAuthorityRevision,
        currentAuthorityRevision: collection.authorityRevision,
      }
    );
  }
  if (collection.recordState === desiredState) {
    return {
      changed: false,
      nextAuthorityRevision: collection.authorityRevision,
      patch: null,
      operation: null,
    };
  }
  if (collection.lifecycle === 'published') {
    throw new CollectionAuthorityTransitionError(
      'COLLECTION_PUBLISHED_LOCKED',
      'Return the Collection to Draft before changing durable authority.'
    );
  }

  let readiness: ReturnType<typeof evaluateCollectionShadowReadiness> | null = null;
  const initialActivation = desiredState === 'active' && !collection.authorityEstablishedAt;
  if (desiredState === 'active') {
    if (initialActivation) {
      readiness = evaluateCollectionShadowReadiness({ collection, placements, sourceCards });
      if (!readiness.ready) {
        throw new CollectionAuthorityTransitionError(
          'COLLECTION_ACTIVATION_NOT_READY',
          'The shadow Collection no longer matches its approved legacy source and cannot be activated.',
          readiness
        );
      }
    } else {
      const graphIssues = validateCollectionPlacementGraph({
        collection,
        placements,
        existingCardIds: new Set(sourceCards.flatMap((card) => card.docId ? [card.docId] : [])),
      });
      if (graphIssues.length) {
        throw new CollectionAuthorityTransitionError(
          'COLLECTION_ACTIVATION_NOT_READY',
          'The durable Collection graph is invalid and cannot resume authority.',
          { graphIssues }
        );
      }
    }
  }

  const nextAuthorityRevision = collection.authorityRevision + 1;
  const patch = {
    recordState: desiredState,
    authorityRevision: nextAuthorityRevision,
    ...(initialActivation ? { authorityEstablishedAt: now } : {}),
    updatedAt: now,
  };
  const operation: CollectionAuthorityOperation = {
    docId: `authority-${collection.docId}-${nextAuthorityRevision}-${desiredState}`,
    kind: 'collection-authority-transition',
    status: 'complete',
    collectionId: collection.docId,
    previousState: collection.recordState,
    nextState: desiredState,
    previousAuthorityRevision: collection.authorityRevision,
    nextAuthorityRevision,
    structureRevision: collection.structureRevision,
    initialActivation,
    readiness,
    createdAt: now,
  };
  return { changed: true, nextAuthorityRevision, patch, operation };
}
