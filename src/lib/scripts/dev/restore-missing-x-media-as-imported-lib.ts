import fs from 'fs/promises';
import path from 'path';
import { getAllTags } from '@/lib/firebase/tagService';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { updateCardCover } from '@/lib/services/cards/cardCoverMutationService';
import { updateCardGallery } from '@/lib/services/cards/cardGalleryMutationService';
import { getCardById } from '@/lib/services/cards/cardReadService';
import {
  ensureCompleteFolderImport,
  buildGalleryWithExistingMediaPreserved,
  type ImportFolderRestorePlan,
} from '@/lib/services/importFolderRestore';
import {
  getImportFolderRestorePlan,
  importFolderAsCard,
  importFolderAsMediaOnly,
  type ImportFolderResult,
} from '@/lib/services/importFolderAsCard';
import { buildTagNameLookupMaps } from '@/lib/services/images/embeddedMetadataForImport';

export type MissingReport = {
  files: string[];
};

export type RestorePlanRow =
  | {
      folderPath: string;
      importSourcePath: string;
      title: string;
      expectedImageCount: number;
      action: ImportFolderRestorePlan['action'];
      existingCardId: string | null;
      existingTitle: string | null;
    }
  | {
      folderPath: string;
      action: 'error';
      error: string;
    };

export type RestoreApplyRow =
  | {
      folderPath: string;
      mode: 'created-card';
      importSourcePath: string;
      cardId: string;
      title: string;
      expectedImageCount: number;
      importedCount: number;
      failedPaths: string[];
    }
  | {
      folderPath: string;
      mode: 'merged-existing-card';
      importSourcePath: string;
      cardId: string;
      title: string;
      expectedImageCount: number;
      importedCount: number;
      skippedCount: number;
      galleryCount: number;
      addedMediaCount: number;
      coverImageId: string | null;
      mutatedCard: boolean;
      failedPaths: string[];
    }
  | {
      folderPath: string;
      mode: 'error';
      error: string;
    };

export function uniqueFoldersFromMissingReport(report: MissingReport): string[] {
  const folders = new Set<string>();
  for (const file of report.files || []) {
    folders.add(path.posix.dirname(file));
  }
  return Array.from(folders).sort((a, b) => a.localeCompare(b));
}

export async function loadMissingReport(reportPath: string): Promise<MissingReport> {
  return JSON.parse(await fs.readFile(reportPath, 'utf8')) as MissingReport;
}

export async function buildRestorePlanRows(folders: string[]): Promise<RestorePlanRow[]> {
  const importedCardLookup = await loadImportedCardLookup();
  const rows: RestorePlanRow[] = [];
  for (const folderPath of folders) {
    try {
      const plan = await getImportFolderRestorePlan(folderPath, { existingCardLookup: importedCardLookup });
      if (plan.imageCount <= 0) {
        rows.push({
          folderPath,
          action: 'error',
          error: `No __X-marked images were found for ${folderPath}.`,
        });
        continue;
      }
      rows.push({
        folderPath,
        importSourcePath: plan.importSourcePath,
        title: plan.title,
        expectedImageCount: plan.imageCount,
        action: plan.action,
        existingCardId: plan.existingCardId,
        existingTitle: plan.existingTitle,
      });
    } catch (error) {
      rows.push({
        folderPath,
        action: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return rows;
}

export async function loadImportedCardLookup(): Promise<Map<string, { docId: string; title: string }>> {
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore.collection('cards').get();
  const lookup = new Map<string, { docId: string; title: string }>();

  for (const doc of snapshot.docs) {
    const data = doc.data() as { importedFromFolder?: string; title?: string };
    if (typeof data.importedFromFolder !== 'string' || !data.importedFromFolder.trim()) continue;
    lookup.set(data.importedFromFolder, {
      docId: doc.id,
      title: data.title ?? '(untitled)',
    });
  }

  return lookup;
}

export async function applyRestorePlanRow(
  row: RestorePlanRow,
  tagNameMaps: ReturnType<typeof buildTagNameLookupMaps>
): Promise<RestoreApplyRow> {
  if (row.action === 'error') {
    return {
      folderPath: row.folderPath,
      mode: 'error',
      error: row.error,
    };
  }

  try {
    if (row.action === 'create-card') {
      const created = await importFolderAsCard(row.folderPath, {
        tagNameMaps,
        requireCompleteSuccess: true,
      });
      if ('exists' in created && created.exists) {
        throw new Error(
          `Preflight expected create-card but found existing card ${created.existingCardId} (${created.existingTitle}).`
        );
      }
      const createdCard = created as ImportFolderResult;
      ensureCompleteFolderImport({
        expectedImageCount: row.expectedImageCount,
        importedCount: createdCard.importedCount,
        failedPaths: createdCard.failedPaths,
        operationLabel: `Create import for ${row.folderPath}`,
      });
      return {
        folderPath: row.folderPath,
        mode: 'created-card',
        importSourcePath: row.importSourcePath,
        cardId: createdCard.cardId,
        title: createdCard.title,
        expectedImageCount: row.expectedImageCount,
        importedCount: createdCard.importedCount,
        failedPaths: createdCard.failedPaths,
      };
    }

    if (!row.existingCardId) {
      throw new Error(`Merge plan for ${row.folderPath} is missing existingCardId.`);
    }

    const mediaRestore = await importFolderAsMediaOnly(row.folderPath, {
      tagNameMaps,
      requireCompleteSuccess: true,
    });
    ensureCompleteFolderImport({
      expectedImageCount: row.expectedImageCount,
      importedCount: mediaRestore.importedCount + mediaRestore.skippedCount,
      failedPaths: mediaRestore.failedPaths,
      operationLabel: `Merge import for ${row.folderPath}`,
    });

    const cardBefore = await getCardById(row.existingCardId);
    if (!cardBefore) {
      throw new Error(`Existing card ${row.existingCardId} disappeared before merge.`);
    }

    const existingGalleryIds = new Set(
      (cardBefore.galleryMedia || [])
        .map((item) => item?.mediaId)
        .filter((mediaId): mediaId is string => typeof mediaId === 'string' && mediaId.length > 0)
    );
    const mergedGallery = buildGalleryWithExistingMediaPreserved(cardBefore, mediaRestore.mediaIds);
    const addedMediaCount = mediaRestore.mediaIds.filter((mediaId) => !existingGalleryIds.has(mediaId)).length;
    const galleryChanged =
      mergedGallery.length !== (cardBefore.galleryMedia || []).length ||
      mergedGallery.some((item, index) => item.mediaId !== cardBefore.galleryMedia?.[index]?.mediaId);
    const nextCoverImageId = cardBefore.coverImageId ?? (mediaRestore.mediaIds[0] ?? null);
    const coverNeedsUpdate = !cardBefore.coverImageId && Boolean(nextCoverImageId);

    if (galleryChanged) {
      await updateCardGallery(row.existingCardId, mergedGallery);
    }
    if (coverNeedsUpdate) {
      await updateCardCover(row.existingCardId, { coverImageId: nextCoverImageId });
    }

    const cardAfter = (galleryChanged || coverNeedsUpdate)
      ? await getCardById(row.existingCardId)
      : cardBefore;
    if (!cardAfter) {
      throw new Error(`Existing card ${row.existingCardId} could not be loaded after merge.`);
    }

    return {
      folderPath: row.folderPath,
      mode: 'merged-existing-card',
      importSourcePath: row.importSourcePath,
      cardId: row.existingCardId,
      title: cardAfter.title || row.existingTitle || row.title || '(untitled)',
      expectedImageCount: row.expectedImageCount,
      importedCount: mediaRestore.importedCount,
      skippedCount: mediaRestore.skippedCount,
      galleryCount: cardAfter.galleryMedia?.length ?? mergedGallery.length,
      addedMediaCount,
      coverImageId: cardAfter.coverImageId ?? nextCoverImageId,
      mutatedCard: galleryChanged || coverNeedsUpdate,
      failedPaths: mediaRestore.failedPaths,
    };
  } catch (error) {
    return {
      folderPath: row.folderPath,
      mode: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function buildSharedRestoreTagNameMaps() {
  return buildTagNameLookupMaps(await getAllTags());
}

export function summarizePlanRows(rows: RestorePlanRow[]) {
  let createCount = 0;
  let mergeCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    if (row.action === 'create-card') createCount += 1;
    else if (row.action === 'merge-existing-card') mergeCount += 1;
    else errorCount += 1;
  }

  return {
    totalFolders: rows.length,
    createCount,
    mergeCount,
    errorCount,
  };
}

export function summarizeApplyRows(rows: RestoreApplyRow[]) {
  let createdCount = 0;
  let mergedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    if (row.mode === 'created-card') createdCount += 1;
    else if (row.mode === 'merged-existing-card') mergedCount += 1;
    else errorCount += 1;
  }

  return {
    totalFolders: rows.length,
    createdCount,
    mergedCount,
    errorCount,
  };
}
