import {
  cardMatchesCodificationFilter,
  isCardCodificationComplete,
} from '@/lib/utils/cardCodification';

describe('card codification', () => {
  const complete = {
    who: ['who-1'],
    what: ['what-1'],
    when: ['when-1'],
    where: ['where-1'],
  };

  it('requires an effective assignment in every dimension', () => {
    expect(isCardCodificationComplete(complete)).toBe(true);
    expect(isCardCodificationComplete({ ...complete, when: [] })).toBe(false);
    expect(isCardCodificationComplete({ ...complete, where: undefined })).toBe(false);
  });

  it('matches complete and incomplete filters without a stored status field', () => {
    const incomplete = { ...complete, what: [] };
    expect(cardMatchesCodificationFilter(complete, 'complete')).toBe(true);
    expect(cardMatchesCodificationFilter(complete, 'incomplete')).toBe(false);
    expect(cardMatchesCodificationFilter(incomplete, 'complete')).toBe(false);
    expect(cardMatchesCodificationFilter(incomplete, 'incomplete')).toBe(true);
    expect(cardMatchesCodificationFilter(incomplete, 'all')).toBe(true);
  });
});
