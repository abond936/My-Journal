import {
  applyRestorePlanRow,
  buildRestorePlanRows,
  uniqueFoldersFromMissingReport,
  type RestorePlanRow,
} from '@/lib/scripts/dev/restore-missing-x-media-as-imported-lib';

jest.mock('@/lib/firebase/tagService', () => ({
  getAllTags: jest.fn(),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({
    firestore: () => ({
      collection: () => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      }),
    }),
  })),
}));

jest.mock('@/lib/services/images/embeddedMetadataForImport', () => ({
  buildTagNameLookupMaps: jest.fn(() => ({})),
}));

jest.mock('@/lib/services/importFolderAsCard', () => ({
  getImportFolderRestorePlan: jest.fn(),
  importFolderAsCard: jest.fn(),
  importFolderAsMediaOnly: jest.fn(),
}));

jest.mock('@/lib/services/cardService', () => ({
  getCardById: jest.fn(),
  updateCardGallery: jest.fn(),
  updateCardCover: jest.fn(),
}));

const {
  getImportFolderRestorePlan,
  importFolderAsCard,
  importFolderAsMediaOnly,
} = jest.requireMock('@/lib/services/importFolderAsCard') as {
  getImportFolderRestorePlan: jest.Mock;
  importFolderAsCard: jest.Mock;
  importFolderAsMediaOnly: jest.Mock;
};

const {
  getCardById,
  updateCardGallery,
  updateCardCover,
} = jest.requireMock('@/lib/services/cardService') as {
  getCardById: jest.Mock;
  updateCardGallery: jest.Mock;
  updateCardCover: jest.Mock;
};

describe('restore-missing-x-media-as-imported-lib', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates report folders in sorted order', () => {
    const folders = uniqueFoldersFromMissingReport({
      files: [
        'z/a/photo__X.jpg',
        'z/b/photo__X.jpg',
        'z/a/another__X.jpg',
      ],
    });

    expect(folders).toEqual(['z/a', 'z/b']);
  });

  it('builds plan rows from resolved import-source preflight', async () => {
    getImportFolderRestorePlan.mockResolvedValueOnce({
      selectedFolderPath: 'root/folder',
      importSourcePath: 'root/folder/yEdited',
      title: 'folder',
      imageCount: 3,
      willNormalize: true,
      normalized: true,
      existingCardId: 'card-1',
      existingTitle: 'Existing Card',
      action: 'merge-existing-card',
    });

    const rows = await buildRestorePlanRows(['root/folder']);

    expect(rows).toEqual([
      {
        folderPath: 'root/folder',
        importSourcePath: 'root/folder/yEdited',
        title: 'folder',
        expectedImageCount: 3,
        action: 'merge-existing-card',
        existingCardId: 'card-1',
        existingTitle: 'Existing Card',
      },
    ]);
  });

  it('does not mutate a card when strict media import fails before merge', async () => {
    const row: RestorePlanRow = {
      folderPath: 'root/folder',
      importSourcePath: 'root/folder/yEdited',
      title: 'folder',
      expectedImageCount: 4,
      action: 'merge-existing-card',
      existingCardId: 'card-1',
      existingTitle: 'Existing Card',
    };

    importFolderAsMediaOnly.mockRejectedValueOnce(
      new Error('Folder import incomplete for root/folder/yEdited: imported or reused 3/4 images; 1 failed.')
    );

    const result = await applyRestorePlanRow(row, {} as never);

    expect(result).toEqual({
      folderPath: 'root/folder',
      mode: 'error',
      error: 'Folder import incomplete for root/folder/yEdited: imported or reused 3/4 images; 1 failed.',
    });
    expect(updateCardGallery).not.toHaveBeenCalled();
    expect(updateCardCover).not.toHaveBeenCalled();
  });

  it('preserves existing gallery items and cover when merging restored media', async () => {
    const row: RestorePlanRow = {
      folderPath: 'root/folder',
      importSourcePath: 'root/folder/xNormalized',
      title: 'folder',
      expectedImageCount: 2,
      action: 'merge-existing-card',
      existingCardId: 'card-1',
      existingTitle: 'Existing Card',
    };

    importFolderAsMediaOnly.mockResolvedValueOnce({
      importedCount: 1,
      skippedCount: 1,
      failedPaths: [],
      mediaIds: ['media-existing', 'media-new'],
      importSourcePath: 'root/folder/xNormalized',
      normalized: false,
    });
    getCardById
      .mockResolvedValueOnce({
        docId: 'card-1',
        title: 'Existing Card',
        coverImageId: 'cover-keep',
        galleryMedia: [
          { mediaId: 'media-existing', order: 0, caption: 'keep me' },
          { mediaId: 'media-other', order: 1 },
        ],
      })
      .mockResolvedValueOnce({
        docId: 'card-1',
        title: 'Existing Card',
        coverImageId: 'cover-keep',
        galleryMedia: [
          { mediaId: 'media-existing', order: 0, caption: 'keep me' },
          { mediaId: 'media-other', order: 1 },
          { mediaId: 'media-new', order: 2 },
        ],
      });

    const result = await applyRestorePlanRow(row, {} as never);

    expect(updateCardGallery).toHaveBeenCalledWith('card-1', [
      { mediaId: 'media-existing', order: 0, caption: 'keep me' },
      { mediaId: 'media-other', order: 1 },
      { mediaId: 'media-new', order: 2 },
    ]);
    expect(updateCardCover).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      folderPath: 'root/folder',
      mode: 'merged-existing-card',
      cardId: 'card-1',
      addedMediaCount: 1,
      mutatedCard: true,
      coverImageId: 'cover-keep',
    });
  });

  it('creates new cards with strict complete-success mode enabled', async () => {
    const row: RestorePlanRow = {
      folderPath: 'root/new-folder',
      importSourcePath: 'root/new-folder/yEdited',
      title: 'new-folder',
      expectedImageCount: 2,
      action: 'create-card',
      existingCardId: null,
      existingTitle: null,
    };

    importFolderAsCard.mockResolvedValueOnce({
      cardId: 'card-new',
      title: 'new-folder',
      importedCount: 2,
      failedPaths: [],
    });

    const result = await applyRestorePlanRow(row, {} as never);

    expect(importFolderAsCard).toHaveBeenCalledWith('root/new-folder', {
      tagNameMaps: {},
      requireCompleteSuccess: true,
    });
    expect(result).toMatchObject({
      folderPath: 'root/new-folder',
      mode: 'created-card',
      cardId: 'card-new',
      importedCount: 2,
    });
  });
});
