import type { Card, GalleryMediaItem } from '@/lib/types/card';

export type ImportFolderRestorePlan = {
  selectedFolderPath: string;
  importSourcePath: string;
  title: string;
  imageCount: number;
  willNormalize: boolean;
  normalized: boolean;
  existingCardId: string | null;
  existingTitle: string | null;
  action: 'create-card' | 'merge-existing-card';
};

export function buildImportFolderRestorePlan(input: {
  selectedFolderPath: string;
  importSourcePath: string;
  title: string;
  imageCount: number;
  willNormalize: boolean;
  normalized: boolean;
  existingCardId?: string | null;
  existingTitle?: string | null;
}): ImportFolderRestorePlan {
  const existingCardId = input.existingCardId ?? null;
  const existingTitle = input.existingTitle ?? null;

  return {
    selectedFolderPath: input.selectedFolderPath,
    importSourcePath: input.importSourcePath,
    title: input.title,
    imageCount: input.imageCount,
    willNormalize: input.willNormalize,
    normalized: input.normalized,
    existingCardId,
    existingTitle,
    action: existingCardId ? 'merge-existing-card' : 'create-card',
  };
}

export function ensureCompleteFolderImport(input: {
  expectedImageCount: number;
  importedCount: number;
  failedPaths: string[];
  operationLabel: string;
}): void {
  const failedCount = input.failedPaths.length;
  if (failedCount > 0) {
    throw new Error(
      `${input.operationLabel} imported ${input.importedCount}/${input.expectedImageCount} images; ` +
        `${failedCount} failed (${input.failedPaths.join(', ')}).`
    );
  }

  if (input.importedCount !== input.expectedImageCount) {
    throw new Error(
      `${input.operationLabel} imported ${input.importedCount}/${input.expectedImageCount} images; ` +
        'folder restore requires a complete match before mutation.'
    );
  }
}

export function buildGalleryWithExistingMediaPreserved(
  existingCard: Pick<Card, 'galleryMedia'>,
  restoredMediaIds: string[]
): NonNullable<Card['galleryMedia']> {
  const existingGallery = (existingCard.galleryMedia || []).filter(
    (item): item is NonNullable<Card['galleryMedia']>[number] => Boolean(item?.mediaId)
  );
  const merged: GalleryMediaItem[] = [];
  const seen = new Set<string>();

  for (const item of existingGallery) {
    if (seen.has(item.mediaId)) continue;
    merged.push({
      ...item,
      order: merged.length,
    });
    seen.add(item.mediaId);
  }

  for (const mediaId of restoredMediaIds) {
    if (!mediaId || seen.has(mediaId)) continue;
    merged.push({
      mediaId,
      order: merged.length,
    });
    seen.add(mediaId);
  }

  return merged;
}
