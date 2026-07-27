import { hasDimensionAssignment } from '@/lib/utils/dimensionAssignment';
import { matchesDimensionReviewFilter } from '@/lib/utils/dimensionReview';

describe('hasDimensionAssignment', () => {
  it('recognizes tags, structured dates, and explicit review resolutions', () => {
    expect(hasDimensionAssignment({ what: ['movies'] }, 'what')).toBe(true);
    expect(
      hasDimensionAssignment(
        {
          when: [],
          temporal: {
            status: 'known',
            year: 2008,
            precision: 'year',
            approximate: false,
            source: 'manual',
          },
        },
        'when'
      )
    ).toBe(true);
    expect(
      hasDimensionAssignment(
        {
          when: [],
          dimensionReview: {
            when: { reviewed: true, resolution: 'unknown' },
          },
        },
        'when'
      )
    ).toBe(true);
  });

  it('does not treat review alone as an assigned value', () => {
    expect(
      hasDimensionAssignment(
        {
          when: [],
          dimensionReview: {
            when: { reviewed: true },
          },
        },
        'when'
      )
    ).toBe(false);
  });
});

describe('matchesDimensionReviewFilter', () => {
  const review = {
    who: { reviewed: false },
    what: { reviewed: true, resolution: 'unknown' as const },
    where: { reviewed: true, resolution: 'not_applicable' as const },
  };

  it('distinguishes unreviewed, unknown, and not-applicable states', () => {
    expect(matchesDimensionReviewFilter(review, 'who', 'unreviewed')).toBe(true);
    expect(matchesDimensionReviewFilter(review, 'what', 'unknown')).toBe(true);
    expect(matchesDimensionReviewFilter(review, 'where', 'not_applicable')).toBe(true);
    expect(matchesDimensionReviewFilter(review, 'what', 'unreviewed')).toBe(false);
  });
});
