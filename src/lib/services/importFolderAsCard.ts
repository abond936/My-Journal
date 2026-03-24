import fs from 'fs/promises';
import path from 'path';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';
import {
  createCard,
  updateCard,
  findCardByImportedFolder,
} from '@/lib/services/cardService';
import { normalizeImages } from '@/lib/scripts/normalize-images';
import type { GalleryMediaItem } from '@/lib/types/card';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

/** Max images per folder import to avoid serverless timeout. Override via IMPORT_FOLDER_MAX_IMAGES env. */
const IMPORT_FOLDER_MAX_IMAGES = parseInt(process.env.IMPORT_FOLDER_MAX_IMAGES || '50', 10) || 50;

/** Max subdirs per batch import to avoid timeout. Override via IMPORT_BATCH_MAX_SUBDIRS env. */
const IMPORT_BATCH_MAX_SUBDIRS = parseInt(process.env.IMPORT_BATCH_MAX_SUBDIRS || '20', 10) || 20;

/** Concurrent imports per batch to reduce total time. */
const CONCURRENT_IMPORTS = 5;

const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDbPath = (p: string) => p.split(path.sep).join('/');

async function importChunk(
  items: { path: string; order: number }[]
): Promise<{ galleryMedia: GalleryMediaItem[]; failedPaths: string[] }> {
  const results = await Promise.allSettled(
    items.map(async ({ path: relativeImagePath, order }) => {
      const { mediaId } = await importFromLocalDrive(relativeImagePath, { readMetadata: true });
      return { mediaId, order };
    })
  );
  const galleryMedia: GalleryMediaItem[] = [];
  const failedPaths: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      galleryMedia.push({
        mediaId: r.value.mediaId,
        order: r.value.order,
      });
    } else {
      failedPaths.push(items[i]!.path);
      if (r.status === 'rejected') {
        console.error(`[importFolderAsCard] Failed to import ${items[i]!.path}:`, r.reason);
      }
    }
  });
  return { galleryMedia, failedPaths };
}

export interface ImportFolderResult {
  cardId: string;
  title: string;
  importedCount: number;
  failedPaths: string[];
  normalized?: boolean;
  overwrote?: boolean;
}

export interface ImportFolderOptions {
  overwriteCardId?: string;
}

/**
 * Preview: determines import source and image count without running normalization.
 * Used by the UI to show what will be imported.
 */
export async function getImportFolderPreview(
  selectedFolderPath: string
): Promise<{ importSourcePath: string; imageCount: number; willNormalize: boolean; title: string }> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const trimmedPath = selectedFolderPath.trim().replace(/^\/+/, '');
  const normalizedPath = toSystemPath(trimmedPath);
  const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedPath);

  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read folder "${trimmedPath}": ${msg}`);
  }
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const imageFilesInFolder = entries.filter(
    (e) =>
      e.isFile() &&
      SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
  );

  const withMax = (o: { importSourcePath: string; imageCount: number; willNormalize: boolean; title: string }) =>
    ({ ...o, maxImages: IMPORT_FOLDER_MAX_IMAGES });

  if (subdirs.includes('yEdited')) {
    const yEditedFull = path.join(fullPath, 'yEdited');
    const yEntries = await fs.readdir(yEditedFull, { withFileTypes: true });
    const count = yEntries.filter(
      (e) =>
        e.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    ).length;
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    const title = path.basename(normalizedPath) || 'Untitled';
    return withMax({ importSourcePath, imageCount: count, willNormalize: true, title });
  }

  if (subdirs.includes('xNormalized')) {
    const xNormFull = path.join(fullPath, 'xNormalized');
    const xEntries = await fs.readdir(xNormFull, { withFileTypes: true });
    const count = xEntries.filter(
      (e) =>
        e.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    ).length;
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    const title = path.basename(normalizedPath) || 'Untitled';
    return withMax({ importSourcePath, imageCount: count, willNormalize: false, title });
  }

  if (imageFilesInFolder.length > 0) {
    const title = path.basename(normalizedPath) || 'Untitled';
    return withMax({
      importSourcePath: selectedFolderPath,
      imageCount: imageFilesInFolder.length,
      willNormalize: false,
      title,
    });
  }

  return withMax({
    importSourcePath: selectedFolderPath,
    imageCount: 0,
    willNormalize: false,
    title: path.basename(normalizedPath) || 'Untitled',
  });
}

/**
 * Runs normalization (yEdited -> xNormalized) when the selected folder has that structure.
 * Returns the path to import from (xNormalized or the folder with images).
 */
async function resolveImportSource(
  selectedFolderPath: string
): Promise<{ importSourcePath: string; normalized: boolean }> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const trimmedPath = selectedFolderPath.trim().replace(/^\/+/, '');
  const normalizedPath = toSystemPath(trimmedPath);
  const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedPath);

  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read folder "${trimmedPath}": ${msg}`);
  }
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const imageFiles = entries.filter(
    (e) =>
      e.isFile() &&
      SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
  );

  // If selected folder has yEdited, normalize to xNormalized and import from xNormalized
  if (subdirs.includes('yEdited')) {
    const yEditedFull = path.join(fullPath, 'yEdited');
    const xNormalizedFull = path.join(fullPath, 'xNormalized');

    try {
      await fs.access(yEditedFull);
    } catch {
      throw new Error(`yEdited folder not found or not accessible: ${selectedFolderPath}/yEdited`);
    }

    await normalizeImages(yEditedFull, xNormalizedFull);
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    return { importSourcePath, normalized: true };
  }

  // If selected folder has xNormalized as child (user selected parent)
  if (subdirs.includes('xNormalized')) {
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    return { importSourcePath, normalized: false };
  }

  // Selected folder has images directly
  if (imageFiles.length > 0) {
    return { importSourcePath: selectedFolderPath, normalized: false };
  }

  throw new Error(
    `No images or yEdited/xNormalized structure found in folder: ${selectedFolderPath}`
  );
}

/**
 * Imports all images from a folder as a gallery card.
 * - Runs normalization when folder has yEdited subfolder
 * - Card title from folder name
 * - First image as cover
 * - Captions from metadata when available
 * - Checks for existing import; returns existingCardId when duplicate found
 */
export async function importFolderAsCard(
  folderPath: string,
  options?: ImportFolderOptions
): Promise<ImportFolderResult | { exists: true; existingCardId: string; existingTitle: string }> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const { importSourcePath, normalized } = await resolveImportSource(folderPath);

  const fullImportPath = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(importSourcePath));
  const entries = await fs.readdir(fullImportPath, { withFileTypes: true });
  const imageFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  if (imageFiles.length === 0) {
    throw new Error(`No supported image files found in folder: ${importSourcePath}`);
  }

  if (imageFiles.length > IMPORT_FOLDER_MAX_IMAGES) {
    throw new Error(
      `Folder has ${imageFiles.length} images; maximum is ${IMPORT_FOLDER_MAX_IMAGES}. ` +
        `Split into smaller folders or set IMPORT_FOLDER_MAX_IMAGES.`
    );
  }

  const title = path.basename(toSystemPath(folderPath.trim().replace(/^\/+/, ''))) || 'Untitled';
  const galleryMedia: GalleryMediaItem[] = [];
  const failedPaths: string[] = [];

  const items = imageFiles.map((filename, i) => ({
    path: toDbPath(path.join(importSourcePath, filename)),
    order: i,
  }));

  for (let i = 0; i < items.length; i += CONCURRENT_IMPORTS) {
    const chunk = items.slice(i, i + CONCURRENT_IMPORTS);
    const { galleryMedia: chunkMedia, failedPaths: chunkFailed } = await importChunk(chunk);
    galleryMedia.push(...chunkMedia);
    failedPaths.push(...chunkFailed);
  }

  galleryMedia.sort((a, b) => a.order - b.order);

  if (galleryMedia.length === 0) {
    throw new Error(`Could not import any images from folder: ${importSourcePath}`);
  }

  const firstMediaId = galleryMedia[0].mediaId;

  // Overwrite existing card
  if (options?.overwriteCardId) {
    await updateCard(options.overwriteCardId, {
      title,
      coverImageId: firstMediaId,
      galleryMedia,
      importedFromFolder: importSourcePath,
    });
    return {
      cardId: options.overwriteCardId,
      title,
      importedCount: galleryMedia.length,
      failedPaths,
      normalized,
      overwrote: true,
    };
  }

  // Check for existing import
  const existing = await findCardByImportedFolder(importSourcePath);
  if (existing) {
    return {
      exists: true,
      existingCardId: existing.docId,
      existingTitle: existing.title,
    };
  }

  // Create new card
  const card = await createCard({
    title,
    type: 'gallery',
    status: 'draft',
    displayMode: 'navigate',
    coverImageId: firstMediaId,
    galleryMedia,
    importedFromFolder: importSourcePath,
  });

  return {
    cardId: card.docId,
    title: card.title,
    importedCount: galleryMedia.length,
    failedPaths,
    normalized,
  };
}

// --- Media-only import (no card) ---

export interface ImportFolderAsMediaResult {
  importedCount: number;
  skippedCount: number;
  failedPaths: string[];
  mediaIds: string[];
  importSourcePath: string;
  normalized?: boolean;
}

/**
 * Imports images from a folder into Media collection only (no card).
 * Skips images that already exist (by sourcePath).
 */
export async function importFolderAsMediaOnly(
  folderPath: string
): Promise<ImportFolderAsMediaResult> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const { importSourcePath, normalized } = await resolveImportSource(folderPath);

  const fullImportPath = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(importSourcePath));
  const entries = await fs.readdir(fullImportPath, { withFileTypes: true });
  const imageFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  if (imageFiles.length === 0) {
    return {
      importedCount: 0,
      skippedCount: 0,
      failedPaths: [],
      mediaIds: [],
      importSourcePath,
      normalized,
    };
  }

  if (imageFiles.length > IMPORT_FOLDER_MAX_IMAGES) {
    throw new Error(
      `Folder has ${imageFiles.length} images; maximum is ${IMPORT_FOLDER_MAX_IMAGES}. ` +
        `Split into smaller folders or set IMPORT_FOLDER_MAX_IMAGES.`
    );
  }

  const mediaIds: string[] = [];
  const failedPaths: string[] = [];
  let skippedCount = 0;

  const items = imageFiles.map((filename) => toDbPath(path.join(importSourcePath, filename)));

  for (let i = 0; i < items.length; i += CONCURRENT_IMPORTS) {
    const chunk = items.slice(i, i + CONCURRENT_IMPORTS);
    const results = await Promise.allSettled(
      chunk.map((sourcePath) =>
        importFromLocalDrive(sourcePath, { readMetadata: true, skipIfExists: true })
      )
    );
    results.forEach((r, idx) => {
      const sourcePath = chunk[idx]!;
      if (r.status === 'fulfilled') {
        mediaIds.push(r.value.mediaId);
        if (r.value.skipped) skippedCount++;
      } else {
        failedPaths.push(sourcePath);
        console.error('[importFolderAsMediaOnly] Failed:', sourcePath, r.reason);
      }
    });
  }

  return {
    importedCount: mediaIds.length - skippedCount,
    skippedCount,
    failedPaths,
    mediaIds,
    importSourcePath,
    normalized,
  };
}

// --- Batch discovery and import ---

export interface DiscoveredSubdir {
  folderPath: string;
  importSourcePath: string;
  imageCount: number;
  title: string;
}

/**
 * Recursively finds all subdirectories under root that contain xNormalized (or have images directly).
 * Returns the list of folders that can be imported.
 */
export async function discoverNormalizedSubdirs(
  rootPath: string
): Promise<DiscoveredSubdir[]> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const trimmedPath = rootPath.trim().replace(/^\/+/, '');
  const normalizedPath = toSystemPath(trimmedPath);
  const fullRoot = path.join(ONEDRIVE_ROOT_FOLDER, normalizedPath);

  const result: DiscoveredSubdir[] = [];

  async function walk(currentRelative: string): Promise<void> {
    const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(currentRelative));
    let entries: { name: string; isFile: () => boolean; isDirectory: () => boolean }[];
    try {
      entries = await fs.readdir(fullPath, { withFileTypes: true });
    } catch {
      return;
    }

    const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const imageFiles = entries.filter(
      (e) =>
        e.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    );

    if (subdirs.includes('xNormalized')) {
      const xNormPath = path.join(currentRelative, 'xNormalized');
      const xNormFull = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(xNormPath));
      let count = 0;
      try {
        const xEntries = await fs.readdir(xNormFull, { withFileTypes: true });
        count = xEntries.filter(
          (e) =>
            e.isFile() &&
            SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
        ).length;
      } catch {
        /* skip */
      }
      if (count > 0) {
        const parentName = path.basename(toSystemPath(currentRelative)) || 'Untitled';
        result.push({
          folderPath: toDbPath(currentRelative),
          importSourcePath: toDbPath(xNormPath),
          imageCount: count,
          title: parentName,
        });
      }
      return;
    }

    if (subdirs.includes('yEdited') && !subdirs.includes('xNormalized')) {
      return;
    }

    if (imageFiles.length > 0 && !subdirs.includes('xNormalized') && !subdirs.includes('yEdited')) {
      const parentName = path.basename(toSystemPath(currentRelative)) || 'Untitled';
      result.push({
        folderPath: toDbPath(currentRelative),
        importSourcePath: toDbPath(currentRelative),
        imageCount: imageFiles.length,
        title: parentName,
      });
      return;
    }

    for (const name of subdirs) {
      if (['xNormalized', 'yEdited', 'zOriginals'].includes(name)) continue;
      await walk(path.join(currentRelative, name));
    }
  }

  await walk(trimmedPath || '.');
  return result.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
}

export interface BatchImportMediaResult {
  subdirResults: Array<{
    folderPath: string;
    title: string;
    importedCount: number;
    skippedCount: number;
    failedPaths: string[];
  }>;
  totalImported: number;
  totalSkipped: number;
  totalFailed: number;
}

/**
 * Discovers all xNormalized subdirs under root and imports each as media-only.
 */
export async function batchImportMediaOnly(rootPath: string): Promise<BatchImportMediaResult> {
  const subdirs = await discoverNormalizedSubdirs(rootPath);

  if (subdirs.length > IMPORT_BATCH_MAX_SUBDIRS) {
    throw new Error(
      `Found ${subdirs.length} subdirs; maximum per batch is ${IMPORT_BATCH_MAX_SUBDIRS}. ` +
        `Set IMPORT_BATCH_MAX_SUBDIRS or run import on a smaller root.`
    );
  }

  const subdirResults: BatchImportMediaResult['subdirResults'] = [];
  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const sub of subdirs) {
    try {
      const r = await importFolderAsMediaOnly(sub.folderPath);
      subdirResults.push({
        folderPath: sub.folderPath,
        title: sub.title,
        importedCount: r.importedCount,
        skippedCount: r.skippedCount,
        failedPaths: r.failedPaths,
      });
      totalImported += r.importedCount;
      totalSkipped += r.skippedCount;
      totalFailed += r.failedPaths.length;
    } catch (err) {
      console.error('[batchImportMediaOnly] Failed for', sub.folderPath, err);
      subdirResults.push({
        folderPath: sub.folderPath,
        title: sub.title,
        importedCount: 0,
        skippedCount: 0,
        failedPaths: [String(err)],
      });
      totalFailed++;
    }
  }

  return {
    subdirResults,
    totalImported,
    totalSkipped,
    totalFailed,
  };
}
