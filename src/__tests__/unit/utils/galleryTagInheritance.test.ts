import {
  computeGalleryDimensionTagUnion,
  computeGalleryDimensionRollup,
  computeGalleryInheritanceResult,
  mergeGalleryInheritedCardTags,
  effectiveGalleryInheritanceToggles,
  newCardInheritanceOverrides,
  protectExistingCardInheritance,
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

  it('makes any blank child unreviewed and discards a misleading partial union', () => {
    const resolved = new Map([['who-a', 'who' as const]]);
    expect(computeGalleryDimensionRollup([{ tags: ['who-a'] }, { tags: [] }], 'who', resolved)).toEqual({
      status: 'unreviewed', tagIds: [], implicitSubjectTagIds: [],
    });
  });

  it('does not invent an unreviewed rollup when a card has no Gallery children', () => {
    expect(computeGalleryDimensionRollup([], 'who', new Map())).toEqual({
      status: 'empty', tagIds: [], implicitSubjectTagIds: [],
    });
  });

  it('rolls intentional N/A or Unknown tags like any other tag', () => {
    const resolved = new Map([
      ['who-na', 'who' as const],
      ['who-unknown', 'who' as const],
    ]);
    expect(computeGalleryDimensionRollup([{ tags: ['who-na'] }, { tags: ['who-na'] }], 'who', resolved)).toEqual({
      status: 'reviewed', tagIds: ['who-na'], implicitSubjectTagIds: ['who-na'],
    });
    expect(computeGalleryDimensionRollup([{ tags: ['who-na'] }, { tags: ['who-unknown'] }], 'who', resolved)).toEqual({
      status: 'reviewed', tagIds: ['who-na', 'who-unknown'], implicitSubjectTagIds: [],
    });
  });

  it('stores Unreviewed precedence while preserving protected dimensions', () => {
    const tags = [
      { docId: 'who-a', dimension: 'who' },
      { docId: 'what-old', dimension: 'what' },
    ] as never[];
    expect(computeGalleryInheritanceResult(
      ['what-old'],
      [{ tags: ['who-a'] }, { tags: [] }],
      { who: true, what: false, when: false, where: false },
      tags,
      { who: 'reviewed', what: 'reviewed' }
    )).toEqual({
      tags: ['what-old'],
      statuses: { who: 'unreviewed', what: 'reviewed', when: 'empty', where: 'empty' },
      implicitSubjectTagIds: [],
    });
  });

  it('records a reviewed intentional-tag rollup and an empty rollup', () => {
    const tags = [{ docId: 'who-na', dimension: 'who' }] as never[];
    expect(computeGalleryInheritanceResult(
      [],
      [{ tags: ['who-na'] }],
      { who: true, what: false, when: false, where: false },
      tags
    )).toEqual({
      tags: ['who-na'],
      statuses: { who: 'reviewed', what: 'empty', when: 'empty', where: 'empty' },
      implicitSubjectTagIds: ['who-na'],
    });
    expect(computeGalleryInheritanceResult(
      ['who-na'],
      [],
      { who: true, what: false, when: false, where: false },
      tags
    )).toEqual({
      tags: [],
      statuses: { who: 'empty', what: 'empty', when: 'empty', where: 'empty' },
      implicitSubjectTagIds: [],
    });
  });

  it('protects legacy cards and enables only explicitly selected dimensions for new cards', () => {
    expect(protectExistingCardInheritance()).toEqual({ who: true, what: true, when: true, where: true });
    expect(newCardInheritanceOverrides({
      galleryTagInheritanceConfigured: false,
      galleryTagInheritance: { who: true, what: true, when: true, where: true },
    })).toEqual({ who: true, what: true, when: true, where: true });
    expect(newCardInheritanceOverrides({
      galleryTagInheritanceConfigured: true,
      galleryTagInheritance: { who: true, what: false, when: true, where: false },
    })).toEqual({ who: false, what: true, when: false, where: true });
  });

  it('treats missing overrides as protected and masks enabled settings per dimension', () => {
    const settings = { who: true, what: true, when: false, where: false };
    expect(effectiveGalleryInheritanceToggles(settings, undefined)).toEqual({
      who: false, what: false, when: false, where: false,
    });
    expect(effectiveGalleryInheritanceToggles(settings, { who: false, what: true, when: true, where: true })).toEqual({
      who: true, what: false, when: false, where: false,
    });
  });
});
