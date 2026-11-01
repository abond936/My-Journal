import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import {
  buildCollectionStructurePromotionPlan,
  CollectionStructurePromotionError,
} from '@/lib/utils/collectionStructurePromotion';

const collection: Collection = {
  docId: 'source', title: 'Source', lifecycle: 'published', recordState: 'active',
  structureRevision: 4, authorityRevision: 1, order: 10, createdAt: 1, updatedAt: 1,
};

function placement(
  docId: string,
  cardId: string,
  role: CollectionPlacement['role'],
  parentPlacementId: string | null,
  order = 10
): CollectionPlacement {
  return { docId, collectionId: 'source', cardId, role, parentPlacementId, order, createdAt: 1, updatedAt: 1 };
}

const placements = [
  placement('part', 'part-card', 'part', null),
  placement('chapter', 'chapter-card', 'chapter', 'part'),
  placement('section', 'section-card', 'section', 'chapter'),
  placement('story', 'story-card', 'card', 'section'),
  placement('other', 'other-card', 'chapter', null, 20),
];

function plan(sourcePlacementId: string) {
  return buildCollectionStructurePromotionPlan({
    sourceCollection: collection,
    sourcePlacements: placements,
    sourcePlacementId,
    expectedStructureRevision: 4,
    targetCollectionId: 'target',
    targetTitle: 'Promoted',
    targetOrder: 20,
    targetPlacementId: (sourceId) => `copy-${sourceId}`,
    existingCardIds: new Set(placements.map((item) => item.cardId)),
    now: 100,
  });
}

describe('buildCollectionStructurePromotionPlan', () => {
  it('uses a promoted Part Card as the introduction and copies only its descendants', () => {
    const result = plan('part');

    expect(result.collection).toMatchObject({
      docId: 'target', title: 'Promoted', introductionCardId: 'part-card',
      lifecycle: 'draft', recordState: 'active', structureRevision: 0,
    });
    expect(result.collection).not.toHaveProperty('audience');
    expect(result.placements).toEqual([
      expect.objectContaining({ docId: 'copy-chapter', cardId: 'chapter-card', parentPlacementId: null, role: 'chapter' }),
      expect.objectContaining({ docId: 'copy-section', cardId: 'section-card', parentPlacementId: 'copy-chapter', role: 'section' }),
      expect.objectContaining({ docId: 'copy-story', cardId: 'story-card', parentPlacementId: 'copy-section', role: 'card' }),
    ]);
    expect(result.placements).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: 'other-card' }),
    ]));
    expect(result.operation.sourceToTargetPlacementIds).toEqual({
      chapter: 'copy-chapter', section: 'copy-section', story: 'copy-story',
    });
  });

  it('re-bases a promoted Chapter so its Sections become legal root Chapters', () => {
    const result = plan('chapter');

    expect(result.collection.introductionCardId).toBe('chapter-card');
    expect(result.placements).toEqual([
      expect.objectContaining({ cardId: 'section-card', parentPlacementId: null, role: 'chapter' }),
      expect.objectContaining({ cardId: 'story-card', parentPlacementId: 'copy-section', role: 'card' }),
    ]);
  });

  it('creates an introduction-only draft when an empty structural placement is promoted', () => {
    const result = buildCollectionStructurePromotionPlan({
      sourceCollection: collection,
      sourcePlacements: [placement('empty', 'empty-card', 'chapter', null)],
      sourcePlacementId: 'empty',
      expectedStructureRevision: 4,
      targetCollectionId: 'target',
      targetTitle: 'Empty',
      targetOrder: 20,
      targetPlacementId: (sourceId) => `copy-${sourceId}`,
      existingCardIds: new Set(['empty-card']),
      now: 100,
    });

    expect(result.collection.introductionCardId).toBe('empty-card');
    expect(result.placements).toEqual([]);
  });

  it('fails closed when the source revision is stale', () => {
    expect(() => buildCollectionStructurePromotionPlan({
      sourceCollection: collection,
      sourcePlacements: placements,
      sourcePlacementId: 'part',
      expectedStructureRevision: 3,
      targetCollectionId: 'target',
      targetTitle: 'Promoted',
      targetOrder: 20,
      targetPlacementId: (sourceId) => `copy-${sourceId}`,
      existingCardIds: new Set(placements.map((item) => item.cardId)),
      now: 100,
    })).toThrow(expect.objectContaining<Partial<CollectionStructurePromotionError>>({
      code: 'SOURCE_COLLECTION_REVISION_CONFLICT',
    }));
  });
});
