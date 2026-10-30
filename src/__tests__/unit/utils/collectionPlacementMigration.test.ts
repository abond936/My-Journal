import type { Card } from '@/lib/types/card';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import { buildCollectionShadowWritePlan } from '@/lib/utils/collectionShadowPlan';
import {
  buildCollectionMigrationPreview,
  buildLegacyCollectionInventory,
  validateCollectionPlacementGraph,
} from '@/lib/utils/collectionPlacementMigration';

function card(docId: string, childrenIds: string[] = [], overrides: Partial<Card> = {}): Card {
  return { docId, title: docId, childrenIds, ...overrides } as Card;
}

describe('Collection contracts', () => {
  it('accepts a durable Collection and a local placement', () => {
    expect(collectionSchema.safeParse({
      docId: 'my-life',
      title: 'My Life',
      lifecycle: 'draft',
      recordState: 'active',
      order: 10,
      createdAt: 1,
      updatedAt: 1,
    }).success).toBe(true);
    expect(collectionPlacementSchema.safeParse({
      docId: 'placement-1',
      collectionId: 'my-life',
      cardId: 'childhood',
      role: 'chapter',
      order: 10,
      createdAt: 1,
      updatedAt: 1,
    }).success).toBe(true);
  });
});

describe('buildCollectionMigrationPreview', () => {
  it('maps a source root to an introduction, Chapters, Sections, and Cards', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [
        card('welcome', ['childhood', 'ending']),
        card('childhood', ['school', 'summer']),
        card('school', ['teacher']),
        card('teacher'),
        card('summer'),
        card('ending'),
      ],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 100,
    });

    expect(preview.collection).toMatchObject({
      docId: 'my-life',
      introductionCardId: 'welcome',
      lifecycle: 'draft',
    });
    expect(preview.placements.map(({ cardId, role, parentPlacementId, order }) => ({
      cardId,
      role,
      parentPlacementId,
      order,
    }))).toEqual([
      { cardId: 'childhood', role: 'chapter', parentPlacementId: null, order: 10 },
      { cardId: 'school', role: 'section', parentPlacementId: 'pl-my-life-0', order: 10 },
      { cardId: 'teacher', role: 'card', parentPlacementId: 'pl-my-life-0-0', order: 10 },
      { cardId: 'summer', role: 'card', parentPlacementId: 'pl-my-life-0', order: 20 },
      { cardId: 'ending', role: 'chapter', parentPlacementId: null, order: 20 },
    ]);
    expect(preview.issues).toEqual([]);
  });

  it('uses one optional Part only when a branch needs the additional bounded depth', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [
        card('welcome', ['adulthood', 'childhood']),
        card('adulthood', ['career']),
        card('career', ['reflection']),
        card('reflection', ['question']),
        card('question'),
        card('childhood', ['memory']),
        card('memory'),
      ],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 100,
    });

    expect(preview.placements.map(({ cardId, role }) => ({ cardId, role }))).toEqual([
      { cardId: 'adulthood', role: 'part' },
      { cardId: 'career', role: 'chapter' },
      { cardId: 'reflection', role: 'section' },
      { cardId: 'question', role: 'card' },
      { cardId: 'childhood', role: 'chapter' },
      { cardId: 'memory', role: 'card' },
    ]);
    expect(preview.issues).toEqual([]);
  });

  it('creates distinct placements for a reused Card without copying Card content', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [
        card('welcome', ['chapter-a', 'chapter-b']),
        card('chapter-a', ['shared']),
        card('chapter-b', ['shared']),
        card('shared'),
      ],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 100,
    });

    const shared = preview.placements.filter((placement) => placement.cardId === 'shared');
    expect(shared).toHaveLength(2);
    expect(new Set(shared.map((placement) => placement.docId)).size).toBe(2);
    expect(preview.reusedCardIds).toEqual(['shared']);
  });

  it('reports structure deeper than Part, Chapter, and Section without unbounded recursion', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [
        card('welcome', ['chapter']),
        card('chapter', ['section']),
        card('section', ['too-deep-parent']),
        card('too-deep-parent', ['deeper-parent']),
        card('deeper-parent', ['leaf']),
        card('leaf'),
      ],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 100,
    });

    expect(preview.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source-depth-conflict', sourceCardId: 'deeper-parent' }),
    ]));
    expect(preview.unresolvedSourceCardIds).toEqual(['deeper-parent', 'leaf']);
  });

  it('allows an empty or one-child Chapter without a minimum-child error', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [card('welcome', ['chapter']), card('chapter', ['only-card']), card('only-card')],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 100,
    });
    expect(preview.issues).toEqual([]);
  });
});

describe('validateCollectionPlacementGraph', () => {
  it('rejects a Section outside a Chapter and children beneath a Card placement', () => {
    const issues = validateCollectionPlacementGraph({
      collection: { docId: 'collection-1' },
      placements: [
        { docId: 'section', collectionId: 'collection-1', cardId: 'a', role: 'section' },
        { docId: 'card', collectionId: 'collection-1', cardId: 'b', role: 'card' },
        { docId: 'child', collectionId: 'collection-1', cardId: 'c', role: 'card', parentPlacementId: 'card' },
      ],
      existingCardIds: new Set(['a', 'b', 'c']),
    });
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'section-parent-not-chapter',
      'card-parent-invalid',
      'card-has-children',
    ]));
  });
});

describe('buildLegacyCollectionInventory', () => {
  it('reports roots, shared Cards, unrooted structure, missing references, and depth', () => {
    const inventory = buildLegacyCollectionInventory([
      card('root', ['a', 'b', 'missing'], { isCollectionRoot: true }),
      card('a', ['shared']),
      card('b', ['shared']),
      card('shared'),
      card('orphan-parent', ['orphan-child']),
      card('orphan-child'),
    ]);
    expect(inventory).toMatchObject({
      totalCards: 6,
      rootIds: ['root'],
      structuralCardCount: 4,
      edgeCount: 6,
      sharedCardIds: ['shared'],
      missingReferenceIds: ['missing'],
      unrootedStructuralCardIds: ['orphan-parent'],
      maximumDepth: 2,
      cycleCount: 0,
    });
  });
});

describe('buildCollectionShadowWritePlan', () => {
  it('creates inactive, draft, provenance-bearing records without changing Card identity', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [card('welcome', ['chapter']), card('chapter', ['story']), card('story')],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 0,
    });
    const sourceFingerprint = 'a'.repeat(64);
    const targetFingerprint = 'b'.repeat(64);
    const plan = buildCollectionShadowWritePlan({
      preview,
      sourceFingerprint,
      targetFingerprint,
      now: 123,
    });

    expect(plan.collection).toMatchObject({
      docId: 'my-life',
      title: 'My Life',
      lifecycle: 'draft',
      recordState: 'shadow',
      legacySourceRootId: 'welcome',
      migrationSourceFingerprint: sourceFingerprint,
      migrationTargetFingerprint: targetFingerprint,
    });
    expect(plan.placements.map((placement) => placement.cardId)).toEqual(['chapter', 'story']);
    expect(plan.placements[0].migrationSourcePathIds).toEqual(['welcome', 'chapter']);
    expect(plan.operation).toMatchObject({
      docId: `shadow-my-life-${targetFingerprint.slice(0, 12)}`,
      placementCount: 2,
      status: 'complete',
    });
  });

  it('refuses an unresolved preview', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [
        card('welcome', ['part']),
        card('part', ['chapter']),
        card('chapter', ['section']),
        card('section', ['too-deep']),
        card('too-deep', ['leaf']),
        card('leaf'),
      ],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 0,
    });
    expect(() => buildCollectionShadowWritePlan({
      preview,
      sourceFingerprint: 'a'.repeat(64),
      targetFingerprint: 'b'.repeat(64),
      now: 123,
    })).toThrow('unresolved migration preview');
  });
});
