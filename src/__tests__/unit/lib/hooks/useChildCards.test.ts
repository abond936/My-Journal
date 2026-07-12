import {
  childIdsMembershipKey,
  reorderCachedChildCards,
} from '@/lib/hooks/useChildCards';
import type { Card } from '@/lib/types/card';

function makeCard(id: string): Card {
  return {
    docId: id,
    title: id,
    title_lowercase: id,
    subtitle: null,
    excerpt: null,
    excerptAuto: true,
    content: '',
    status: 'published',
    type: 'story',
    displayMode: 'navigate',
    createdAt: 0,
    updatedAt: 0,
    tags: [],
    who: [],
    what: [],
    when: [],
    where: [],
    childrenIds: [],
    filterTags: {},
    coverImageId: null,
    contentMedia: [],
    galleryMedia: [],
    coverImage: null,
  };
}

describe('useChildCards helpers', () => {
  describe('childIdsMembershipKey', () => {
    it('is order-independent', () => {
      expect(childIdsMembershipKey(['b', 'a', 'c'])).toBe(childIdsMembershipKey(['a', 'b', 'c']));
    });
  });

  describe('reorderCachedChildCards', () => {
    it('reorders cached cards without refetch', () => {
      const map = new Map<string, Card>([
        ['a', makeCard('a')],
        ['b', makeCard('b')],
        ['c', makeCard('c')],
      ]);
      const reordered = reorderCachedChildCards(['c', 'a', 'b'], map);
      expect(reordered?.map((c) => c.docId)).toEqual(['c', 'a', 'b']);
    });

    it('returns null when cache is missing an id', () => {
      const map = new Map<string, Card>([['a', makeCard('a')]]);
      expect(reorderCachedChildCards(['a', 'b'], map)).toBeNull();
    });
  });
});
