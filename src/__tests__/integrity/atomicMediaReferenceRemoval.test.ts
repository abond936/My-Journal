import { FieldValue } from 'firebase-admin/firestore';
import { buildMediaReferenceRemovalUpdate } from '@/lib/services/cardService';
import type { Card } from '@/lib/types/card';

describe('atomic media reference removal (7e)', () => {
  const baseCard: Card = {
    docId: 'card-multi',
    type: 'story',
    status: 'published',
    title: 'Multi surface',
    content: '<p>before</p><figure data-media-id="media-x"><img src="x" /></figure>',
    tags: [],
    coverImageId: 'media-x',
    galleryMedia: [{ mediaId: 'media-x', order: 0 }],
    contentMedia: ['media-x'],
    createdAt: 1,
    updatedAt: 1,
  };

  it('buildMediaReferenceRemovalUpdate clears every card surface for the media id', () => {
    const removal = buildMediaReferenceRemovalUpdate(baseCard, 'media-x');
    expect(removal).not.toBeNull();

    const { cardUpdate, remainingMediaIds } = removal!;
    expect(cardUpdate.coverImageId).toBe(FieldValue.delete());
    expect(cardUpdate.galleryMedia).toEqual([]);
    expect(cardUpdate.contentMedia).toEqual([]);
    expect(String(cardUpdate.content)).not.toContain('media-x');
    expect(remainingMediaIds.has('media-x')).toBe(false);
  });

  it('returns null when the card does not reference the media id', () => {
    expect(
      buildMediaReferenceRemovalUpdate(
        { ...baseCard, coverImageId: null, galleryMedia: [], contentMedia: [], content: '' },
        'media-x'
      )
    ).toBeNull();
  });
});
