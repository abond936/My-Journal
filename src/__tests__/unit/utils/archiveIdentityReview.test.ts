import { buildArchiveIdentityReview, buildArchiveIdentityReviewReport } from '@/lib/utils/archiveIdentityReview';

describe('buildArchiveIdentityReview', () => {
  const tags = [
    { docId: 'family', name: 'Family', dimension: 'who' as const },
    { docId: 'parents', name: 'Parents', dimension: 'who' as const, parentId: 'family' },
    { docId: 'bob', name: 'Robert Bond', dimension: 'who' as const, parentId: 'parents' },
    { docId: 'couple', name: 'Bob & Sandra', dimension: 'who' as const, parentId: 'family' },
  ];

  it('keeps heuristic results as candidates and counts unique affected objects', () => {
    const rows = buildArchiveIdentityReview({
      tags, people: [], groups: [],
      cards: [{ id: 'c1', tagIds: ['parents', 'bob'] }],
      media: [{ id: 'm1', tagIds: ['bob'] }], questions: [],
    });
    expect(rows.find((row) => row.tagId === 'parents')?.classification).toBe('relationship-role');
    expect(rows.find((row) => row.tagId === 'couple')?.classification).toBe('group');
    expect(rows.find((row) => row.tagId === 'parents')?.subtree.cards).toBe(1);
    expect(rows.find((row) => row.tagId === 'bob')?.direct.media).toBe(1);
    expect(rows.every((row) => row.confidence !== 'confirmed')).toBe(true);
  });

  it('only confirms explicit links', () => {
    const rows = buildArchiveIdentityReview({ tags, groups: [], cards: [], media: [], questions: [], people: [{ kind: 'human', canonicalName: 'Robert Bond', linkedWhoTagId: 'bob', aliases: [], legacyWhoTagIds: [], status: 'active' }] });
    expect(rows.find((row) => row.tagId === 'bob')?.confidence).toBe('confirmed');
  });

  it('surfaces historical-name siblings as an alias cluster without confirming a merge', () => {
    const report = buildArchiveIdentityReviewReport({
      tags: [
        { docId: 'sandra', name: 'Sandra', dimension: 'who' },
        { docId: 'davis', name: 'Sandra Davis', dimension: 'who', parentId: 'sandra' },
        { docId: 'bond', name: 'Sandra Bond', dimension: 'who', parentId: 'sandra' },
      ], people: [], groups: [], cards: [], media: [], questions: [],
    });
    expect(report.aliasClusters[0]?.candidateNames).toEqual(['Sandra Bond', 'Sandra Davis']);
    expect(report.aliasClusters[0]?.decision).toBe('approved');
    expect(report.rows.every((row) => row.confidence !== 'confirmed')).toBe(true);
  });
});
