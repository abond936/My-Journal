import type { Media } from '@/lib/types/photo';
import { mediaMatchesSearch } from '@/lib/utils/mediaAssignmentSeek';

function buildMedia(overrides: Partial<Media> = {}): Media {
  return {
    docId: 'media-1',
    filename: 'family-photo.jpg',
    width: 1200,
    height: 800,
    size: 1024,
    contentType: 'image/jpeg',
    storageUrl: 'https://example.test/family-photo.jpg',
    storagePath: 'images/family-photo.jpg',
    source: 'local',
    sourcePath: '/albums/1998/family-photo.jpg',
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}

describe('mediaMatchesSearch', () => {
  it('matches caption text', () => {
    const item = buildMedia({ caption: 'Picnic at the lake' });

    expect(mediaMatchesSearch(item, 'picnic')).toBe(true);
    expect(mediaMatchesSearch(item, 'mountain')).toBe(false);
  });

  it('matches tag names when a lookup is provided', () => {
    const item = buildMedia({
      tags: ['tag-family'],
      filterTags: { 'tag-family': true, 'tag-ancestor': true },
    });
    const tagNameLookup = new Map<string, string>([
      ['tag-family', 'Family'],
      ['tag-ancestor', 'Reunion'],
    ]);

    expect(mediaMatchesSearch(item, 'family', tagNameLookup)).toBe(true);
    expect(mediaMatchesSearch(item, 'reunion', tagNameLookup)).toBe(true);
    expect(mediaMatchesSearch(item, 'reunion')).toBe(false);
  });
});
