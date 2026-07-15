import { computeHierarchicalUniqueIds } from '@/lib/scripts/tags/tag-count-utils';

describe('computeHierarchicalUniqueIds', () => {
  it('counts each object once across direct and descendant assignments', () => {
    const result = computeHierarchicalUniqueIds(
      [{ docId: 'root' }, { docId: 'child', parentId: 'root' }],
      [{ objectId: 'one', tagIds: ['root', 'child', 'child'] }, { objectId: 'two', tagIds: ['child'] }]
    );
    expect([...result.get('child')!].sort()).toEqual(['one', 'two']);
    expect([...result.get('root')!].sort()).toEqual(['one', 'two']);
  });
});
