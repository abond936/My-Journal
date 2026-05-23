import { orderIdsBySeed, seededRandomRank } from '@/lib/utils/seededRandomOrder';

describe('seeded random ordering', () => {
  it('returns a stable order for the same seed', () => {
    const ids = ['card-a', 'card-b', 'card-c', 'card-d', 'card-e'];

    expect(orderIdsBySeed(ids, 'seed-1')).toEqual(orderIdsBySeed(ids, 'seed-1'));
  });

  it('changes order when the seed changes', () => {
    const ids = ['card-a', 'card-b', 'card-c', 'card-d', 'card-e', 'card-f', 'card-g'];

    expect(orderIdsBySeed(ids, 'seed-1')).not.toEqual(orderIdsBySeed(ids, 'seed-2'));
  });

  it('inserts newly matching ids into their deterministic seeded position', () => {
    const base = ['card-a', 'card-b', 'card-d', 'card-e'];
    const withNew = ['card-a', 'card-b', 'card-c', 'card-d', 'card-e'];
    const expected = [...withNew].sort((a, b) => {
      const rankDiff = seededRandomRank('seed-1', a) - seededRandomRank('seed-1', b);
      return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
    });

    expect(orderIdsBySeed(withNew, 'seed-1')).toEqual(expected);
    expect(orderIdsBySeed(withNew, 'seed-1').filter((id) => id !== 'card-c')).toEqual(
      orderIdsBySeed(base, 'seed-1')
    );
  });
});
