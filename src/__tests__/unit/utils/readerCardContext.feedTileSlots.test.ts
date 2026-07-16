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
      { dimension: 'who', label: 'Ed Davis', tooltip: 'Ed Davis' },
      { dimension: 'what', label: 'Portraits', tooltip: 'Portraits' },
      { dimension: 'when', label: null, tooltip: null },
      { dimension: 'where', label: null, tooltip: null },
    ]);
  });

  it('shows Multiple for several assignments without an explicit subject', () => {
    const tags = [...allTags, { docId: 'who-2', name: 'Mildred Davis', dimension: 'who', path: ['who-2'] } as Tag];
    const who = buildFeedTileDimensionSlots({ tags: ['who-1', 'who-2'] }, tags)[0];
    expect(who).toEqual({
      dimension: 'who',
      label: 'Multiple',
      tooltip: 'Ed Davis, Mildred Davis',
    });
  });

  it('shows one selected subject by name and discloses all assignments', () => {
    const tags = [...allTags, { docId: 'who-2', name: 'Mildred Davis', dimension: 'who', path: ['who-2'] } as Tag];
    const who = buildFeedTileDimensionSlots({
      tags: ['who-1', 'who-2'],
      subjectTagIds: ['who-2'],
    }, tags)[0];
    expect(who).toEqual({
      dimension: 'who',
      label: 'Mildred Davis',
      tooltip: 'Subjects: Mildred Davis\nAll: Ed Davis, Mildred Davis',
    });
  });

  it('shows Subjects+ when several subjects are selected', () => {
    const tags = [...allTags, { docId: 'who-2', name: 'Mildred Davis', dimension: 'who', path: ['who-2'] } as Tag];
    const who = buildFeedTileDimensionSlots({
      tags: ['who-1', 'who-2'],
      subjectTagIds: ['who-1', 'who-2'],
    }, tags)[0];
    expect(who).toEqual({
      dimension: 'who',
      label: 'Subjects+',
      tooltip: 'Subjects: Ed Davis, Mildred Davis\nAll: Ed Davis, Mildred Davis',
    });
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
