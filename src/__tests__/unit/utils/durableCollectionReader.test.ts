import type { DurableCollectionStructure } from '@/lib/utils/durableCollectionReader';
import { buildDurableCollectionReaderSelection } from '@/lib/utils/durableCollectionReader';

const structure: DurableCollectionStructure = {
  collection: {
    docId: 'my-life', title: 'My Life', lifecycle: 'draft', recordState: 'active',
    structureRevision: 1, authorityRevision: 1, order: 10, createdAt: 1, updatedAt: 1,
    introductionCardId: 'welcome',
  },
  placements: [
    { docId: 'chapter-a', collectionId: 'my-life', cardId: 'a', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 },
    { docId: 'shared-a', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-a', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
    { docId: 'chapter-b', collectionId: 'my-life', cardId: 'b', role: 'chapter', order: 20, createdAt: 1, updatedAt: 1 },
    { docId: 'shared-b', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-b', role: 'card', order: 10, createdAt: 1, updatedAt: 1 },
  ],
  cards: [
    { docId: 'welcome', title: 'Welcome' },
    { docId: 'a', title: 'First Chapter' },
    { docId: 'b', title: 'Second Chapter' },
    { docId: 'shared', title: 'Shared Story' },
  ],
};

describe('durable Collection Reader selection', () => {
  it('keeps reused Card content as two placement-identified feed entries', () => {
    const selection = buildDurableCollectionReaderSelection(structure);
    expect(selection.title).toBe('My Life');
    expect(selection.introductionCard?.docId).toBe('welcome');
    expect(selection.entries).toEqual([
      { placementId: 'shared-a', card: expect.objectContaining({ docId: 'shared' }) },
      { placementId: 'shared-b', card: expect.objectContaining({ docId: 'shared' }) },
    ]);
  });

  it('selects one nested feed while retaining its placement breadcrumb', () => {
    const selection = buildDurableCollectionReaderSelection(structure, 'shared-b');
    expect(selection.title).toBe('Shared Story');
    expect(selection.breadcrumbs.map((node) => node.placementId)).toEqual(['chapter-b', 'shared-b']);
    expect(selection.entries.map((entry) => entry.placementId)).toEqual(['shared-b']);
  });
});
