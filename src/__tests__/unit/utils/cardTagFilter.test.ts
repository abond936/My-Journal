import { cardMatchesExactTagScope } from '@/lib/utils/cardTagFilter';

describe('cardMatchesExactTagScope', () => {
  const card = {
    tags: ['robert', 'sandra'],
    subjectTagIds: ['robert', 'sandra'],
  };

  it('supports Any and All for direct assignments', () => {
    expect(cardMatchesExactTagScope(card, ['robert', 'missing'], 'all', 'any')).toBe(true);
    expect(cardMatchesExactTagScope(card, ['robert', 'missing'], 'all', 'all')).toBe(false);
    expect(cardMatchesExactTagScope(card, ['robert', 'sandra'], 'all', 'all')).toBe(true);
  });

  it('supports Any and All for subject-only matching', () => {
    expect(cardMatchesExactTagScope(card, ['robert', 'missing'], 'subject', 'any')).toBe(true);
    expect(cardMatchesExactTagScope(card, ['robert', 'missing'], 'subject', 'all')).toBe(false);
  });
});
