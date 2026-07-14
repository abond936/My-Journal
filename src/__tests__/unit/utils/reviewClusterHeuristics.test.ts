import { buildReviewClustersForLens, formatDayTitle } from '@/lib/utils/reviewClusterHeuristics';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';

function mediaItem(overrides: Partial<Media> & { docId: string }): Media {
  return {
    docId: overrides.docId,
    filename: overrides.filename ?? `${overrides.docId}.jpg`,
    createdAt: overrides.createdAt ?? Date.parse('2024-07-04T12:00:00Z'),
    sourcePath: overrides.sourcePath ?? 'Photos/Vacation/img.jpg',
    tags: overrides.tags ?? [],
    who: overrides.who ?? [],
    hasWho: overrides.hasWho ?? false,
    ...overrides,
  } as Media;
}

const whenTags: Tag[] = [
  { docId: 'when-2024', name: '2024', dimension: 'when', parentId: null, order: 0 },
];

describe('reviewClusterHeuristics', () => {
  it('groups suggested lens by day and folder in title', () => {
    const items = [
      mediaItem({
        docId: 'm1',
        createdAt: Date.parse('2024-07-04T10:00:00Z'),
        sourcePath: 'import/Lake Day/a.jpg',
      }),
      mediaItem({
        docId: 'm2',
        createdAt: Date.parse('2024-07-04T18:00:00Z'),
        sourcePath: 'import/Lake Day/b.jpg',
      }),
    ];

    const clusters = buildReviewClustersForLens('suggested', items, whenTags);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.memberMediaIds).toEqual(['m1', 'm2']);
    expect(clusters[0]?.title).toContain(formatDayTitle(items[0]!.createdAt!));
    expect(clusters[0]?.title).toContain('Lake Day');
    expect(clusters[0]?.suggestedTagIds.when).toEqual(['when-2024']);
  });

  it('splits suggested lens by folder when same day has different folders', () => {
    const day = Date.parse('2024-07-04T10:00:00Z');
    const items = [
      mediaItem({ docId: 'm1', createdAt: day, sourcePath: 'import/Lake Day/a.jpg' }),
      mediaItem({ docId: 'm2', createdAt: day, sourcePath: 'import/ShortsSuspenders/b.jpg' }),
    ];

    const clusters = buildReviewClustersForLens('suggested', items, whenTags);
    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.memberMediaIds.sort())).toEqual([['m1'], ['m2']]);
  });

  it('groups what lens by folder with occasion-shaped title', () => {
    const items = [
      mediaItem({ docId: 'm1', sourcePath: 'import/Birthday Party/a.jpg' }),
      mediaItem({ docId: 'm2', sourcePath: 'import/Birthday Party/b.jpg' }),
    ];

    const clusters = buildReviewClustersForLens('what', items, whenTags);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.title).toBe('Birthday Party');
    expect(clusters[0]?.occasionLabel).toBe('Birthday Party');
  });

  it('builds coverage note for scenery vs people mix', () => {
    const items = [
      mediaItem({ docId: 'm1', hasWho: false, who: [] }),
      mediaItem({ docId: 'm2', hasWho: true, who: ['who-1'] }),
    ];

    const clusters = buildReviewClustersForLens('when', items, whenTags);
    expect(clusters[0]?.coverageNote).toMatch(/scenery/i);
    expect(clusters[0]?.coverageNote).toMatch(/people tags/i);
  });

  it('groups who lens by shared who assignment bucket', () => {
    const items = [
      mediaItem({ docId: 'm1', who: ['who-a'], hasWho: true }),
      mediaItem({ docId: 'm2', who: ['who-a'], hasWho: true }),
      mediaItem({ docId: 'm3', who: [], hasWho: false }),
    ];

    const clusters = buildReviewClustersForLens('who', items, whenTags);
    const shared = clusters.find((cluster) => cluster.memberMediaIds.includes('m1'));
    const empty = clusters.find((cluster) => cluster.memberMediaIds.includes('m3'));
    expect(shared?.suggestedTagIds.who).toEqual(['who-a']);
    expect(empty?.title).toBe('No Who tags yet');
  });
});
