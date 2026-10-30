import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement, CollectionPlacementRole } from '@/lib/types/collection';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

export type CollectionPlacementIssueCode =
  | 'collection-mismatch'
  | 'duplicate-placement-id'
  | 'missing-card'
  | 'missing-parent-placement'
  | 'part-has-parent'
  | 'chapter-parent-invalid'
  | 'section-parent-not-chapter'
  | 'card-parent-invalid'
  | 'card-has-children'
  | 'placement-cycle'
  | 'source-cycle'
  | 'source-depth-conflict';

export type CollectionPlacementIssue = {
  code: CollectionPlacementIssueCode;
  message: string;
  placementId?: string;
  sourceCardId?: string;
  sourcePathIds?: string[];
};

export type CollectionMigrationPlacementPreview = CollectionPlacement & {
  sourcePathIds: string[];
};

export type CollectionMigrationPreview = {
  collection: Collection;
  placements: CollectionMigrationPlacementPreview[];
  issues: CollectionPlacementIssue[];
  reusedCardIds: string[];
  unresolvedSourceCardIds: string[];
};

export type LegacyCollectionInventory = {
  totalCards: number;
  rootIds: string[];
  structuralCardCount: number;
  edgeCount: number;
  reachableCardIds: string[];
  unrootedStructuralCardIds: string[];
  sharedCardIds: string[];
  missingReferenceIds: string[];
  cycleCount: number;
  maximumDepth: number;
  singleChildStructuralCardIds: string[];
};

function safeIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'collection';
}

function previewPlacementId(collectionId: string, pathIndexes: number[]): string {
  return `pl-${safeIdPart(collectionId)}-${pathIndexes.join('-')}`;
}

function nextRole(
  parentRole: CollectionPlacementRole | null,
  childHasChildren: boolean,
  branchDepth: number
): CollectionPlacementRole {
  if (parentRole === null) return branchDepth >= 3 ? 'part' : 'chapter';
  if (parentRole === 'part') return childHasChildren ? 'chapter' : 'card';
  if (parentRole === 'chapter') return childHasChildren ? 'section' : 'card';
  return 'card';
}

function sourceBranchDepth(byId: Map<string, Card>, cardId: string, path: Set<string> = new Set()): number {
  if (path.has(cardId)) return Number.POSITIVE_INFINITY;
  const card = byId.get(cardId);
  if (!card) return 0;
  const childIds = normalizeCuratedChildIds(card.childrenIds);
  if (!childIds.length) return 0;
  const nextPath = new Set(path);
  nextPath.add(cardId);
  return 1 + Math.max(...childIds.map((childId) => sourceBranchDepth(byId, childId, nextPath)));
}

export function validateCollectionPlacementGraph(args: {
  collection: Pick<Collection, 'docId'>;
  placements: Array<Pick<CollectionPlacement, 'docId' | 'collectionId' | 'cardId' | 'parentPlacementId' | 'role'>>;
  existingCardIds?: ReadonlySet<string>;
}): CollectionPlacementIssue[] {
  const { collection, placements, existingCardIds } = args;
  const issues: CollectionPlacementIssue[] = [];
  const byId = new Map<string, (typeof placements)[number]>();

  for (const placement of placements) {
    if (byId.has(placement.docId)) {
      issues.push({
        code: 'duplicate-placement-id',
        placementId: placement.docId,
        message: `Placement ${placement.docId} appears more than once.`,
      });
      continue;
    }
    byId.set(placement.docId, placement);
    if (placement.collectionId !== collection.docId) {
      issues.push({
        code: 'collection-mismatch',
        placementId: placement.docId,
        message: `Placement ${placement.docId} belongs to another Collection.`,
      });
    }
    if (existingCardIds && !existingCardIds.has(placement.cardId)) {
      issues.push({
        code: 'missing-card',
        placementId: placement.docId,
        message: `Placement ${placement.docId} references missing Card ${placement.cardId}.`,
      });
    }
  }

  const childCountByParent = new Map<string, number>();
  for (const placement of placements) {
    const parentId = placement.parentPlacementId ?? null;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parentId) {
      childCountByParent.set(parentId, (childCountByParent.get(parentId) ?? 0) + 1);
      if (!parent) {
        issues.push({
          code: 'missing-parent-placement',
          placementId: placement.docId,
          message: `Placement ${placement.docId} references missing parent ${parentId}.`,
        });
      }
    }
    if (placement.role === 'part' && parentId) {
      issues.push({
        code: 'part-has-parent',
        placementId: placement.docId,
        message: `Part ${placement.docId} must be at Collection level.`,
      });
    }
    if (placement.role === 'chapter' && parent && parent.role !== 'part') {
      issues.push({
        code: 'chapter-parent-invalid',
        placementId: placement.docId,
        message: `Chapter ${placement.docId} must be at Collection level or beneath a Part.`,
      });
    }
    if (placement.role === 'section' && parent?.role !== 'chapter') {
      issues.push({
        code: 'section-parent-not-chapter',
        placementId: placement.docId,
        message: `Section ${placement.docId} must be beneath a Chapter.`,
      });
    }
    if (placement.role === 'card' && parent && parent.role === 'card') {
      issues.push({
        code: 'card-parent-invalid',
        placementId: placement.docId,
        message: `Card placement ${placement.docId} cannot be beneath another Card placement.`,
      });
    }
  }

  for (const placement of placements) {
    if (placement.role === 'card' && (childCountByParent.get(placement.docId) ?? 0) > 0) {
      issues.push({
        code: 'card-has-children',
        placementId: placement.docId,
        message: `Card placement ${placement.docId} cannot have children.`,
      });
    }
    const seen = new Set<string>();
    let current: (typeof placements)[number] | undefined = placement;
    while (current?.parentPlacementId) {
      if (seen.has(current.docId)) {
        issues.push({
          code: 'placement-cycle',
          placementId: placement.docId,
          message: `Placement ${placement.docId} participates in a cycle.`,
        });
        break;
      }
      seen.add(current.docId);
      current = byId.get(current.parentPlacementId);
    }
  }

  return issues;
}

export function buildCollectionMigrationPreview(args: {
  cards: Card[];
  sourceRootId: string;
  collectionId: string;
  collectionTitle: string;
  now?: number;
}): CollectionMigrationPreview {
  const { cards, sourceRootId, collectionId, collectionTitle, now = Date.now() } = args;
  const byId = new Map(cards.filter((card) => card.docId).map((card) => [card.docId!, card]));
  const sourceRoot = byId.get(sourceRootId);
  if (!sourceRoot) throw new Error(`Source root Card ${sourceRootId} was not found.`);

  const placements: CollectionMigrationPlacementPreview[] = [];
  const issues: CollectionPlacementIssue[] = [];
  const unresolvedSourceCardIds = new Set<string>();
  const occurrenceCounts = new Map<string, number>();

  const visit = (params: {
    cardId: string;
    parentPlacementId: string | null;
    parentRole: CollectionPlacementRole | null;
    pathIds: string[];
    pathIndexes: number[];
    order: number;
  }) => {
    const { cardId, parentPlacementId, parentRole, pathIds, pathIndexes, order } = params;
    const card = byId.get(cardId);
    const sourcePathIds = [...pathIds, cardId];
    if (!card) {
      unresolvedSourceCardIds.add(cardId);
      issues.push({
        code: 'missing-card',
        sourceCardId: cardId,
        sourcePathIds,
        message: `Legacy path references missing Card ${cardId}.`,
      });
      return;
    }
    if (pathIds.includes(cardId)) {
      unresolvedSourceCardIds.add(cardId);
      issues.push({
        code: 'source-cycle',
        sourceCardId: cardId,
        sourcePathIds,
        message: `Legacy path contains a cycle at Card ${cardId}.`,
      });
      return;
    }

    const childIds = normalizeCuratedChildIds(card.childrenIds);
    const branchDepth = sourceBranchDepth(byId, cardId);
    const role = nextRole(parentRole, childIds.length > 0, branchDepth);
    const docId = previewPlacementId(collectionId, pathIndexes);
    placements.push({
      docId,
      collectionId,
      cardId,
      parentPlacementId,
      role,
      order,
      createdAt: now,
      updatedAt: now,
      sourcePathIds,
    });
    occurrenceCounts.set(cardId, (occurrenceCounts.get(cardId) ?? 0) + 1);

    if (role === 'card' && childIds.length > 0) {
      unresolvedSourceCardIds.add(cardId);
      childIds.forEach((childId) => unresolvedSourceCardIds.add(childId));
      issues.push({
        code: 'source-depth-conflict',
        placementId: docId,
        sourceCardId: cardId,
        sourcePathIds,
        message: `Legacy Card ${cardId} has children below the supported Section depth.`,
      });
      return;
    }

    childIds.forEach((childId, index) => {
      visit({
        cardId: childId,
        parentPlacementId: docId,
        parentRole: role,
        pathIds: sourcePathIds,
        pathIndexes: [...pathIndexes, index],
        order: (index + 1) * 10,
      });
    });
  };

  normalizeCuratedChildIds(sourceRoot.childrenIds).forEach((childId, index) => {
    visit({
      cardId: childId,
      parentPlacementId: null,
      parentRole: null,
      pathIds: [sourceRootId],
      pathIndexes: [index],
      order: (index + 1) * 10,
    });
  });

  const collection: Collection = {
    docId: collectionId,
    title: collectionTitle,
    introductionCardId: sourceRootId,
    lifecycle: 'draft',
    recordState: 'shadow',
    structureRevision: 0,
    order: 10,
    createdAt: now,
    updatedAt: now,
  };
  issues.push(...validateCollectionPlacementGraph({
    collection,
    placements,
    existingCardIds: new Set(byId.keys()),
  }));

  return {
    collection,
    placements,
    issues,
    reusedCardIds: [...occurrenceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([cardId]) => cardId)
      .sort(),
    unresolvedSourceCardIds: [...unresolvedSourceCardIds].sort(),
  };
}

export function buildLegacyCollectionInventory(cards: Card[]): LegacyCollectionInventory {
  const byId = new Map(cards.filter((card) => card.docId).map((card) => [card.docId!, card]));
  const rootIds = cards.filter((card) => card.docId && card.isCollectionRoot === true).map((card) => card.docId!);
  const parentIdsByChild = new Map<string, string[]>();
  const missingReferenceIds = new Set<string>();
  let edgeCount = 0;
  for (const card of cards) {
    if (!card.docId) continue;
    for (const childId of normalizeCuratedChildIds(card.childrenIds)) {
      edgeCount += 1;
      if (!byId.has(childId)) missingReferenceIds.add(childId);
      const parents = parentIdsByChild.get(childId) ?? [];
      parents.push(card.docId);
      parentIdsByChild.set(childId, parents);
    }
  }

  const reachable = new Set<string>();
  let cycleCount = 0;
  let maximumDepth = -1;
  const visit = (cardId: string, depth: number, path: Set<string>) => {
    if (path.has(cardId)) {
      cycleCount += 1;
      return;
    }
    const card = byId.get(cardId);
    if (!card) return;
    reachable.add(cardId);
    maximumDepth = Math.max(maximumDepth, depth);
    const nextPath = new Set(path);
    nextPath.add(cardId);
    normalizeCuratedChildIds(card.childrenIds).forEach((childId) => visit(childId, depth + 1, nextPath));
  };
  rootIds.forEach((rootId) => visit(rootId, 0, new Set()));

  const structuralCards = cards.filter((card) => normalizeCuratedChildIds(card.childrenIds).length > 0);
  return {
    totalCards: cards.length,
    rootIds: [...rootIds].sort(),
    structuralCardCount: structuralCards.length,
    edgeCount,
    reachableCardIds: [...reachable].sort(),
    unrootedStructuralCardIds: structuralCards
      .map((card) => card.docId!)
      .filter((cardId) => !reachable.has(cardId))
      .sort(),
    sharedCardIds: [...parentIdsByChild.entries()]
      .filter(([, parentIds]) => parentIds.length > 1)
      .map(([cardId]) => cardId)
      .sort(),
    missingReferenceIds: [...missingReferenceIds].sort(),
    cycleCount,
    maximumDepth,
    singleChildStructuralCardIds: structuralCards
      .filter((card) => normalizeCuratedChildIds(card.childrenIds).length === 1)
      .map((card) => card.docId!)
      .sort(),
  };
}
