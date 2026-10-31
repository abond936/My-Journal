import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';

describe('Card Feed inclusion', () => {
  it('preserves legacy Cards with no explicit Feed field', () => {
    expect(isCardIncludedInFeed({})).toBe(true);
  });

  it('honors explicit author inclusion and exclusion', () => {
    expect(isCardIncludedInFeed({ feedIncluded: true })).toBe(true);
    expect(isCardIncludedInFeed({ feedIncluded: false })).toBe(false);
  });
});
