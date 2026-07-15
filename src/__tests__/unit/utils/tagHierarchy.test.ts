import {
  auditCanonicalTagPaths,
  buildCanonicalTagPaths,
  buildReparentedTagPaths,
} from '@/lib/utils/tagHierarchy';

describe('tagHierarchy', () => {
  it('builds ancestor-only paths in root-to-parent order', () => {
    const paths = buildCanonicalTagPaths([
      { docId: 'root' },
      { docId: 'parent', parentId: 'root' },
      { docId: 'child', parentId: 'parent' },
    ]);
    expect(paths.get('root')).toEqual([]);
    expect(paths.get('parent')).toEqual(['root']);
    expect(paths.get('child')).toEqual(['root', 'parent']);
  });

  it('rejects missing parents and cycles', () => {
    expect(() => buildCanonicalTagPaths([{ docId: 'child', parentId: 'missing' }])).toThrow(
      'references missing parent'
    );
    expect(() =>
      buildCanonicalTagPaths([
        { docId: 'a', parentId: 'b' },
        { docId: 'b', parentId: 'a' },
      ])
    ).toThrow('Cycle detected');
  });

  it('reports stale paths', () => {
    expect(
      auditCanonicalTagPaths([
        { docId: 'root', path: ['root'] },
        { docId: 'child', parentId: 'root', path: ['root', 'root', 'child'] },
      ])
    ).toEqual([
      { tagId: 'root', actual: ['root'], expected: [] },
      { tagId: 'child', actual: ['root', 'root', 'child'], expected: ['root'] },
    ]);
  });

  it('rebuilds a moved subtree and rejects moving a parent beneath its child', () => {
    const tags = [
      { docId: 'root' },
      { docId: 'other' },
      { docId: 'parent', parentId: 'root' },
      { docId: 'child', parentId: 'parent' },
    ];
    const moved = buildReparentedTagPaths(tags, 'parent', 'other');
    expect(moved.get('parent')).toEqual(['other']);
    expect(moved.get('child')).toEqual(['other', 'parent']);
    expect(() => buildReparentedTagPaths(tags, 'parent', 'child')).toThrow('Cycle detected');
  });
});
