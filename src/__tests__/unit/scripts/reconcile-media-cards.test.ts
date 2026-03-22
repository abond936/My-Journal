/**
 * Unit tests for card-media reconciliation logic
 */
import {
  normalizePath,
  mediaBelongsToCard,
} from '@/lib/scripts/firebase/reconcile-media-cards-utils';

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('American Adventures\\xNormalized\\IMG_001.jpg')).toBe(
      'American Adventures/xNormalized/IMG_001.jpg'
    );
  });

  it('removes leading and trailing slashes', () => {
    expect(normalizePath('/American Adventures/xNormalized/')).toBe(
      'American Adventures/xNormalized'
    );
  });

  it('handles mixed path separators', () => {
    expect(normalizePath('\\folder/subfolder\\file.jpg')).toBe('folder/subfolder/file.jpg');
  });

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('');
  });
});

describe('mediaBelongsToCard', () => {
  it('matches exact path equality', () => {
    expect(mediaBelongsToCard('American Adventures/xNormalized', 'American Adventures/xNormalized')).toBe(true);
  });

  it('matches media in subfolder of imported folder', () => {
    expect(
      mediaBelongsToCard('American Adventures/xNormalized/IMG_001.jpg', 'American Adventures/xNormalized')
    ).toBe(true);
  });

  it('matches media with forward slashes when card uses same', () => {
    expect(
      mediaBelongsToCard('Vacation 2023/xNormalized/photo.jpg', 'Vacation 2023/xNormalized')
    ).toBe(true);
  });

  it('matches media with backslashes (normalized for comparison)', () => {
    expect(
      mediaBelongsToCard('American Adventures\\xNormalized\\IMG_002.jpg', 'American Adventures/xNormalized')
    ).toBe(true);
  });

  it('rejects media from different folder', () => {
    expect(
      mediaBelongsToCard('Other Album/xNormalized/IMG_001.jpg', 'American Adventures/xNormalized')
    ).toBe(false);
  });

  it('rejects media from sibling folder (no partial match)', () => {
    expect(
      mediaBelongsToCard('American Adventures Other/xNormalized/IMG.jpg', 'American Adventures/xNormalized')
    ).toBe(false);
  });

  it('matches media when card folder is parent of imported path', () => {
    expect(
      mediaBelongsToCard('American Adventures/xNormalized', 'American Adventures')
    ).toBe(true);
  });

  it('handles folder with similar name - American vs American Adventures', () => {
    expect(
      mediaBelongsToCard('American Adventures/xNormalized/img.jpg', 'American/xNormalized')
    ).toBe(false);
  });
});

describe('ReconcileReport structure', () => {
  it('has expected structure for diagnostics', () => {
    const report = {
      cardsWithEmptyGalleryButImportedFolder: [] as Array<{ cardId: string }>,
      orphanedMedia: [] as Array<{ mediaId: string }>,
      orphanedReferences: {
        coverImageId: [] as Array<{ cardId: string; mediaId: string }>,
        galleryMedia: [] as Array<{ cardId: string; mediaId: string }>,
        contentMedia: [] as Array<{ cardId: string; mediaId: string }>,
      },
      mediaWithMissingStorage: [] as Array<{ mediaId: string }>,
      reLinkedCards: [] as string[],
      removedOrphanedRefs: 0,
      errors: [] as string[],
    };
    expect(report.cardsWithEmptyGalleryButImportedFolder).toEqual([]);
    expect(report.orphanedReferences.coverImageId).toEqual([]);
    expect(report.orphanedReferences.galleryMedia).toEqual([]);
    expect(report.orphanedReferences.contentMedia).toEqual([]);
  });
});
