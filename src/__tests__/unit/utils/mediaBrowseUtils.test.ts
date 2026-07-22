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
});
