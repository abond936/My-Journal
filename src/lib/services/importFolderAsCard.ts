import fs from 'fs/promises';
import path from 'path';
import { getAllTags } from '@/lib/firebase/tagService';
import { buildTagNameLookupMaps } from '@/lib/services/images/embeddedMetadataForImport';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';
import {
  createCard,
  updateCard,
  findCardByImportedFolder,
} from '@/lib/services/cardService';
import { isCardExportMarkedFilename } from '@/lib/services/images/inMemoryWebpNormalize';
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

/** Only files whose basename ends with `__X` before extension (card export marker). */
function filterMarkedImageFilenames(filenames: string[]): string[] {
  return filenames
    .filter((n) => SUPPORTED_EXTENSIONS.includes(path.extname(n).toLowerCase()))
    .filter(isCardExportMarkedFilename)
    .sort((a, b) => a.localeCompare(b));
}

async function importChunk(
  items: { path: string; order: number }[],
  tagNameMaps: ReturnType<typeof buildTagNameLookupMaps>
): Promise<{ galleryMedia: GalleryMediaItem[]; failedPaths: string[] }> {
  const results = await Promise.allSettled(
    items.map(async ({ path: relativeImagePath, order }) => {
      const { mediaId } = await importFromLocalDrive(relativeImagePath, {
        readMetadata: true,
        tagNameMaps,
        normalizeInMemory: true,
      });
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
    const names = yEntries.filter((e) => e.isFile()).map((e) => e.name);
    const marked = filterMarkedImageFilenames(names);
    const importSourcePath = toDbPath(path.join(normalizedPath, 'yEdited'));
    const title = path.basename(normalizedPath) || 'Untitled';
    return withMax({
      importSourcePath,
      imageCount: marked.length,
      willNormalize: marked.length > 0,
      title,
    });
  }

  if (subdirs.includes('xNormalized')) {
    const xNormFull = path.join(fullPath, 'xNormalized');
    const xEntries = await fs.readdir(xNormFull, { withFileTypes: true });
    const names = xEntries.filter((e) => e.isFile()).map((e) => e.name);
    const marked = filterMarkedImageFilenames(names);
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    const title = path.basename(normalizedPath) || 'Untitled';
    return withMax({
      importSourcePath,
      imageCount: marked.length,
      willNormalize: marked.length > 0,
      title,
    });
  }

  if (imageFilesInFolder.length > 0) {
    const title = path.basename(normalizedPath) || 'Untitled';
    const marked = filterMarkedImageFilenames(imageFilesInFolder.map((e) => e.name));
    return withMax({
      importSourcePath: selectedFolderPath,
      imageCount: marked.length,
      willNormalize: marked.length > 0,
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
 * Resolves which directory to read image files from.
 * WebP optimization runs in memory on import—no yEdited → xNormalized disk write.
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

  if (subdirs.includes('yEdited')) {
    const yEditedFull = path.join(fullPath, 'yEdited');
    try {
      await fs.access(yEditedFull);
    } catch {
      throw new Error(`yEdited folder not found or not accessible: ${selectedFolderPath}/yEdited`);
    }
    const importSourcePath = toDbPath(path.join(normalizedPath, 'yEdited'));
    return { importSourcePath, normalized: true };
  }

  if (subdirs.includes('xNormalized')) {
    const importSourcePath = toDbPath(path.join(normalizedPath, 'xNormalized'));
    return { importSourcePath, normalized: false };
  }

  if (imageFiles.length > 0) {
    return { importSourcePath: selectedFolderPath, normalized: false };
  }

  throw new Error(
    `No images or yEdited/xNormalized structure found in folder: ${selectedFolderPath}`
  );
}

/**
 * Imports all `__X`-marked images from a folder as a gallery card.
 * - WebP optimization in memory during upload (no xNormalized on disk)
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
  const imageFiles = filterMarkedImageFilenames(
    entries
      .filter(
        (e) =>
          e.isFile() &&
          SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
      )
      .map((e) => e.name)
  );

  if (imageFiles.length === 0) {
    throw new Error(
      `No images matching the __X export marker in folder: ${importSourcePath}. ` +
        `Use names like photo__X.jpg (two underscores and uppercase X before the extension).`
    );
  }

  if (imageFiles.length > IMPORT_FOLDER_MAX_IMAGES) {
    throw new Error(
      `Folder has ${imageFiles.length} marked images; maximum is ${IMPORT_FOLDER_MAX_IMAGES}. ` +
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

  const tagNameMaps = buildTagNameLookupMaps(await getAllTags());

  for (let i = 0; i < items.length; i += CONCURRENT_IMPORTS) {
    const chunk = items.slice(i, i + CONCURRENT_IMPORTS);
    const { galleryMedia: chunkMedia, failedPaths: chunkFailed } = await importChunk(chunk, tagNameMaps);
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
  const imageFiles = filterMarkedImageFilenames(
    entries
      .filter(
        (e) =>
          e.isFile() &&
          SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
      )
      .map((e) => e.name)
  );

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
      `Folder has ${imageFiles.length} marked images; maximum is ${IMPORT_FOLDER_MAX_IMAGES}. ` +
        `Split into smaller folders or set IMPORT_FOLDER_MAX_IMAGES.`
    );
  }

  const mediaIds: string[] = [];
  const failedPaths: string[] = [];
  let skippedCount = 0;

  const items = imageFiles.map((filename) => toDbPath(path.join(importSourcePath, filename)));
  const tagNameMaps = buildTagNameLookupMaps(await getAllTags());

  for (let i = 0; i < items.length; i += CONCURRENT_IMPORTS) {
    const chunk = items.slice(i, i + CONCURRENT_IMPORTS);
    const results = await Promise.allSettled(
      chunk.map((sourcePath) =>
        importFromLocalDrive(sourcePath, {
          readMetadata: true,
          tagNameMaps,
          skipIfExists: true,
          normalizeInMemory: true,
        })
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
 * Recursively finds subdirs under root that contain `__X`-marked images
 * (flat folder, or xNormalized / yEdited child folders).
 */
export async function discoverNormalizedSubdirs(
  rootPath: string
): Promise<DiscoveredSubdir[]> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  const trimmedPath = rootPath.trim().replace(/^\/+/, '');
  const normalizedPath = toSystemPath(trimmedPath);

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
    const imageNamesHere = entries
      .filter(
        (e) =>
          e.isFile() &&
          SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
      )
      .map((e) => e.name);
    const markedHere = filterMarkedImageFilenames(imageNamesHere);

    if (subdirs.includes('xNormalized')) {
      const xNormPath = path.join(currentRelative, 'xNormalized');
      const xNormFull = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(xNormPath));
      let count = 0;
      try {
        const xEntries = await fs.readdir(xNormFull, { withFileTypes: true });
        const xNames = xEntries.filter((e) => e.isFile()).map((e) => e.name);
        count = filterMarkedImageFilenames(xNames).length;
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

    if (subdirs.includes('yEdited')) {
      const yPath = path.join(currentRelative, 'yEdited');
      const yFull = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(yPath));
      let count = 0;
      try {
        const yEntries = await fs.readdir(yFull, { withFileTypes: true });
        const yNames = yEntries.filter((e) => e.isFile()).map((e) => e.name);
        count = filterMarkedImageFilenames(yNames).length;
      } catch {
        /* skip */
      }
      if (count > 0) {
        const parentName = path.basename(toSystemPath(currentRelative)) || 'Untitled';
        result.push({
          folderPath: toDbPath(currentRelative),
          importSourcePath: toDbPath(yPath),
          imageCount: count,
          title: parentName,
        });
      }
      return;
    }

    if (markedHere.length > 0) {
      const parentName = path.basename(toSystemPath(currentRelative)) || 'Untitled';
      result.push({
        folderPath: toDbPath(currentRelative),
        importSourcePath: toDbPath(currentRelative),
        imageCount: markedHere.length,
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
