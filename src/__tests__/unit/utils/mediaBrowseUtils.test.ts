import { groupMediaForBrowse } from '@/lib/utils/mediaBrowseUtils';
import type { Media } from '@/lib/types/photo';

function media(docId: string, outcome?: NonNullable<Media['metadataImport']>['outcome']): Media {
  return {
    docId,
    filename: `${docId}.jpg`,
    width: 100,
    height: 100,
    size: 100,
    contentType: 'image/jpeg',
    storageUrl: `https://example.test/${docId}.jpg`,
    storagePath: `images/${docId}.jpg`,
    source: 'local',
    sourcePath: `/Library/${docId}.jpg`,
    createdAt: 1,
    updatedAt: 1,
    ...(outcome
      ? { metadataImport: { attempted: outcome !== 'not_requested', outcome } }
      : {}),
  };
}

describe('groupMediaForBrowse', () => {
  it('groups metadata outcomes and preserves legacy unknown records', () => {
    const groups = groupMediaForBrowse(
      [media('found', 'found'), media('none', 'none'), media('legacy')],
      'metadata'
    );

    expect(groups.map((group) => group.title).sort()).toEqual([
      'Legacy / unknown',
      'Metadata found',
      'No metadata found',
    ]);
  });

  it('groups filtered media by Gallery Card and keeps non-gallery media separate', () => {
    const groups = groupMediaForBrowse(
      [
        { ...media('shared'), referencedByCardIds: ['card-a', 'card-b'] },
        { ...media('gallery-only'), referencedByCardIds: ['card-a'] },
        { ...media('cover-only'), referencedByCardIds: ['card-b'] },
        media('unused'),
      ],
      'card',
      [
        {
          docId: 'card-a',
          title: 'Same Dress',
          subtitle: null,
          status: 'draft',
          galleryMedia: [{ mediaId: 'shared', order: 0 }, { mediaId: 'gallery-only', order: 1 }],
        },
        {
          docId: 'card-b',
          title: 'Other Card',
          subtitle: null,
          status: 'published',
          galleryMedia: [{ mediaId: 'shared', order: 0 }],
        },
      ]
    );

    expect(groups).toEqual([
      expect.objectContaining({
        id: 'card:card-b',
        title: 'Other Card',
        subtitle: 'Published Gallery Card',
        memberMediaIds: ['shared'],
      }),
      expect.objectContaining({
        id: 'card:card-a',
        title: 'Same Dress',
        subtitle: 'Draft Gallery Card',
        memberMediaIds: ['shared', 'gallery-only'],
      }),
      expect.objectContaining({
        id: 'card:unassigned',
        memberMediaIds: ['cover-only', 'unused'],
      }),
    ]);
  });
});
