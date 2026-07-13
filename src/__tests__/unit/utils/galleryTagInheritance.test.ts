import {
  computeGalleryDimensionTagUnion,
  mergeGalleryInheritedCardTags,
} from '@/lib/utils/galleryTagInheritance';
import type { Tag } from '@/lib/types/tag';
import { DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES } from '@/lib/types/authorSettings';

const tags: Tag[] = [
  { docId: 'who-a', name: 'Alan', dimension: 'who', path: ['who-a'] },
  { docId: 'who-b', name: 'Bob', dimension: 'who', path: ['who-b'] },
  { docId: 'what-x', name: 'Party', dimension: 'what', path: ['what-x'] },
  { docId: 'when-y', name: '2020', dimension: 'when', path: ['when-y'] },
];

describe('galleryTagInheritance', () => {
  it('computes deduped union per dimension from gallery media', () => {
    const resolved = new Map([
      ['who-a', 'who' as const],
      ['who-b', 'who' as const],
      ['what-x', 'what' as const],
    ]);
    expect(
      computeGalleryDimensionTagUnion(
        [{ tags: ['who-a'] }, { tags: ['who-a', 'who-b'] }],
        'who',
        resolved
      )
    ).toEqual(['who-a', 'who-b']);
  });

  it('replaces enabled dimensions only when toggles are on', () => {
    const current = ['who-a', 'what-x', 'when-y'];
    const gallery = [{ tags: ['who-b', 'what-x'] }, { tags: ['who-b'] }];

    const next = mergeGalleryInheritedCardTags(
      current,
      gallery,
      { ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES, who: true },
      tags
    );

    expect(next).toEqual(['what-x', 'when-y', 'who-b']);
  });

  it('clears a dimension on the card when gallery has no tags for it and toggle is on', () => {
    const current = ['who-a', 'what-x'];
    const gallery = [{ tags: ['who-b'] }];

    const next = mergeGalleryInheritedCardTags(
      current,
      gallery,
      { ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES, who: true, what: true },
      tags
    );

    expect(next).toEqual(['who-b']);
  });

  it('leaves card tags unchanged when all toggles are off', () => {
    const current = ['who-a', 'what-x'];
    const gallery = [{ tags: ['who-b'] }];

    const next = mergeGalleryInheritedCardTags(
      current,
      gallery,
      DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
      tags
    );

    expect(next).toEqual(['what-x', 'who-a']);
  });
});
