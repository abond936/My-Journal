import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  calculateDerivedTagData,
  getAllTags,
  getTagAncestors,
  organizeTagsByDimension,
  updateTagCountsForMedia,
} from '@/lib/firebase/tagService';
import { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import {
  syncMediaToTypesense,
  syncMediaToTypesenseById,
} from '@/lib/services/typesenseMediaService';
import { getPublicStorageUrl } from '@/lib/utils/storageUrl';
import { normalizeBufferToWebp, isCardExportMarkedFilename } from '@/lib/services/images/inMemoryWebpNormalize';
import {
  readEmbeddedCaptionAndKeywords,
  resolveKeywordStringsToTagIds,
} from '@/lib/services/images/embeddedMetadataForImport';
import { getCachedTagNameMaps } from '@/lib/services/images/importTagMapsCache';
import * as admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import sizeOf from 'image-size';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

// Utility functions for consistent path handling
const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDatabasePath = (p: string) => p.split(path.sep).join('/');

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

/**
 * Finds an existing media document by sourcePath (for duplicate detection).
 * @param sourcePath - The relative path used when importing (database format, forward slashes)
 * @returns The existing Media doc if found, null otherwise
 */
export async function findMediaBySourcePath(sourcePath: string): Promise<Media | null> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const snapshot = await firestore
    .collection('media')
    .where('sourcePath', '==', sourcePath)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ...doc.data(), docId: doc.id } as Media;
}

/**
 * Reads caption from embedded metadata only (ExifTool). No JSON sidecars.
 * @param fullPath - Absolute path to the image file
 */
export async function readMetadataCaption(fullPath: string): Promise<string> {
  try {
    const { caption } = await readEmbeddedCaptionAndKeywords(fullPath);
    return caption;
  } catch {
    return '';
  }
}

/**
 * Creates a new media asset in the system. This is the central function for all image imports.
 * It handles file processing, uploading to Storage, and creating the canonical document in Firestore.
 *
 * @param fileBuffer - The buffer containing the image data.
 * @param originalFilename - The original name of the file.
 * @param source - The source of the image (e.g., 'local-drive', 'upload').
 * @param sourcePath - The original path or identifier from the source.
 * @param tagIds - Optional tag IDs from embedded keywords (updates mediaCount in same transaction).
 * @returns A promise that resolves with the new Media object.
 */
async function createMediaAsset(
  fileBuffer: Buffer,
  originalFilename: string,
  source: Media['source'],
  sourcePath: string,
  captionOverride?: string,
  tagIds?: string[]
): Promise<Media> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();

  // 1. Analyze the image and get dimensions
  const image = sharp(fileBuffer);
  const metadata = await image.metadata();

  // Always derive reliable dimensions using image-size
  let { width, height } = metadata as { width?: number; height?: number };
  if (!width || !height) {
    const dims = sizeOf(fileBuffer);
    width = dims.width;
    height = dims.height;
  }

  if (!width || !height) {
    throw new Error('Could not determine image dimensions.');
  }

  // 2. Create Firestore document reference to get docId
  const mediaRef = firestore.collection('media').doc();
  const docId = mediaRef.id;
  const storageFilename = `${docId}-${originalFilename}`;

  // 3. Upload to Firebase Storage
  const storagePath = `images/${storageFilename}`;
  const file = bucket.file(storagePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    },
  });

  // 4. Build permanent public URL (no expiration; requires Storage rules for public read)
  const storageUrl = getPublicStorageUrl(storagePath);

  const tagIdsResolved = [
    ...new Set((tagIds || []).filter((id): id is string => typeof id === 'string' && id.length > 0)),
  ];

  let derived: Awaited<ReturnType<typeof calculateDerivedTagData>> | null = null;
  if (tagIdsResolved.length > 0) {
    derived = await calculateDerivedTagData(tagIdsResolved);
  }

  // 5. Construct the canonical Media object
  const now = Date.now();
  const baseFields = {
    docId: docId,
    filename: originalFilename,
    width,
    height,
    size: fileBuffer.length, // File size in bytes
    contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    storageUrl,
    storagePath,
    source,
    sourcePath,
    objectPosition: '50% 50%',
    caption: captionOverride ?? '',
    createdAt: now,
    updatedAt: now,
  };

  const newMedia: Media = derived
    ? {
        ...baseFields,
        tags: tagIdsResolved,
        filterTags: derived.filterTags,
        who: derived.dimensionalTags.who ?? [],
        what: derived.dimensionalTags.what ?? [],
        when: derived.dimensionalTags.when ?? [],
        where: derived.dimensionalTags.where ?? [],
        hasTags: true,
        hasWho: (derived.dimensionalTags.who ?? []).length > 0,
        hasWhat: (derived.dimensionalTags.what ?? []).length > 0,
        hasWhen: (derived.dimensionalTags.when ?? []).length > 0,
        hasWhere: (derived.dimensionalTags.where ?? []).length > 0,
      }
    : {
        ...baseFields,
        hasTags: false,
        hasWho: false,
        hasWhat: false,
        hasWhen: false,
        hasWhere: false,
      };

  // 6. Save media + tag counts atomically when tags are present
  if (tagIdsResolved.length > 0) {
    // Pre-read tag.path outside the transaction so we never call transaction.getAll after writes
    // (Firestore: all reads before all writes in a transaction).
    const tagRefs = tagIdsResolved.map((id) => firestore.collection('tags').doc(id));
    const tagSnapshots = await firestore.getAll(...tagRefs);
    const tagPathLookup = new Map<string, Tag>();
    for (const snap of tagSnapshots) {
      if (snap.exists) {
        tagPathLookup.set(snap.id, snap.data() as Tag);
      }
    }

    await firestore.runTransaction(async (tx) => {
      tx.set(mediaRef, newMedia);
      await updateTagCountsForMedia([], tagIdsResolved, tx, tagPathLookup);
    });
  } else {
    await mediaRef.set(newMedia);
  }

  void syncMediaToTypesense(newMedia);

  return newMedia;
}

/** Built from Firestore tags — maps display names to tag doc IDs for embedded keyword resolution. */
export type ImportTagNameMaps = {
  exact: Map<string, string>;
  lower: Map<string, string>;
};

export interface ImportFromLocalOptions {
  /** If true, reads caption + keywords from embedded metadata (ExifTool); maps keywords when keywords exist. */
  readMetadata?: boolean;
  /**
   * Optional prebuilt keyword→tag maps. If omitted and embedded keywords exist, maps are loaded once via cache
   * (`getCachedTagNameMaps`). Omit for gallery import so a full Firestore tag load is skipped when files have no keywords.
   */
  tagNameMaps?: ImportTagNameMaps;
  /** If true, skip import when a media doc with same sourcePath already exists; return existing */
  skipIfExists?: boolean;
  /**
   * If true, WebP-optimize in memory (rotate, resize cap, quality) then upload—no xNormalized folder on disk.
   * Used for folder import workflows; `sourcePath` still points at the original file for dedup.
   */
  normalizeInMemory?: boolean;
  /** When Exif/exec fails but import continues, collect a short message per file (e.g. for API `metadataReadIssues`). */
  collectMetadataReadIssue?: (sourcePath: string, message: string) => void;
}

export interface ImportFromLocalResult {
  mediaId: string;
  media: Media;
  /** True when an existing media doc was returned (duplicate skipped) */
  skipped?: boolean;
}

/**
 * Imports an image from the local filesystem. Reads the file and passes it to the central creator function.
 *
 * @param sourcePath - The relative path of the image from the local drive root.
 * @param options - Optional: readMetadata, skipIfExists (skip duplicate by sourcePath)
 * @returns A promise that resolves with the new or existing Media object.
 */
export async function importFromLocalDrive(
  sourcePath: string,
  options?: ImportFromLocalOptions
): Promise<ImportFromLocalResult> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  try {
    if (options?.skipIfExists) {
      const existing = await findMediaBySourcePath(sourcePath);
      if (existing) {
        return {
          mediaId: existing.docId,
          media: existing,
          skipped: true,
        };
      }
    }

    // Convert database path (with forward slashes) to system path
    const normalizedSourcePath = toSystemPath(sourcePath);
    const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedSourcePath);

    /**
     * ExifTool reads from disk; `fs.readFile` loads the whole image — order Exif first so we avoid
     * buffering multi‑MB files before discovering there is no caption (and OS cache helps the follow-up read).
     * Tag name maps: load only when embedded keywords exist (avoids a full Firestore tag scan when captions-only).
     */
    const traceStages = Boolean(options?.readMetadata) && process.env.DEBUG_IMPORT === '1';

    let caption: string | undefined;
    let resolvedTagIds: string[] | undefined;
    if (options?.readMetadata) {
      const exifT0 = Date.now();
      const meta = await readEmbeddedCaptionAndKeywords(fullPath);
      if (traceStages) {
        console.info(
          '[importFromLocalDrive] stage exif',
          JSON.stringify({ sourcePath, ms: Date.now() - exifT0 })
        );
      }
      if (meta.infrastructureError) {
        options.collectMetadataReadIssue?.(sourcePath, meta.infrastructureError);
      }
      caption = meta.caption || undefined;
      if (meta.keywordStrings.length > 0) {
        const maps = options.tagNameMaps ?? (await getCachedTagNameMaps());
        resolvedTagIds = resolveKeywordStringsToTagIds(meta.keywordStrings, maps);
      }
    }

    const readT0 = Date.now();
    let fileBuffer = await fs.readFile(fullPath);
    let filename = path.basename(fullPath);
    if (traceStages) {
      console.info(
        '[importFromLocalDrive] stage readFile',
        JSON.stringify({ sourcePath, ms: Date.now() - readT0 })
      );
    }

    if (options?.normalizeInMemory) {
      const normT0 = Date.now();
      const { webpBuffer } = await normalizeBufferToWebp(fileBuffer);
      fileBuffer = webpBuffer;
      filename = `${path.parse(filename).name}.webp`;
      if (traceStages) {
        console.info(
          '[importFromLocalDrive] stage webp',
          JSON.stringify({ sourcePath, ms: Date.now() - normT0 })
        );
      }
    }

    const persistT0 = Date.now();
    // Create the raw media asset
    const newMedia = await createMediaAsset(
      fileBuffer,
      filename,
      'local',
      sourcePath,
      caption || undefined,
      resolvedTagIds
    );
    if (traceStages) {
      console.info(
        '[importFromLocalDrive] stage persist',
        JSON.stringify({ sourcePath, ms: Date.now() - persistT0, mediaId: newMedia.docId })
      );
    }

    // Return the hydrated object that the client expects
    return {
      mediaId: newMedia.docId,
      media: newMedia,
    };
  } catch (error) {
    console.error('[importFromLocalDrive] Error importing file:', {
      sourcePath,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    throw error;
  }
}

/**
 * Imports an image from a buffer (e.g., from an upload or paste).
 * Applies the same in-memory pipeline as folder import (`normalizeBufferToWebp`): EXIF rotate,
 * max dimension cap, WebP encode—unless the filename is a card-export marker (preserve pixels).
 *
 * @param fileBuffer - The buffer containing the image data.
 * @param originalFilename - The original name of the file.
 * @returns A promise that resolves with the new Media object, structured for client-side use.
 */
export async function importFromBuffer(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ mediaId: string; media: Media }> {
  try {
    let buffer = fileBuffer;
    let filename = originalFilename;
    if (!isCardExportMarkedFilename(originalFilename)) {
      const { webpBuffer } = await normalizeBufferToWebp(fileBuffer);
      buffer = webpBuffer;
      filename = `${path.parse(originalFilename).name}.webp`;
    }

    // For uploads/pastes, the sourcePath is just a representation of where it came from.
    const sourcePath = `upload://${filename}`;
    const newMedia = await createMediaAsset(buffer, filename, 'paste', sourcePath);

    // Return the hydrated object that the client expects
    return {
      mediaId: newMedia.docId,
      media: newMedia,
    };
  } catch (error) {
    console.error(`Failed to import image from buffer (${originalFilename}):`, error);
    throw new Error(`Failed to import uploaded image. See server logs for details.`);
  }
}

type MediaPatchFields = Partial<Pick<Media, 'caption' | 'objectPosition' | 'tags'>>;

const BULK_MEDIA_TAGS_CHUNK_SIZE = 400;

type MediaTagDerived = {
  filterTags: Record<string, boolean>;
  who: string[];
  what: string[];
  when: string[];
  where: string[];
  hasTags: boolean;
  hasWho: boolean;
  hasWhat: boolean;
  hasWhen: boolean;
  hasWhere: boolean;
  tags: string[];
};

async function deriveMediaTagFields(
  rawTagIds: string[],
  allTags: Tag[]
): Promise<MediaTagDerived> {
  const tags = Array.from(
    new Set(rawTagIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  if (!tags.length) {
    return {
      tags: [],
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      hasTags: false,
      hasWho: false,
      hasWhat: false,
      hasWhen: false,
      hasWhere: false,
    };
  }

  const ancestorTags = await getTagAncestors(tags, allTags);
  const inheritedTags = Array.from(new Set([...tags, ...ancestorTags]));
  const dimensionalTags = await organizeTagsByDimension(inheritedTags, allTags);
  const who = dimensionalTags.who ?? [];
  const what = dimensionalTags.what ?? [];
  const when = dimensionalTags.when ?? [];
  const where = dimensionalTags.where ?? [];
  const filterTags = inheritedTags.reduce((acc, tagId) => {
    acc[tagId] = true;
    return acc;
  }, {} as Record<string, boolean>);

  return {
    tags,
    filterTags,
    who,
    what,
    when,
    where,
    hasTags: tags.length > 0,
    hasWho: who.length > 0,
    hasWhat: what.length > 0,
    hasWhen: when.length > 0,
    hasWhere: where.length > 0,
  };
}

async function applyTagFieldsToPayload(
  payload: Record<string, unknown>,
  tagIds: string[]
): Promise<void> {
  const raw = tagIds.filter((id): id is string => typeof id === 'string');
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(raw);
  payload.tags = raw;
  payload.filterTags = filterTags;
  payload.who = dimensionalTags.who ?? [];
  payload.what = dimensionalTags.what ?? [];
  payload.when = dimensionalTags.when ?? [];
  payload.where = dimensionalTags.where ?? [];
  payload.hasTags = raw.length > 0;
  payload.hasWho = (dimensionalTags.who ?? []).length > 0;
  payload.hasWhat = (dimensionalTags.what ?? []).length > 0;
  payload.hasWhen = (dimensionalTags.when ?? []).length > 0;
  payload.hasWhere = (dimensionalTags.where ?? []).length > 0;
}

/**
 * Partial update for media metadata (admin). At least one supported field must be provided.
 */
export async function patchMediaDocument(mediaId: string, updates: MediaPatchFields): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const mediaRef = firestore.collection('media').doc(mediaId);

  const doc = await mediaRef.get();
  if (!doc.exists) {
    throw new Error(`Media document with ID ${mediaId} not found.`);
  }

  const hasField =
    updates.caption !== undefined ||
    updates.objectPosition !== undefined ||
    updates.tags !== undefined;
  if (!hasField) {
    throw new Error('No valid fields to update.');
  }

  if (updates.tags !== undefined) {
    if (!Array.isArray(updates.tags)) {
      throw new Error('tags must be an array of tag IDs.');
    }
    const newTags = updates.tags.filter((id): id is string => typeof id === 'string');

    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(mediaRef);
      if (!snap.exists) {
        throw new Error(`Media document with ID ${mediaId} not found.`);
      }
      const oldTags = (snap.data() as Media).tags || [];
      await updateTagCountsForMedia(oldTags, newTags, tx);

      const payload: Record<string, unknown> = { updatedAt: Date.now() };
      if (updates.caption !== undefined) {
        payload.caption = updates.caption;
      }
      if (updates.objectPosition !== undefined) {
        const trimmed = updates.objectPosition.trim();
        if (!trimmed) {
          throw new Error('objectPosition cannot be empty.');
        }
        payload.objectPosition = trimmed;
      }
      await applyTagFieldsToPayload(payload, newTags);
      tx.update(mediaRef, payload);
    });
    void syncMediaToTypesenseById(mediaId);
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: Date.now() };

  if (updates.caption !== undefined) {
    payload.caption = updates.caption;
  }
  if (updates.objectPosition !== undefined) {
    const trimmed = updates.objectPosition.trim();
    if (!trimmed) {
      throw new Error('objectPosition cannot be empty.');
    }
    payload.objectPosition = trimmed;
  }

  await mediaRef.update(payload);
  void syncMediaToTypesenseById(mediaId);
}

export async function bulkApplyMediaTags(
  mediaIds: string[],
  tagIds: string[],
  mode: 'add' | 'replace' | 'remove' = 'add'
): Promise<{ updatedIds: string[] }> {
  const ids = Array.from(
    new Set(mediaIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  if (!ids.length) return { updatedIds: [] };

  const normalizedMode: 'add' | 'replace' | 'remove' =
    mode === 'replace' || mode === 'remove' ? mode : 'add';
  const incomingTags = Array.from(
    new Set(tagIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );

  const app = getAdminApp();
  const firestore = app.firestore();
  const allTags = await getAllTags();
  const tagPathLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derivedCache = new Map<string, MediaTagDerived>();
  const updatedIds: string[] = [];

  for (let i = 0; i < ids.length; i += BULK_MEDIA_TAGS_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + BULK_MEDIA_TAGS_CHUNK_SIZE);
    await firestore.runTransaction(async (tx) => {
      const refs = chunk.map((id) => firestore.collection('media').doc(id));
      const docs = await tx.getAll(...refs);

      for (const mediaDoc of docs) {
        if (!mediaDoc.exists) continue;
        const media = mediaDoc.data() as Media;
        const existingTags = (media.tags || []).filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0
        );

        let nextTags: string[];
        if (normalizedMode === 'replace') {
          nextTags = incomingTags;
        } else if (normalizedMode === 'remove') {
          const removeSet = new Set(incomingTags);
          nextTags = existingTags.filter((id) => !removeSet.has(id));
        } else {
          nextTags = Array.from(new Set([...existingTags, ...incomingTags]));
        }

        const unchanged =
          nextTags.length === existingTags.length &&
          nextTags.every((id) => existingTags.includes(id));
        if (unchanged) continue;

        const cacheKey = [...nextTags].sort((a, b) => a.localeCompare(b)).join('\u001f');
        let derived = derivedCache.get(cacheKey);
        if (!derived) {
          derived = await deriveMediaTagFields(nextTags, allTags);
          derivedCache.set(cacheKey, derived);
        }

        await updateTagCountsForMedia(existingTags, derived.tags, tx, tagPathLookup);
        tx.update(mediaDoc.ref, {
          tags: derived.tags,
          filterTags: derived.filterTags,
          who: derived.who,
          what: derived.what,
          when: derived.when,
          where: derived.where,
          hasTags: derived.hasTags,
          hasWho: derived.hasWho,
          hasWhat: derived.hasWhat,
          hasWhen: derived.hasWhen,
          hasWhere: derived.hasWhere,
          updatedAt: Date.now(),
        });
        updatedIds.push(mediaDoc.id);
      }
    });
  }

  const uniqueUpdatedIds = Array.from(new Set(updatedIds));
  uniqueUpdatedIds.forEach((id) => void syncMediaToTypesenseById(id));
  return { updatedIds: uniqueUpdatedIds };
}

/**
 * Replaces the binary content of an existing media asset in place.
 * Keeps media doc ID and references stable while refreshing metadata fields.
 */
export async function replaceMediaAssetContent(
  mediaId: string,
  fileBuffer: Buffer,
  originalFilename: string
): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);

  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) {
    throw new Error(`Media document with ID ${mediaId} not found.`);
  }

  const existing = mediaSnap.data() as Media;
  if (!existing.storagePath) {
    throw new Error(`Media document with ID ${mediaId} has no storagePath.`);
  }

  const image = sharp(fileBuffer);
  const metadata = await image.metadata();
  let { width, height } = metadata as { width?: number; height?: number };
  if (!width || !height) {
    const dims = sizeOf(fileBuffer);
    width = dims.width;
    height = dims.height;
  }
  if (!width || !height) {
    throw new Error('Could not determine replacement image dimensions.');
  }

  const contentType = metadata.format ? `image/${metadata.format}` : 'application/octet-stream';
  const storageFile = bucket.file(existing.storagePath);
  await storageFile.save(fileBuffer, {
    metadata: { contentType },
  });

  const storageUrl = getPublicStorageUrl(existing.storagePath);

  await mediaRef.update({
    filename: originalFilename || existing.filename,
    width,
    height,
    size: fileBuffer.length,
    contentType,
    storageUrl,
    updatedAt: Date.now(),
  });
  void syncMediaToTypesenseById(mediaId);
}

// Storage-only helpers live in `./mediaStorage` so card/media read paths can
// import them without pulling the ExifTool graph through this file. Re-exported
// here for backward compatibility with existing callers (`useImageImport.ts`,
// other import-side modules).
export {
  deleteFromStorageWithRetry,
  deleteMediaAsset,
  markStorageForLaterDeletion,
} from './mediaStorage';

export type RepairMissingStorageResult =
  | { ok: true; dryRun: boolean; message: string }
  | { ok: false; message: string };

/**
 * When a media doc references a Storage path but the object is missing (deleted upload, failed write, etc.),
 * re-read the original bytes from disk for **local** imports (`source: 'local'` + `sourcePath` under
 * `ONEDRIVE_ROOT_FOLDER`) and re-upload in place. Preserves media doc id, `storagePath`, and all card references.
 * Paste/upload sources cannot be auto-repaired (no canonical file on disk).
 */
export async function repairMissingStorageFromLocalSource(
  mediaId: string,
  options?: { dryRun?: boolean }
): Promise<RepairMissingStorageResult> {
  const dryRun = options?.dryRun ?? false;
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);
  const snap = await mediaRef.get();
  if (!snap.exists) {
    return { ok: false, message: `Media document ${mediaId} not found.` };
  }
  const m = snap.data() as Media;
  if (!m.storagePath?.trim()) {
    return { ok: false, message: `Media ${mediaId} has no storagePath.` };
  }
  const storageFile = bucket.file(m.storagePath);
  const [exists] = await storageFile.exists();
  if (exists) {
    return { ok: false, message: `Storage object already exists at ${m.storagePath}; nothing to repair.` };
  }
  if (m.source !== 'local') {
    return {
      ok: false,
      message:
        `Automatic repair only supports source=local (this doc has source=${String(m.source)}). ` +
        `Re-upload the file via Media admin or POST /api/images/${mediaId}/replace.`,
    };
  }
  if (!ONEDRIVE_ROOT_FOLDER) {
    return { ok: false, message: 'ONEDRIVE_ROOT_FOLDER is not set; cannot resolve local source file.' };
  }
  const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, toSystemPath(m.sourcePath));
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(fullPath);
  } catch {
    return { ok: false, message: `Could not read local file: ${fullPath}` };
  }

  const sourceBase = path.basename(m.sourcePath);
  let outBuf = fileBuffer;
  let uploadFilename = (m.filename && m.filename.trim()) || sourceBase;
  if (!isCardExportMarkedFilename(sourceBase)) {
    const { webpBuffer } = await normalizeBufferToWebp(fileBuffer);
    outBuf = webpBuffer;
    uploadFilename = `${path.parse(sourceBase).name}.webp`;
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      message: `Would re-upload to ${m.storagePath} using ${fullPath} (${outBuf.length} bytes, filename ${uploadFilename}).`,
    };
  }

  await replaceMediaAssetContent(mediaId, outBuf, uploadFilename);
  return {
    ok: true,
    dryRun: false,
    message: `Re-uploaded Storage object at ${m.storagePath} from ${fullPath}.`,
  };
}