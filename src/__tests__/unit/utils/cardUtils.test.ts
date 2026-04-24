import type { Card } from '@/lib/types/card';
import { groupCollectionsByDimension } from '@/lib/utils/cardUtils';

describe('groupCollectionsByDimension', () => {
  it('preserves incoming collection order within each dimension group', () => {
    const cards: Card[] = [
      { docId: 'second', title: 'Second', who: ['w1'], what: [], when: [], where: [] } as Card,
      { docId: 'first', title: 'First', who: ['w2'], what: [], when: [], where: [] } as Card,
      { docId: 'third', title: 'Third', who: [], what: [], when: [], where: [] } as Card,
    ];

    const groups = groupCollectionsByDimension(cards);

    expect(groups.who.map((card) => card.docId)).toEqual(['second', 'first']);
    expect(groups.uncategorized.map((card) => card.docId)).toEqual(['third']);
  });
});
