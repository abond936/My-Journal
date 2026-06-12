import {
  projectTagForApiResponse,
  projectTagsForApiResponse,
} from '@/lib/api/tagApiProjection';
import type { Tag } from '@/lib/types/tag';

const sampleTag: Tag = {
  docId: 'tag-1',
  name: 'Travel',
  dimension: 'what',
  parentId: undefined,
  path: [],
  order: 1,
  cardCount: 12,
  mediaCount: 4,
  uniqueCardIds: ['card-a', 'card-b'],
  uniqueMediaIds: ['media-a'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('tag API projection (8c)', () => {
  it('preserves operational count fields for admin responses', () => {
    const projected = projectTagForApiResponse(sampleTag, true);
    expect(projected.cardCount).toBe(12);
    expect(projected.mediaCount).toBe(4);
    expect(projected.uniqueCardIds).toEqual(['card-a', 'card-b']);
    expect(projected.uniqueMediaIds).toEqual(['media-a']);
  });

  it('omits operational count fields for viewer responses', () => {
    const projected = projectTagForApiResponse(sampleTag, false);
    expect(projected.docId).toBe('tag-1');
    expect(projected.name).toBe('Travel');
    expect(projected.dimension).toBe('what');
    expect(projected).not.toHaveProperty('cardCount');
    expect(projected).not.toHaveProperty('mediaCount');
    expect(projected).not.toHaveProperty('uniqueCardIds');
    expect(projected).not.toHaveProperty('uniqueMediaIds');
  });

  it('projectTagsForApiResponse maps list projection consistently', () => {
    const adminTags = projectTagsForApiResponse([sampleTag], true);
    const viewerTags = projectTagsForApiResponse([sampleTag], false);

    expect(adminTags[0].cardCount).toBe(12);
    expect(viewerTags[0]).not.toHaveProperty('cardCount');
    expect(viewerTags[0]).not.toHaveProperty('uniqueMediaIds');
  });
});
