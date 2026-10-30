import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import {
  buildReaderCollectionProjection,
  compareStoredPlacementsToPreview,
  flattenReaderCollectionProjection,
} from '@/lib/utils/collectionPlacementProjection';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';

function card(docId: string, childrenIds: string[] = []): Card {
  return { docId, title: docId, childrenIds } as Card;
}

describe('buildReaderCollectionProjection', () => {
  it('uses placement identity so one Card remains visible on two authored paths', () => {
    const collection = {
      docId: 'my-life',
      title: 'My Life',
      lifecycle: 'draft',
      recordState: 'shadow',
      order: 10,
      createdAt: 1,
      updatedAt: 1,
      introductionCardId: 'welcome',
    } as Collection;
    const placements = [
      { docId: 'chapter-a', collectionId: 'my-life', cardId: 'a', role: 'chapter', order: 10 },
      { docId: 'shared-a', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-a', role: 'card', order: 10 },
      { docId: 'chapter-b', collectionId: 'my-life', cardId: 'b', role: 'chapter', order: 20 },
      { docId: 'shared-b', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-b', role: 'card', order: 10 },
    ].map((placement) => ({ createdAt: 1, updatedAt: 1, ...placement } as CollectionPlacement));
    const projection = buildReaderCollectionProjection({
      collection,
      placements,
      cards: [card('welcome'), card('a'), card('b'), card('shared')],
    });
    expect(projection.introductionCard?.docId).toBe('welcome');
    expect(projection.roots.map((node) => node.cardId)).toEqual(['a', 'b']);
    expect(flattenReaderCollectionProjection(projection.roots).map((node) => node.placementId)).toEqual([
      'chapter-a',
      'shared-a',
      'chapter-b',
      'shared-b',
    ]);
    expect(projection.nodesByPlacementId.get('shared-a')?.card).toBe(
      projection.nodesByPlacementId.get('shared-b')?.card
    );
  });
});

describe('compareStoredPlacementsToPreview', () => {
  it('accepts exact stored placement parity and reports a changed role', () => {
    const preview = buildCollectionMigrationPreview({
      cards: [card('welcome', ['chapter']), card('chapter', ['story']), card('story')],
      sourceRootId: 'welcome',
      collectionId: 'my-life',
      collectionTitle: 'My Life',
      now: 0,
    });
    const stored = preview.placements.map(({ sourcePathIds, ...placement }) => ({
      ...placement,
      migrationSourcePathIds: sourcePathIds,
    }));
    expect(compareStoredPlacementsToPreview({ placements: stored, preview })).toEqual([]);
    expect(compareStoredPlacementsToPreview({
      placements: stored.map((placement, index) => index === 0 ? { ...placement, role: 'card' } : placement),
      preview,
    })).toEqual([expect.stringContaining('differs in role')]);
  });
});
