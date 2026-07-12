import type { Card, CardUpdate } from '@/lib/types/card';
import {
  dehydrateCardPatchPayload,
  groupCollectionsByDimension,
  persistableSnapshotsEqual,
} from '@/lib/utils/cardUtils';

describe('groupCollectionsByDimension', () => {
  it('preserves incoming collection order within each dimension group', () => {
    const cards: Card[] = [
      { docId: 'second', title: 'Second', who: ['w1'], what: [], when: [], where: [] } as Card,
      { docId: 'first', title: 'First', who: ['w2'], what: [], when: [], where: [] } as Card,
      { docId: 'third', title: 'Third', who: [], what: [], when: [], where: [] } as Card,
    ];

    const groups = groupCollectionsByDimension(cards);

    expect(groups.who.map((card) => card.docId)).toEqual(['second', 'first']);
    expect(groups.uncategorized.map((card) => card.docId)).toEqual(['third']);
  });
});

describe('persistableSnapshotsEqual', () => {
  const baseCardUpdate: CardUpdate = {
    title: 'Test Card',
    status: 'draft',
    type: 'story',
    tags: [],
    childrenIds: [],
    coverImageId: null,
    galleryMedia: [],
    contentMedia: ['media-1'],
  };

  it('treats legacy and current figure markup for the same inline media as equal', () => {
    const legacyMarkup: CardUpdate = {
      ...baseCardUpdate,
      content: '<p>before</p><figure data-media-id="media-1"><img src="x" /></figure>',
    };
    const currentMarkup: CardUpdate = {
      ...baseCardUpdate,
      content:
        '<p>before</p><figure data-figure-with-image="" data-size="medium" data-alignment="left" data-wrap="off" data-media-id="media-1" data-media-type="content"><img alt="" width="0" height="0" data-media-id="media-1"><figcaption></figcaption></figure>',
    };

    expect(persistableSnapshotsEqual(legacyMarkup, currentMarkup)).toBe(true);
  });

  it('still treats meaningful inline-media formatting differences as dirty', () => {
    const mediumFigure: CardUpdate = {
      ...baseCardUpdate,
      content:
        '<p>before</p><figure data-figure-with-image="" data-size="medium" data-alignment="left" data-wrap="off" data-media-id="media-1" data-media-type="content"><img alt="" width="0" height="0" data-media-id="media-1"><figcaption></figcaption></figure>',
    };
    const largeFigure: CardUpdate = {
      ...baseCardUpdate,
      content:
        '<p>before</p><figure data-figure-with-image="" data-size="large" data-alignment="left" data-wrap="off" data-media-id="media-1" data-media-type="content"><img alt="" width="0" height="0" data-media-id="media-1"><figcaption></figcaption></figure>',
    };

    expect(persistableSnapshotsEqual(mediumFigure, largeFigure)).toBe(false);
  });
});

describe('dehydrateCardPatchPayload', () => {
  it('strips nested gallery media objects from Studio PATCH bodies', () => {
    const payload: Partial<Card> = {
      galleryMedia: [
        {
          mediaId: 'media-1',
          order: 0,
          media: {
            docId: 'media-1',
            filename: 'a.jpg',
            width: 10,
            height: 10,
            size: 1,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.com/a.jpg',
            storagePath: 'images/a.jpg',
            source: 'local',
            sourcePath: '/a.jpg',
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
      coverImage: {
        docId: 'media-1',
        filename: 'a.jpg',
        width: 10,
        height: 10,
        size: 1,
        contentType: 'image/jpeg',
        storageUrl: 'https://example.com/a.jpg',
        storagePath: 'images/a.jpg',
        source: 'local',
        sourcePath: '/a.jpg',
        createdAt: 1,
        updatedAt: 1,
      } as Card['coverImage'],
    };

    expect(dehydrateCardPatchPayload(payload)).toEqual({
      galleryMedia: [{ mediaId: 'media-1', order: 0 }],
    });
  });
});
