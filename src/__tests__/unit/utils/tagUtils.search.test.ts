import { filterTreesBySearch } from '@/lib/utils/tagUtils';
import type { TagWithChildren } from '@/lib/types/tag';

const tree: TagWithChildren[] = [
  {
    docId: 'parents',
    name: 'Parents',
    dimension: 'who',
    children: [
      {
        docId: 'father',
        name: 'Father',
        dimension: 'who',
        children: [
          { docId: 'robert', name: 'Robert Bond', dimension: 'who', children: [] },
        ],
      },
    ],
  },
];

describe('tag tree search', () => {
  it('shows an exact matching node without treating its descendants as matches', () => {
    expect(filterTreesBySearch(tree, 'Father')).toEqual([
      {
        ...tree[0],
        children: [{ ...tree[0].children[0], children: [] }],
      },
    ]);
  });

  it('retains only the ancestor path to a matching descendant', () => {
    expect(filterTreesBySearch(tree, 'Robert')).toEqual(tree);
  });
});
