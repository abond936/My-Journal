import {
  buildStackByIdMap,
  filterMediaForStackDisplay,
  resolveGalleryEntriesFromSelection,
  selectionEligibleForCreateStack,
} from '@/lib/utils/mediaStackDisplayUtils';
import type { MediaStack } from '@/lib/types/mediaStack';
import type { Media } from '@/lib/types/photo';

function media(id: string, stackId?: string): Media {
  return { docId: id, stackId, createdAt: 1 } as Media;
}

function stack(id: string, hero: string, members: string[]): MediaStack {
  return {
    docId: id,
    kind: 'manual',
    status: 'active',
    heroMediaId: hero,
    memberMediaIds: members,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('mediaStackDisplayUtils', () => {
  const stackMap = buildStackByIdMap([
    stack('s1', 'a', ['a', 'b', 'c']),
    stack('s2', 'd', ['d', 'e']),
  ]);

  it('collapses stacks to hero rows by default', () => {
    const items = [media('a', 's1'), media('b', 's1'), media('c', 's1'), media('x')];
    const visible = filterMediaForStackDisplay(items, stackMap, false, new Set());
    expect(visible.map((item) => item.docId)).toEqual(['a', 'x']);
  });

  it('expands a stack when its id is in expandedStackIds', () => {
    const items = [media('a', 's1'), media('b', 's1'), media('c', 's1')];
    const visible = filterMediaForStackDisplay(items, stackMap, false, new Set(['s1']));
    expect(visible.map((item) => item.docId)).toEqual(['a', 'b', 'c']);
  });

  it('shows all members when showAllStacks is true', () => {
    const items = [media('a', 's1'), media('b', 's1'), media('x')];
    const visible = filterMediaForStackDisplay(items, stackMap, true, new Set());
    expect(visible.map((item) => item.docId)).toEqual(['a', 'b', 'x']);
  });

  it('validates create-stack selection', () => {
    const byId = new Map([
      ['a', media('a')],
      ['b', media('b')],
      ['c', media('c', 's1')],
    ]);
    expect(selectionEligibleForCreateStack(['a'], byId)).toEqual({
      ok: false,
      reason: 'Select at least two media items to create a stack.',
    });
    expect(selectionEligibleForCreateStack(['a', 'c'], byId)).toEqual({
      ok: false,
      reason: 'Unstack selected media before creating a new stack.',
    });
    expect(selectionEligibleForCreateStack(['a', 'b'], byId)).toEqual({
      ok: true,
      mediaIds: ['a', 'b'],
    });
  });

  it('resolves gallery entries to one slot per stack', () => {
    const byId = new Map([
      ['a', media('a', 's1')],
      ['b', media('b', 's1')],
      ['x', media('x')],
    ]);
    const entries = resolveGalleryEntriesFromSelection(['a', 'b', 'x'], byId, stackMap);
    expect(entries).toEqual([
      { mediaId: 'a', order: 0, stackId: 's1' },
      { mediaId: 'x', order: 1 },
    ]);
  });
});
