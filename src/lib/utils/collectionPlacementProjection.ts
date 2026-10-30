import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement, CollectionPlacementRole } from '@/lib/types/collection';
import type { CollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import { validateCollectionPlacementGraph } from '@/lib/utils/collectionPlacementMigration';

export type ReaderCollectionPlacementNode = {
  placementId: string;
  collectionId: string;
  cardId: string;
  parentPlacementId: string | null;
  role: CollectionPlacementRole;
  order: number;
  card: Card;
  children: ReaderCollectionPlacementNode[];
};

export type ReaderCollectionProjection = {
  collection: Collection;
  introductionCard: Card | null;
  roots: ReaderCollectionPlacementNode[];
  nodesByPlacementId: Map<string, ReaderCollectionPlacementNode>;
};

function compareNodes(a: Pick<CollectionPlacement, 'order' | 'docId'>, b: Pick<CollectionPlacement, 'order' | 'docId'>) {
  return a.order - b.order || a.docId.localeCompare(b.docId);
}

export function buildReaderCollectionProjection(args: {
  collection: Collection;
  placements: CollectionPlacement[];
  cards: Card[];
}): ReaderCollectionProjection {
  const { collection, placements, cards } = args;
  const cardsById = new Map(cards.filter((card) => card.docId).map((card) => [card.docId!, card]));
  const graphIssues = validateCollectionPlacementGraph({
    collection,
    placements,
    existingCardIds: new Set(cardsById.keys()),
  });
  if (graphIssues.length) {
    throw new Error(`Collection placement graph is invalid: ${graphIssues.map((issue) => issue.message).join(' ')}`);
  }

  const nodesByPlacementId = new Map<string, ReaderCollectionPlacementNode>();
  [...placements].sort(compareNodes).forEach((placement) => {
    const card = cardsById.get(placement.cardId);
    if (!card) throw new Error(`Placement ${placement.docId} references missing Card ${placement.cardId}.`);
    nodesByPlacementId.set(placement.docId, {
      placementId: placement.docId,
      collectionId: placement.collectionId,
      cardId: placement.cardId,
      parentPlacementId: placement.parentPlacementId ?? null,
      role: placement.role,
      order: placement.order,
      card,
      children: [],
    });
  });

  const roots: ReaderCollectionPlacementNode[] = [];
  [...placements].sort(compareNodes).forEach((placement) => {
    const node = nodesByPlacementId.get(placement.docId)!;
    if (!placement.parentPlacementId) roots.push(node);
    else nodesByPlacementId.get(placement.parentPlacementId)!.children.push(node);
  });
  nodesByPlacementId.forEach((node) => node.children.sort((a, b) => a.order - b.order || a.placementId.localeCompare(b.placementId)));

  return {
    collection,
    introductionCard: collection.introductionCardId
      ? cardsById.get(collection.introductionCardId) ?? null
      : null,
    roots,
    nodesByPlacementId,
  };
}

export function flattenReaderCollectionProjection(
  roots: ReaderCollectionPlacementNode[]
): ReaderCollectionPlacementNode[] {
  const result: ReaderCollectionPlacementNode[] = [];
  const visit = (node: ReaderCollectionPlacementNode) => {
    result.push(node);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return result;
}

export function compareStoredPlacementsToPreview(args: {
  placements: CollectionPlacement[];
  preview: CollectionMigrationPreview;
}): string[] {
  const { placements, preview } = args;
  const issues: string[] = [];
  const actualById = new Map(placements.map((placement) => [placement.docId, placement]));
  const expectedById = new Map(preview.placements.map((placement) => [placement.docId, placement]));
  if (actualById.size !== expectedById.size) {
    issues.push(`Placement count differs: expected ${expectedById.size}, received ${actualById.size}.`);
  }
  for (const [placementId, expected] of expectedById) {
    const actual = actualById.get(placementId);
    if (!actual) {
      issues.push(`Missing stored placement ${placementId}.`);
      continue;
    }
    const comparisons: Array<[string, unknown, unknown]> = [
      ['collectionId', expected.collectionId, actual.collectionId],
      ['cardId', expected.cardId, actual.cardId],
      ['parentPlacementId', expected.parentPlacementId ?? null, actual.parentPlacementId ?? null],
      ['role', expected.role, actual.role],
      ['order', expected.order, actual.order],
      ['migrationSourcePathIds', expected.sourcePathIds, actual.migrationSourcePathIds],
    ];
    comparisons.forEach(([field, expectedValue, actualValue]) => {
      if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        issues.push(`Placement ${placementId} differs in ${field}.`);
      }
    });
  }
  for (const placementId of actualById.keys()) {
    if (!expectedById.has(placementId)) issues.push(`Unexpected stored placement ${placementId}.`);
  }
  return issues;
}
