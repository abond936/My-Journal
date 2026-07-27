import {
  computeGalleryDimensionTagUnion,
  computeGalleryDimensionRollup,
  computeGalleryInheritanceResult,
  computeGalleryTemporalRollup,
  galleryMediaMembershipChanged,
  mergeGalleryInheritedCardTags,
  effectiveGalleryInheritanceToggles,
  newCardInheritanceOverrides,
  protectExistingCardInheritance,
  resolveNewCardInheritanceOverrides,
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
    expect(computeGalleryDimensionRollup([
      { tags: ['who-a'], dimensionReview: { who: { reviewed: true } } },
      { tags: [] },
    ], 'who', resolved)).toEqual({
      status: 'unreviewed', tagIds: [], implicitSubjectTagIds: [], resolution: null,
    });
  });

  it('does not invent an unreviewed rollup when a card has no Gallery children', () => {
    expect(computeGalleryDimensionRollup([], 'who', new Map())).toEqual({
      status: 'empty', tagIds: [], implicitSubjectTagIds: [], resolution: null,
    });
  });

  it('rolls reviewed N/A and rejects conflicting reviewed resolutions', () => {
    const resolved = new Map();
    expect(computeGalleryDimensionRollup([
      { dimensionReview: { who: { reviewed: true, resolution: 'not_applicable' } } },
      { dimensionReview: { who: { reviewed: true, resolution: 'not_applicable' } } },
    ], 'who', resolved)).toEqual({
      status: 'reviewed',
      tagIds: [],
      implicitSubjectTagIds: [],
      resolution: 'not_applicable',
    });
    expect(computeGalleryDimensionRollup([
      { dimensionReview: { who: { reviewed: true, resolution: 'not_applicable' } } },
      { dimensionReview: { who: { reviewed: true, resolution: 'unknown' } } },
    ], 'who', resolved)).toEqual({
      status: 'unreviewed',
      tagIds: [],
      implicitSubjectTagIds: [],
      resolution: null,
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
      dimensionReview: { who: { reviewed: false, resolution: null } },
    });
  });

  it('records a reviewed intentional-tag rollup and an empty rollup', () => {
    const tags = [{ docId: 'who-na', dimension: 'who' }] as never[];
    expect(computeGalleryInheritanceResult(
      [],
      [{ tags: ['who-na'], dimensionReview: { who: { reviewed: true } } }],
      { who: true, what: false, when: false, where: false },
      tags
    )).toEqual({
      tags: ['who-na'],
      statuses: { who: 'reviewed', what: 'empty', when: 'empty', where: 'empty' },
      implicitSubjectTagIds: ['who-na'],
      dimensionReview: { who: { reviewed: true, resolution: null } },
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
      dimensionReview: { who: { reviewed: false, resolution: null } },
    });
  });

  it('marks When unreviewed when any participating gallery item is blank', () => {
    const temporal = {
      status: 'known' as const,
      year: 1968,
      precision: 'year' as const,
      approximate: false,
      source: 'manual' as const,
    };

    expect(computeGalleryTemporalRollup([
      { temporal, dimensionReview: { when: { reviewed: true } } },
      {},
      { temporal: { ...temporal }, dimensionReview: { when: { reviewed: true } } },
    ])).toEqual({ status: 'unreviewed', temporal: null });
  });

  it('inherits one agreed structured date when every participating gallery item agrees', () => {
    const temporal = {
      status: 'known' as const,
      year: 1968,
      precision: 'year' as const,
      approximate: false,
      source: 'manual' as const,
    };

    expect(computeGalleryTemporalRollup([
      { temporal, dimensionReview: { when: { reviewed: true } } },
      { temporal: { ...temporal }, dimensionReview: { when: { reviewed: true } } },
    ])).toEqual({ status: 'reviewed', temporal });
  });

  it('requires an explicit card date when dated gallery items conflict', () => {
    expect(computeGalleryTemporalRollup([
      {
        temporal: {
          status: 'known',
          year: 1968,
          precision: 'year',
          approximate: false,
          source: 'manual',
        },
        dimensionReview: { when: { reviewed: true } },
      },
      {
        temporal: {
          status: 'known',
          year: 1969,
          precision: 'year',
          approximate: false,
          source: 'manual',
        },
        dimensionReview: { when: { reviewed: true } },
      },
    ])).toEqual({
      status: 'unreviewed',
      temporal: null,
    });
  });

  it('marks an inherited card date unreviewed when gallery items are blank', () => {
    expect(computeGalleryTemporalRollup([{}, { temporal: null }])).toEqual({
      status: 'unreviewed',
      temporal: null,
    });
  });

  it('keeps an inherited card date empty when there is no gallery', () => {
    expect(computeGalleryTemporalRollup([])).toEqual({
      status: 'empty',
      temporal: null,
    });
  });

  it('detects Gallery membership changes independently from other Card media roles', () => {
    expect(galleryMediaMembershipChanged(['media-a'], ['media-a', 'media-b'])).toBe(true);
    expect(galleryMediaMembershipChanged(['media-a'], [])).toBe(true);
    expect(galleryMediaMembershipChanged(['media-a', 'media-b'], ['media-b', 'media-a'])).toBe(false);
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

  it('honors per-card protection for enabled new-card dimensions', () => {
    expect(resolveNewCardInheritanceOverrides({
      galleryTagInheritanceConfigured: true,
      galleryTagInheritance: { who: true, what: true, when: true, where: true },
    }, {
      who: false, what: true, when: false, where: true,
    })).toEqual({ who: false, what: true, when: false, where: true });
  });

  it('does not release new-card dimensions disabled in author settings', () => {
    expect(resolveNewCardInheritanceOverrides({
      galleryTagInheritanceConfigured: true,
      galleryTagInheritance: { who: false, what: false, when: false, where: false },
    }, {
      who: false, what: false, when: false, where: false,
    })).toEqual({ who: true, what: true, when: true, where: true });
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
