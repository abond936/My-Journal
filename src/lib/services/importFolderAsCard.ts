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

const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDbPath = (p: string) => p.split(path.sep).join('/');

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
    return { importSourcePath, imageCount: count, willNormalize: true, title };
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
    return { importSourcePath, imageCount: count, willNormalize: false, title };
  }

  if (imageFilesInFolder.length > 0) {
    const title = path.basename(normalizedPath) || 'Untitled';
    return {
      importSourcePath: selectedFolderPath,
      imageCount: imageFilesInFolder.length,
      willNormalize: false,
      title,
    };
  }

  return {
    importSourcePath: selectedFolderPath,
    imageCount: 0,
    willNormalize: false,
    title: path.basename(normalizedPath) || 'Untitled',
  };
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

  const title = path.basename(toSystemPath(folderPath.trim().replace(/^\/+/, ''))) || 'Untitled';
  const galleryMedia: GalleryMediaItem[] = [];
  const failedPaths: string[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const relativeImagePath = toDbPath(path.join(importSourcePath, filename));

    try {
      const { mediaId, media } = await importFromLocalDrive(relativeImagePath, {
        readMetadata: true,
      });

      galleryMedia.push({
        mediaId,
        order: i,
        ...(media.caption?.trim() && { caption: media.caption.trim() }),
      });
    } catch (err) {
      console.error(`[importFolderAsCard] Failed to import ${relativeImagePath}:`, err);
      failedPaths.push(relativeImagePath);
    }
  }

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
