/**
 * Post-review step 7d: derived-tag helpers must accept a preloaded catalog so hot
 * transactions (card create/update, tag delete) do not re-fetch the full tags collection.
 */
import {
  calculateDerivedTagData,
  getAllTags,
  mergeDerivedTagsForCardRecord,
} from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/lib/firebase/tagService', () => {
  const actual = jest.requireActual<typeof import('@/lib/firebase/tagService')>(
    '@/lib/firebase/tagService'
  );
  return {
    ...actual,
    getAllTags: jest.fn(),
  };
});

const mockGetAllTags = getAllTags as jest.MockedFunction<typeof getAllTags>;

const sampleCatalog: Tag[] = [
  {
    docId: 'who-child',
    name: 'Child',
    dimension: 'who',
    parentId: 'who-root',
    path: ['who-root'],
    createdAt: 1,
    updatedAt: 1,
    cardCount: 0,
    mediaCount: 0,
  },
  {
    docId: 'who-root',
    name: 'Who',
    dimension: 'who',
    path: [],
    createdAt: 1,
    updatedAt: 1,
    cardCount: 0,
    mediaCount: 0,
  },
];

describe('transaction catalog reads (7d)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculateDerivedTagData does not fetch the catalog when allTags is provided', async () => {
    await calculateDerivedTagData(['who-child'], sampleCatalog);
    expect(mockGetAllTags).not.toHaveBeenCalled();
  });

  it('mergeDerivedTagsForCardRecord does not fetch the catalog when allTags is provided', async () => {
    await mergeDerivedTagsForCardRecord({ tags: ['who-child'] }, undefined, sampleCatalog);
    expect(mockGetAllTags).not.toHaveBeenCalled();
  });
});
