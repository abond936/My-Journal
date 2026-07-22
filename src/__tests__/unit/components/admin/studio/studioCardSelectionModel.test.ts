import type { Card } from '@/lib/types/card';
import {
  applyOptimisticSelectedCardPatch,
  collectAssignedMediaIds,
  mediaRolesOnCard,
  removeCardFromCardsCache,
} from '@/components/admin/studio/studioCardSelectionModel';

describe('Studio selected Card model', () => {
  it('removes a deleted Card from nested SWR item collections without changing other shapes', () => {
    const cached = [
      { items: [{ docId: 'keep' }, { docId: 'delete' }] },
      { items: [{ docId: 'also-keep' }] },
    ];

    expect(removeCardFromCardsCache(cached, 'delete')).toEqual([
      { items: [{ docId: 'keep' }] },
      { items: [{ docId: 'also-keep' }] },
    ]);
  });

  it('clones relationship collections in optimistic patches', () => {
    const card = {
      docId: 'card-1',
      childrenIds: ['old-child'],
      galleryMedia: [{ mediaId: 'old-gallery', order: 0 }],
      contentMedia: ['old-content'],
      coverImageId: 'old-cover',
    } as Card;
    const childrenIds = ['new-child'];
    const galleryMedia = [{ mediaId: 'new-gallery', order: 0 }];
    const contentMedia = ['new-content'];

    const patched = applyOptimisticSelectedCardPatch(card, {
      childrenIds,
      galleryMedia,
      contentMedia,
      coverImageId: null,
    });

    expect(patched.childrenIds).toEqual(childrenIds);
    expect(patched.childrenIds).not.toBe(childrenIds);
    expect(patched.galleryMedia).toEqual(galleryMedia);
    expect(patched.galleryMedia).not.toBe(galleryMedia);
    expect(patched.contentMedia).toEqual(contentMedia);
    expect(patched.contentMedia).not.toBe(contentMedia);
    expect(patched.coverImageId).toBeNull();
    expect(typeof patched.updatedAt).toBe('number');
  });

  it('deduplicates assigned media and reports every role in stable order', () => {
    const card = {
      coverImageId: 'shared',
      galleryMedia: [
        { mediaId: 'shared', order: 0 },
        { mediaId: 'gallery', order: 1 },
      ],
      contentMedia: ['shared', 'content'],
    } as Card;

    expect(collectAssignedMediaIds(card)).toEqual(['shared', 'gallery', 'content']);
    expect(mediaRolesOnCard(card, 'shared')).toEqual(['Cover', 'Gallery', 'Content']);
    expect(mediaRolesOnCard(card, 'missing')).toEqual([]);
  });
});
