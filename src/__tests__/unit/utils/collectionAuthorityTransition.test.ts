import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import {
  buildCollectionAuthorityTransitionPlan,
  CollectionAuthorityTransitionError,
} from '@/lib/utils/collectionAuthorityTransition';

function fixture() {
  const cards = [
    { docId: 'welcome', title: 'WELCOME', status: 'draft', isCollectionRoot: true, childrenIds: ['chapter'] },
    { docId: 'chapter', title: 'Childhood', status: 'published' },
  ] as Card[];
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId: 'welcome',
    collectionId: 'my-life',
    collectionTitle: 'My Life',
    now: 0,
  });
  const collection = {
    ...preview.collection,
    recordState: 'shadow',
    structureRevision: 0,
    authorityRevision: 0,
    legacySourceRootId: 'welcome',
    migrationSourceFingerprint: fingerprintLegacyCollectionSource(cards),
    migrationTargetFingerprint: fingerprintCollectionMigrationPreview(preview),
  } as Collection;
  const placements = preview.placements.map(({ sourcePathIds, ...placement }) => ({
    ...placement,
    migrationSourcePathIds: sourcePathIds,
  }));
  return { cards, collection, placements };
}

describe('Collection authority transition planner', () => {
  it('activates a current first-generation shadow with a revisioned recovery operation', () => {
    const { cards, collection, placements } = fixture();
    const plan = buildCollectionAuthorityTransitionPlan({
      collection,
      placements,
      sourceCards: cards,
      desiredState: 'active',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 0,
      now: 100,
    });
    expect(plan).toMatchObject({
      changed: true,
      nextAuthorityRevision: 1,
      patch: {
        recordState: 'active',
        authorityRevision: 1,
        authorityEstablishedAt: 100,
      },
      operation: {
        previousState: 'shadow',
        nextState: 'active',
        initialActivation: true,
        readiness: { ready: true },
      },
    });
  });

  it('refuses first activation when the legacy hierarchy no longer matches', () => {
    const { cards, collection, placements } = fixture();
    const changedCards = cards.map((card) => card.docId === 'welcome' ? { ...card, childrenIds: [] } : card);
    expect(() => buildCollectionAuthorityTransitionPlan({
      collection,
      placements,
      sourceCards: changedCards,
      desiredState: 'active',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 0,
      now: 100,
    })).toThrow(CollectionAuthorityTransitionError);
  });

  it('rolls back the selector without deleting the established authority evidence', () => {
    const { collection, placements } = fixture();
    const active = { ...collection, recordState: 'active', authorityRevision: 1, authorityEstablishedAt: 100 } as Collection;
    const plan = buildCollectionAuthorityTransitionPlan({
      collection: active,
      placements,
      sourceCards: [],
      desiredState: 'shadow',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 1,
      now: 200,
    });
    expect(plan.patch).toEqual({ recordState: 'shadow', authorityRevision: 2, updatedAt: 200 });
    expect(plan.operation).toMatchObject({ initialActivation: false, previousState: 'active', nextState: 'shadow' });
  });

  it('requires Draft before changing established durable authority', () => {
    const { collection, placements } = fixture();
    const active = {
      ...collection,
      lifecycle: 'published',
      recordState: 'active',
      authorityRevision: 1,
      authorityEstablishedAt: 100,
    } as Collection;
    expect(() => buildCollectionAuthorityTransitionPlan({
      collection: active,
      placements,
      sourceCards: [],
      desiredState: 'shadow',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 1,
      now: 200,
    })).toThrow(expect.objectContaining<Partial<CollectionAuthorityTransitionError>>({
      code: 'COLLECTION_PUBLISHED_LOCKED',
    }));
  });

  it('allows a validated durable graph to resume authority after rollback without requiring legacy parity', () => {
    const { cards, collection, placements } = fixture();
    const established = { ...collection, authorityRevision: 2, authorityEstablishedAt: 100 } as Collection;
    const plan = buildCollectionAuthorityTransitionPlan({
      collection: established,
      placements,
      sourceCards: cards.map((card) => card.docId === 'welcome' ? { ...card, childrenIds: [] } : card),
      desiredState: 'active',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 2,
      now: 300,
    });
    expect(plan.patch).toEqual({ recordState: 'active', authorityRevision: 3, updatedAt: 300 });
    expect(plan.operation).toMatchObject({ initialActivation: false, readiness: null });
  });

  it('fails closed on stale structure or authority revisions', () => {
    const { cards, collection, placements } = fixture();
    expect(() => buildCollectionAuthorityTransitionPlan({
      collection,
      placements,
      sourceCards: cards,
      desiredState: 'active',
      expectedStructureRevision: 1,
      expectedAuthorityRevision: 0,
      now: 100,
    })).toThrow('changed after this authority transition was prepared');
  });
});
