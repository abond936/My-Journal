import {
  buildFeedTileDimensionSlots,
  isOperationalSentinelTagName,
} from '@/lib/utils/readerCardContext';
import type { Tag } from '@/lib/types/tag';

describe('isOperationalSentinelTagName', () => {
  it('treats zNA and z-* utility names as operational sentinels', () => {
    expect(isOperationalSentinelTagName('zNA')).toBe(true);
    expect(isOperationalSentinelTagName('zMisc')).toBe(true);
    expect(isOperationalSentinelTagName('Ed Davis')).toBe(false);
  });
});

describe('buildFeedTileDimensionSlots', () => {
  const allTags: Tag[] = [
    { docId: 'who-1', name: 'Ed Davis', dimension: 'who', path: ['who-1'] },
    { docId: 'what-1', name: 'Portraits', dimension: 'what', path: ['what-1'] },
    { docId: 'when-1', name: '1984', dimension: 'when', path: ['when-1'] },
    { docId: 'zna-when', name: 'zNA', dimension: 'when', path: ['zna-when'] },
  ];

  it('always returns four slots in Who / What / When / Where order', () => {
    const slots = buildFeedTileDimensionSlots({ tags: [] }, allTags);
    expect(slots.map((s) => s.dimension)).toEqual(['who', 'what', 'when', 'where']);
    expect(slots.every((s) => s.label === null)).toBe(true);
  });

  it('fills dimensions with resolved labels and leaves others empty', () => {
    const slots = buildFeedTileDimensionSlots({ tags: ['who-1', 'what-1'] }, allTags);
    expect(slots).toEqual([
      { dimension: 'who', label: 'Ed Davis' },
      { dimension: 'what', label: 'Portraits' },
      { dimension: 'when', label: null },
      { dimension: 'where', label: null },
    ]);
  });

  it('does not surface operational sentinel tags on tiles', () => {
    const slots = buildFeedTileDimensionSlots({ tags: ['zna-when'] }, allTags);
    expect(slots.find((s) => s.dimension === 'when')?.label).toBeNull();
  });

  it('prefers real When tags when sentinel and dated tags coexist', () => {
    const slots = buildFeedTileDimensionSlots({ tags: ['when-1', 'zna-when'] }, allTags);
    expect(slots.find((s) => s.dimension === 'when')?.label).toBe('1984');
  });
});
