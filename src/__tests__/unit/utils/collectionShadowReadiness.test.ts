import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';
import { evaluateCollectionShadowReadiness } from '@/lib/utils/collectionShadowReadiness';

function sourceCards(): Card[] {
  return [
    { docId: 'welcome', title: 'WELCOME', status: 'draft', isCollectionRoot: true, childrenIds: ['chapter'] },
    { docId: 'chapter', title: 'Childhood', status: 'draft', childrenIds: ['story'] },
    { docId: 'story', title: 'First memory', status: 'published' },
  ] as Card[];
}

function fixture() {
  const cards = sourceCards();
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId: 'welcome',
    collectionId: 'my-life',
    collectionTitle: 'My Life',
    now: 0,
  });
  const collection = {
    ...preview.collection,
    legacySourceRootId: 'welcome',
    migrationSourceFingerprint: fingerprintLegacyCollectionSource(cards),
    migrationTargetFingerprint: fingerprintCollectionMigrationPreview(preview),
  } as Collection;
  const placements = preview.placements.map(({ sourcePathIds, ...placement }) => ({
    ...placement,
    migrationSourcePathIds: sourcePathIds,
  }));
  return { cards, preview, collection, placements };
}

describe('evaluateCollectionShadowReadiness', () => {
  it('keeps operational revision and authority fields out of frozen migration identity', () => {
    const { preview } = fixture();
    const base = fingerprintCollectionMigrationPreview(preview);
    expect(fingerprintCollectionMigrationPreview({
      ...preview,
      collection: {
        ...preview.collection,
        structureRevision: 9,
        authorityRevision: 4,
        authorityEstablishedAt: 123,
      },
    })).toBe(base);
  });

  it('is ready only while fingerprints and stored placement parity remain current', () => {
    const { cards, collection, placements } = fixture();
    expect(evaluateCollectionShadowReadiness({
      collection,
      placements,
      sourceCards: cards,
    })).toMatchObject({
      ready: true,
      sourceFingerprintMatches: true,
      targetFingerprintMatches: true,
      parityIssues: [],
      sourceIssueCount: 0,
    });
  });

  it('turns stale when the authoritative legacy hierarchy changes', () => {
    const { cards, collection, placements } = fixture();
    const changedCards = cards.map((card) =>
      card.docId === 'chapter' ? { ...card, childrenIds: [] } : card
    );
    const readiness = evaluateCollectionShadowReadiness({
      collection,
      placements,
      sourceCards: changedCards,
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.sourceFingerprintMatches).toBe(false);
    expect(readiness.targetFingerprintMatches).toBe(false);
    expect(readiness.parityIssues.length).toBeGreaterThan(0);
  });
});
