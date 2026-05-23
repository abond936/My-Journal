import {
  assertCompleteTagTraversal,
  buildTagChildrenByParent,
  getTagPostOrder,
} from '@/lib/scripts/tags/tag-count-utils';

describe('tag count traversal utilities', () => {
  it('treats null and missing parentId as root tags', () => {
    const tags = [
      { docId: 'root-null', parentId: null },
      { docId: 'child-null', parentId: 'root-null' },
      { docId: 'root-missing' },
      { docId: 'child-missing', parentId: 'root-missing' },
    ];

    const childrenByParent = buildTagChildrenByParent(tags);

    expect(childrenByParent.get('__root__')).toEqual(['root-null', 'root-missing']);
    expect(getTagPostOrder(tags)).toEqual([
      'child-null',
      'root-null',
      'child-missing',
      'root-missing',
    ]);
  });

  it('includes tags whose parent document is missing instead of silently skipping them', () => {
    const tags = [
      { docId: 'root', parentId: null },
      { docId: 'orphan-child', parentId: 'missing-parent' },
    ];
    const order = getTagPostOrder(tags);

    expect(order).toEqual(['root', 'orphan-child']);
    expect(() => assertCompleteTagTraversal(tags, order)).not.toThrow();
  });

  it('throws on cycles instead of hanging', () => {
    expect(() =>
      getTagPostOrder([
        { docId: 'a', parentId: 'b' },
        { docId: 'b', parentId: 'a' },
      ])
    ).toThrow('Cycle detected in tag tree');
  });
});
