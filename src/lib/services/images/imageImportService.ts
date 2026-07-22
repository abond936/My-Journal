import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  calculateDerivedTagData,
  getAllTags,
  getTagAncestors,
  organizeTagsByDimension,
  updateTagCountsForMedia,
} from '@/lib/firebase/tagService';
import { Media, type MediaReadinessStageName, type MediaSourceIdentity } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import {
  syncMediaToTypesenseById,
  syncMediaToTypesenseStrict,
} from '@/lib/services/typesenseMediaService';
import { getPublicStorageUrl } from '@/lib/utils/storageUrl';
import { normalizeSubjectTagId, normalizeSubjectTagIds, resolveSubjectTagState } from '@/lib/utils/subjectTag';
import { normalizeBufferToWebp, isCardExportMarkedFilename } from '@/lib/services/images/inMemoryWebpNormalize';
import {
  readEmbeddedCaptionAndKeywords,
  resolveKeywordStringsToTagIds,
} from '@/lib/services/images/embeddedMetadataForImport';
import { getCachedTagNameMaps } from '@/lib/services/images/importTagMapsCache';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import sizeOf from 'image-size';
import {
  buildMediaSourceIdentity,
  sha256SourceBytes,
} from '@/lib/utils/mediaDuplicateEvidence';
import {
  buildMediaReadiness,
  failedStage,
  getRetryableMediaStages,
  pendingStage,
  readyStage,
} from '@/lib/utils/mediaReadiness';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;
const STUDIO_RENDITION_MAX_WIDTH = 960;
const STUDIO_RENDITION_MAX_HEIGHT = 960;
const STUDIO_RENDITION_QUALITY = 78;
const READER_RENDITION_MAX_WIDTH = 640;
const READER_RENDITION_MAX_HEIGHT = 640;
const READER_RENDITION_QUALITY = 75;
const MEDIA_CONTENT_IDENTITIES_COLLECTION = 'mediaContentIdentities';

// Utility functions for consistent path handling
const toSystemPath = (p: string) => p.split('/').join(path.sep);

type StudioMediaRendition = NonNullable<NonNullable<Media['renditions']>['studio']>;
type ReaderMediaRendition = NonNullable<NonNullable<Media['renditions']>['reader']>;

function getStudioRenditionStoragePath(mediaId: string): string {
  return `images/renditions/studio/${mediaId}.webp`;
}

function getReaderRenditionStoragePath(mediaId: string): string {
  return `images/renditions/reader/${mediaId}.webp`;
}

function mergeMediaRenditions(
  studioRendition?: StudioMediaRendition,
  readerRendition?: ReaderMediaRendition
): Media['renditions'] | undefined {
  if (!studioRendition && !readerRendition) return undefined;
  return {
    ...(studioRendition ? { studio: studioRendition } : {}),
    ...(readerRendition ? { reader: readerRendition } : {}),
  };
}

async function buildStudioMediaRendition(
  mediaId: string,
  fileBuffer: Buffer
): Promise<{ buffer: Buffer; rendition: StudioMediaRendition }> {
  const { data, info } = await sharp(fileBuffer)
    .rotate()
    .resize(STUDIO_RENDITION_MAX_WIDTH, STUDIO_RENDITION_MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: STUDIO_RENDITION_QUALITY })
    .toBuffer({ resolveWithObject: true });

  const storagePath = getStudioRenditionStoragePath(mediaId);
  return {
    buffer: data,
    rendition: {
      storagePath,
      storageUrl: getPublicStorageUrl(storagePath),
      width: info.width,
      height: info.height,
      contentType: 'image/webp',
    },
  };
}

async function buildReaderMediaRendition(
  mediaId: string,
  fileBuffer: Buffer
): Promise<{ buffer: Buffer; rendition: ReaderMediaRendition }> {
  const { data, info } = await sharp(fileBuffer)
    .rotate()
    .resize(READER_RENDITION_MAX_WIDTH, READER_RENDITION_MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: READER_RENDITION_QUALITY })
    .toBuffer({ resolveWithObject: true });

  const storagePath = getReaderRenditionStoragePath(mediaId);
  return {
    buffer: data,
    rendition: {
      storagePath,
      storageUrl: getPublicStorageUrl(storagePath),
      width: info.width,
      height: info.height,
      contentType: 'image/webp',
    },
  };
}

async function persistStudioMediaRendition(
  bucket: {
    file: (
      storagePath: string
    ) => {
      save: (buffer: Buffer, options: { metadata: { contentType: string } }) => Promise<unknown>;
    };
  },
  mediaId: string,
  fileBuffer: Buffer
): Promise<StudioMediaRendition> {
  const { buffer, rendition } = await buildStudioMediaRendition(mediaId, fileBuffer);
  await bucket.file(rendition.storagePath).save(buffer, {
    metadata: {
      contentType: rendition.contentType,
    },
  });
  return rendition;
}

async function persistStudioMediaRenditionBestEffort(
  bucket: {
    file: (
      storagePath: string
    ) => {
      save: (buffer: Buffer, options: { metadata: { contentType: string } }) => Promise<unknown>;
    };
  },
  mediaId: string,
  fileBuffer: Buffer
): Promise<StudioMediaRendition | undefined> {
  try {
    return await persistStudioMediaRendition(bucket, mediaId, fileBuffer);
  } catch (error) {
    console.warn('[media] studio rendition generation failed', {
      mediaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function persistReaderMediaRendition(
  bucket: {
    file: (
      storagePath: string
    ) => {
      save: (buffer: Buffer, options: { metadata: { contentType: string } }) => Promise<unknown>;
    };
  },
  mediaId: string,
  fileBuffer: Buffer
): Promise<ReaderMediaRendition> {
  const { buffer, rendition } = await buildReaderMediaRendition(mediaId, fileBuffer);
  await bucket.file(rendition.storagePath).save(buffer, {
    metadata: {
      contentType: rendition.contentType,
    },
  });
  return rendition;
}

async function persistReaderMediaRenditionBestEffort(
  bucket: {
    file: (
      storagePath: string
    ) => {
      save: (buffer: Buffer, options: { metadata: { contentType: string } }) => Promise<unknown>;
    };
  },
  mediaId: string,
  fileBuffer: Buffer
): Promise<ReaderMediaRendition | undefined> {
  try {
    return await persistReaderMediaRendition(bucket, mediaId, fileBuffer);
  } catch (error) {
    console.warn('[media] reader rendition generation failed', {
      mediaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

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

export async function findMediaByContentDigest(digest: string): Promise<Media | null> {
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore
    .collection('media')
    .where('contentIdentity.digest', '==', digest)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ...doc.data(), docId: doc.id } as Media;
}

async function recordMediaSourceIdentity(
  mediaId: string,
  identity: MediaSourceIdentity
): Promise<Media> {
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection('media').doc(mediaId);
  return firestore.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Exact-match media record no longer exists');
    const media = { ...snap.data(), docId: snap.id } as Media;
    const digest = media.contentIdentity?.digest;
    const identityRef = digest
      ? firestore.collection(MEDIA_CONTENT_IDENTITIES_COLLECTION).doc(digest)
      : null;
    const identitySnap = identityRef ? await tx.get(identityRef) : null;
    const identities = media.sourceIdentities ?? [];
    const alreadyRecorded = identities.some(
      item => item.provider === identity.provider && item.assetId === identity.assetId
    );
    if (!alreadyRecorded) {
      tx.update(ref, {
        sourceIdentities: [...identities, identity],
        updatedAt: Date.now(),
      });
      if (identityRef && !identitySnap?.exists) {
        tx.set(identityRef, { mediaId, algorithm: 'sha256', createdAt: Date.now() });
      }
      return { ...media, sourceIdentities: [...identities, identity] };
    }
    if (identityRef && !identitySnap?.exists) {
      tx.set(identityRef, { mediaId, algorithm: 'sha256', createdAt: Date.now() });
    }
    return media;
  });
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
  tagIds?: string[],
  importBatchId?: string,
  sourceContentDigest?: string,
  sourceIdentity?: MediaSourceIdentity,
  metadataImport?: Media['metadataImport']
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
  const studioRendition = await persistStudioMediaRenditionBestEffort(bucket, docId, fileBuffer);
  const readerRendition = await persistReaderMediaRenditionBestEffort(bucket, docId, fileBuffer);
  const renditions = mergeMediaRenditions(studioRendition, readerRendition);

  const tagIdsResolved = [
    ...new Set((tagIds || []).filter((id): id is string => typeof id === 'string' && id.length > 0)),
  ];

  let derived: Awaited<ReturnType<typeof calculateDerivedTagData>> | null = null;
  if (tagIdsResolved.length > 0) {
    derived = await calculateDerivedTagData(tagIdsResolved);
  }

  // 5. Construct the canonical Media object
  const now = Date.now();
  const readiness = buildMediaReadiness(
    {
      source: readyStage(now),
      metadata: readyStage(now),
      studioRendition: studioRendition
        ? readyStage(now)
        : failedStage(now, 'STUDIO_RENDITION_FAILED', true),
      readerRendition: readerRendition
        ? readyStage(now)
        : failedStage(now, 'READER_RENDITION_FAILED', true),
      searchIndex: pendingStage(now),
    },
    now
  );
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
    ...(sourceContentDigest
      ? {
          contentIdentity: {
            algorithm: 'sha256' as const,
            digest: sourceContentDigest,
            basis: 'source-bytes' as const,
          },
        }
      : {}),
    ...(sourceIdentity ? { sourceIdentities: [sourceIdentity] } : {}),
    objectPosition: '50% 50%',
    caption: captionOverride ?? '',
    createdAt: now,
    updatedAt: now,
    ...(importBatchId ? { importBatchId } : {}),
    ...(metadataImport ? { metadataImport } : {}),
    readiness,
  };

  const newMedia: Media = derived
    ? {
        ...baseFields,
        ...(renditions ? { renditions } : {}),
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
        ...(renditions ? { renditions } : {}),
        hasTags: false,
        hasWho: false,
        hasWhat: false,
        hasWhen: false,
        hasWhere: false,
      };

  // 6. Preload tag paths before the write transaction.
  let tagPathLookup: Map<string, Tag> | undefined;
  if (tagIdsResolved.length > 0) {
    // Pre-read tag.path outside the transaction so we never call transaction.getAll after writes
    // (Firestore: all reads before all writes in a transaction).
    const tagRefs = tagIdsResolved.map((id) => firestore.collection('tags').doc(id));
    const tagSnapshots = await firestore.getAll(...tagRefs);
    tagPathLookup = new Map<string, Tag>();
    const ancestorIds = new Set<string>();
    for (const snap of tagSnapshots) {
      if (snap.exists) {
        const tag = snap.data() as Tag;
        tagPathLookup.set(snap.id, tag);
        if (Array.isArray(tag.path)) {
          tag.path.forEach((ancestorId) => {
            if (ancestorId && !tagPathLookup.has(ancestorId)) ancestorIds.add(ancestorId);
          });
        }
      }
    }
    if (ancestorIds.size > 0) {
      const ancestorRefs = Array.from(ancestorIds).map((id) => firestore.collection('tags').doc(id));
      const ancestorSnapshots = await firestore.getAll(...ancestorRefs);
      for (const snap of ancestorSnapshots) {
        if (!snap.exists) continue;
        tagPathLookup.set(snap.id, snap.data() as Tag);
      }
    }

  }

  const identityRef = sourceContentDigest
    ? firestore.collection(MEDIA_CONTENT_IDENTITIES_COLLECTION).doc(sourceContentDigest)
    : null;
  const persistence = await firestore.runTransaction(async tx => {
    const identitySnap = identityRef ? await tx.get(identityRef) : null;
    if (identitySnap?.exists) {
      return { created: false, existingMediaId: String(identitySnap.data()?.mediaId ?? '') };
    }
    tx.set(mediaRef, newMedia);
    if (identityRef) {
      tx.set(identityRef, {
        mediaId: docId,
        algorithm: 'sha256',
        createdAt: now,
      });
    }
    if (tagIdsResolved.length > 0) {
      await updateTagCountsForMedia([], tagIdsResolved, tx, tagPathLookup);
    }
    return { created: true, existingMediaId: '' };
  });

  if (!persistence.created) {
    await Promise.allSettled(
      [storagePath, studioRendition?.storagePath, readerRendition?.storagePath]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(candidate => bucket.file(candidate).delete())
    );
    if (!persistence.existingMediaId) {
      throw new Error('Exact-match identity is missing its canonical media record');
    }
    const existingSnap = await firestore.collection('media').doc(persistence.existingMediaId).get();
    if (!existingSnap.exists) {
      throw new Error('Exact-match identity points to a missing canonical media record');
    }
    const existing = { ...existingSnap.data(), docId: existingSnap.id } as Media;
    return sourceIdentity
      ? recordMediaSourceIdentity(existing.docId, sourceIdentity)
      : existing;
  }

  let indexedMedia = newMedia;
  try {
    await syncMediaToTypesenseStrict(newMedia);
    const indexedAt = Date.now();
    const indexedReadiness = buildMediaReadiness(
      { ...newMedia.readiness!.stages, searchIndex: readyStage(indexedAt) },
      indexedAt
    );
    await mediaRef.update({ readiness: indexedReadiness, updatedAt: indexedAt });
    indexedMedia = { ...newMedia, readiness: indexedReadiness, updatedAt: indexedAt };
  } catch (error) {
    const failedAt = Date.now();
    const failedReadiness = buildMediaReadiness(
      {
        ...newMedia.readiness!.stages,
        searchIndex: failedStage(
          failedAt,
          'SEARCH_INDEX_FAILED',
          true,
          error instanceof Error ? error.message : 'Search indexing failed'
        ),
      },
      failedAt
    );
    await mediaRef.update({ readiness: failedReadiness, updatedAt: failedAt });
    indexedMedia = { ...newMedia, readiness: failedReadiness, updatedAt: failedAt };
  }

  return indexedMedia;
}

export async function retryMediaReadiness(
  mediaId: string,
  requestedStages?: MediaReadinessStageName[]
): Promise<Media> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const ref = firestore.collection('media').doc(mediaId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Media not found');

  let media = { ...snap.data(), docId: snap.id } as Media;
  if (!media.readiness) throw new Error('Legacy media readiness is unassessed');
  const retryable = getRetryableMediaStages(media);
  const stages = requestedStages?.length
    ? retryable.filter(stage => requestedStages.includes(stage))
    : retryable;
  if (stages.length === 0) throw new Error('No retryable readiness stages');

  let sourceBuffer: Buffer | null = null;
  const readSource = async () => {
    if (!sourceBuffer) {
      [sourceBuffer] = await bucket.file(media.storagePath).download();
    }
    return sourceBuffer;
  };
  const nextStages = { ...media.readiness.stages };
  const nextRenditions = { ...(media.renditions ?? {}) };

  if (stages.includes('studioRendition')) {
    const attemptedAt = Date.now();
    try {
      nextRenditions.studio = await persistStudioMediaRendition(bucket, mediaId, await readSource());
      nextStages.studioRendition = readyStage(attemptedAt);
    } catch (error) {
      nextStages.studioRendition = failedStage(
        attemptedAt,
        'STUDIO_RENDITION_FAILED',
        true,
        error instanceof Error ? error.message : 'Studio rendition failed'
      );
    }
  }

  if (stages.includes('readerRendition')) {
    const attemptedAt = Date.now();
    try {
      nextRenditions.reader = await persistReaderMediaRendition(bucket, mediaId, await readSource());
      nextStages.readerRendition = readyStage(attemptedAt);
    } catch (error) {
      nextStages.readerRendition = failedStage(
        attemptedAt,
        'READER_RENDITION_FAILED',
        true,
        error instanceof Error ? error.message : 'Reader rendition failed'
      );
    }
  }

  media = {
    ...media,
    renditions: nextRenditions,
    readiness: buildMediaReadiness(nextStages, Date.now()),
    updatedAt: Date.now(),
  };

  if (stages.includes('searchIndex')) {
    const attemptedAt = Date.now();
    try {
      await syncMediaToTypesenseStrict(media);
      nextStages.searchIndex = readyStage(attemptedAt);
    } catch (error) {
      nextStages.searchIndex = failedStage(
        attemptedAt,
        'SEARCH_INDEX_FAILED',
        true,
        error instanceof Error ? error.message : 'Search indexing failed'
      );
    }
  }

  const updatedAt = Date.now();
  const readiness = buildMediaReadiness(nextStages, updatedAt);
  const updates = { renditions: nextRenditions, readiness, updatedAt };
  await ref.update(updates);
  return { ...media, ...updates };
}

export async function auditLegacyMediaReadiness(): Promise<{
  total: number;
  assessed: number;
  unassessed: number;
  ready: number;
  pending: number;
  failed: number;
}> {
  const snapshot = await getAdminApp().firestore().collection('media').get();
  let assessed = 0;
  let ready = 0;
  let pending = 0;
  let failed = 0;
  for (const doc of snapshot.docs) {
    const readiness = (doc.data() as Partial<Media>).readiness;
    if (!readiness) continue;
    assessed += 1;
    if (readiness.overall === 'ready') ready += 1;
    if (readiness.overall === 'pending') pending += 1;
    if (readiness.overall === 'failed') failed += 1;
  }
  return {
    total: snapshot.size,
    assessed,
    unassessed: snapshot.size - assessed,
    ready,
    pending,
    failed,
  };
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
  /** Groups media imported in the same API batch for Browse filters. */
  importBatchId?: string;
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
    let metadataImport: Media['metadataImport'] = {
      attempted: options?.readMetadata === true,
      outcome: options?.readMetadata ? 'none' : 'not_requested',
    };
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
        metadataImport = { attempted: true, outcome: 'error' };
      }
      caption = meta.caption || undefined;
      if (meta.keywordStrings.length > 0) {
        const maps = options.tagNameMaps ?? (await getCachedTagNameMaps());
        resolvedTagIds = resolveKeywordStringsToTagIds(meta.keywordStrings, maps);
      }
      if (!meta.infrastructureError && (caption || meta.keywordStrings.length > 0)) {
        metadataImport = {
          attempted: true,
          outcome: 'found',
          foundFields: [
            ...(caption ? (['caption'] as const) : []),
            ...(meta.keywordStrings.length > 0 ? (['keywords'] as const) : []),
          ],
        };
      }
    }

    const readT0 = Date.now();
    let fileBuffer = await fs.readFile(fullPath);
    let filename = path.basename(fullPath);
    const sourceContentDigest = sha256SourceBytes(fileBuffer);
    const sourceIdentity = buildMediaSourceIdentity(
      'local',
      sourcePath,
      sourcePath,
      Date.now(),
      {
        observedFilename: filename,
        ...(caption ? { caption } : {}),
        ...(resolvedTagIds?.length ? { tagIds: resolvedTagIds } : {}),
        ...(options?.importBatchId ? { importBatchId: options.importBatchId } : {}),
      }
    );
    const exactMatch = await findMediaByContentDigest(sourceContentDigest);
    if (exactMatch) {
      const mediaWithSource = await recordMediaSourceIdentity(exactMatch.docId, sourceIdentity);
      return {
        mediaId: mediaWithSource.docId,
        media: mediaWithSource,
        skipped: true,
      };
    }
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
      resolvedTagIds,
      options?.importBatchId,
      sourceContentDigest,
      sourceIdentity,
      metadataImport
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
): Promise<{ mediaId: string; media: Media; skipped?: boolean }> {
  try {
    const sourceContentDigest = sha256SourceBytes(fileBuffer);
    const sourceIdentity = buildMediaSourceIdentity(
      'upload',
      `${originalFilename}:${sourceContentDigest}`,
      `upload://${originalFilename}`,
      Date.now(),
      { observedFilename: originalFilename }
    );
    const exactMatch = await findMediaByContentDigest(sourceContentDigest);
    if (exactMatch) {
      const mediaWithSource = await recordMediaSourceIdentity(exactMatch.docId, sourceIdentity);
      return { mediaId: mediaWithSource.docId, media: mediaWithSource, skipped: true };
    }

    let buffer = fileBuffer;
    let filename = originalFilename;
    if (!isCardExportMarkedFilename(originalFilename)) {
      const { webpBuffer } = await normalizeBufferToWebp(fileBuffer);
      buffer = webpBuffer;
      filename = `${path.parse(originalFilename).name}.webp`;
    }

    // For uploads/pastes, the sourcePath is just a representation of where it came from.
    const sourcePath = `upload://${filename}`;
    const newMedia = await createMediaAsset(
      buffer,
      filename,
      'paste',
      sourcePath,
      undefined,
      undefined,
      undefined,
      sourceContentDigest,
      sourceIdentity,
      { attempted: false, outcome: 'not_requested' }
    );

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

type MediaPatchFields = Partial<Pick<Media, 'caption' | 'objectPosition' | 'tags' | 'subjectTagId' | 'subjectTagIds'>>;

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
  tagIds: string[],
  subjectState: Pick<Media, 'subjectTagId' | 'subjectTagIds' | 'subjectFilterTags'>,
  allTags?: Tag[]
): Promise<void> {
  const raw = tagIds.filter((id): id is string => typeof id === 'string');
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(raw, allTags);
  payload.tags = raw;
  payload.subjectTagId = subjectState.subjectTagId;
  payload.subjectTagIds = subjectState.subjectTagIds;
  payload.subjectFilterTags = subjectState.subjectFilterTags;
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
    updates.tags !== undefined ||
    updates.subjectTagId !== undefined ||
    updates.subjectTagIds !== undefined;
  if (!hasField) {
    throw new Error('No valid fields to update.');
  }

  if (updates.tags !== undefined || updates.subjectTagId !== undefined || updates.subjectTagIds !== undefined) {
    if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
      throw new Error('tags must be an array of tag IDs.');
    }
    const allTags = await getAllTags();
    const tagPathLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));

    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(mediaRef);
      if (!snap.exists) {
        throw new Error(`Media document with ID ${mediaId} not found.`);
      }
      const existingMedia = snap.data() as Media;
      const oldTags = existingMedia.tags || [];
      const newTags =
        updates.tags !== undefined
          ? updates.tags.filter((id): id is string => typeof id === 'string')
          : oldTags;
      const subjectState = await resolveSubjectTagState({
        assignedTagIds: newTags,
        existingSubjectTagId: existingMedia.subjectTagId,
        existingSubjectTagIds: existingMedia.subjectTagIds,
        requestedSubjectTagId: updates.subjectTagId,
        requestedSubjectTagIds: updates.subjectTagIds,
        subjectTagIdProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagId'),
        subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagIds'),
        allTags,
      });
      await updateTagCountsForMedia(oldTags, newTags, tx, tagPathLookup);

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
      await applyTagFieldsToPayload(payload, newTags, subjectState, allTags);
      tx.update(mediaRef, payload);
    });
    void syncMediaToTypesenseById(mediaId);
    const { syncGalleryTagInheritanceForMediaId } = await import(
      '@/lib/services/galleryTagInheritanceService'
    );
    await syncGalleryTagInheritanceForMediaId(mediaId);
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
  updates: {
    tagIds?: string[];
    mode?: 'add' | 'replace' | 'remove';
    subjectTagId?: string | null;
    subjectTagIds?: string[];
    subjectTagIdProvided?: boolean;
    subjectTagIdsProvided?: boolean;
  }
): Promise<{ updatedIds: string[]; updatedMedia: Media[] }> {
  const ids = Array.from(
    new Set(mediaIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  if (!ids.length) return { updatedIds: [], updatedMedia: [] };

  const hasTagMutation = Object.prototype.hasOwnProperty.call(updates, 'tagIds');
  const hasSubjectMutation = updates.subjectTagIdProvided === true || updates.subjectTagIdsProvided === true;
  if (!hasTagMutation && !hasSubjectMutation) {
    return { updatedIds: [], updatedMedia: [] };
  }

  const normalizedMode: 'add' | 'replace' | 'remove' =
    updates.mode === 'replace' || updates.mode === 'remove' ? updates.mode : 'add';
  const incomingTags = Array.from(
    new Set((updates.tagIds ?? []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );

  const app = getAdminApp();
  const firestore = app.firestore();
  const allTags = await getAllTags();
  const tagPathLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derivedCache = new Map<string, MediaTagDerived>();
  const updatedIds: string[] = [];
  const updatedMedia = new Map<string, Media>();

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

        let nextTags = existingTags;
        if (hasTagMutation) {
          if (normalizedMode === 'replace') {
            nextTags = incomingTags;
          } else if (normalizedMode === 'remove') {
            const removeSet = new Set(incomingTags);
            nextTags = existingTags.filter((id) => !removeSet.has(id));
          } else {
            nextTags = Array.from(new Set([...existingTags, ...incomingTags]));
          }
        }

        const tagsUnchanged =
          nextTags.length === existingTags.length &&
          nextTags.every((id) => existingTags.includes(id));

        const subjectState = await resolveSubjectTagState({
          assignedTagIds: nextTags,
          existingSubjectTagId: media.subjectTagId,
          existingSubjectTagIds: media.subjectTagIds,
          requestedSubjectTagId: updates.subjectTagId,
          requestedSubjectTagIds: updates.subjectTagIds,
          subjectTagIdProvided: hasSubjectMutation,
          subjectTagIdsProvided: updates.subjectTagIdsProvided === true,
          allTags,
        });
        const subjectUnchanged =
          normalizeSubjectTagId(media.subjectTagId) === subjectState.subjectTagId &&
          JSON.stringify(normalizeSubjectTagIds(media.subjectTagIds)) === JSON.stringify(subjectState.subjectTagIds);
        if (tagsUnchanged && subjectUnchanged) continue;

        const payload: Record<string, unknown> = { updatedAt: Date.now() };
        if (hasTagMutation) {
          const cacheKey = [...nextTags].sort((a, b) => a.localeCompare(b)).join('\u001f');
          let derived = derivedCache.get(cacheKey);
          if (!derived) {
            derived = await deriveMediaTagFields(nextTags, allTags);
            derivedCache.set(cacheKey, derived);
          }

          await updateTagCountsForMedia(existingTags, derived.tags, tx, tagPathLookup);
          payload.tags = derived.tags;
          payload.filterTags = derived.filterTags;
          payload.who = derived.who;
          payload.what = derived.what;
          payload.when = derived.when;
          payload.where = derived.where;
          payload.hasTags = derived.hasTags;
          payload.hasWho = derived.hasWho;
          payload.hasWhat = derived.hasWhat;
          payload.hasWhen = derived.hasWhen;
          payload.hasWhere = derived.hasWhere;
        }
        if (hasTagMutation || hasSubjectMutation) {
          payload.subjectTagId = subjectState.subjectTagId;
          payload.subjectTagIds = subjectState.subjectTagIds;
          payload.subjectFilterTags = subjectState.subjectFilterTags;
        }

        tx.update(mediaDoc.ref, payload);
        updatedIds.push(mediaDoc.id);
        updatedMedia.set(mediaDoc.id, {
          ...media,
          ...payload,
          docId: media.docId ?? mediaDoc.id,
        } as Media);
      }
    });
  }

  const uniqueUpdatedIds = Array.from(new Set(updatedIds));
  uniqueUpdatedIds.forEach((id) => void syncMediaToTypesenseById(id));
  if (uniqueUpdatedIds.length > 0) {
    const { syncGalleryTagInheritanceForMediaId } = await import(
      '@/lib/services/galleryTagInheritanceService'
    );
    for (const id of uniqueUpdatedIds) {
      await syncGalleryTagInheritanceForMediaId(id);
    }
  }
  return {
    updatedIds: uniqueUpdatedIds,
    updatedMedia: uniqueUpdatedIds
      .map((id) => updatedMedia.get(id))
      .filter((item): item is Media => Boolean(item?.docId)),
  };
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

  const replacementDigest = sha256SourceBytes(fileBuffer);
  const exactMatch = await findMediaByContentDigest(replacementDigest);
  if (exactMatch && exactMatch.docId !== mediaId) {
    throw new Error(
      'This replacement exactly matches another media asset. Review the duplicate instead of replacing.'
    );
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
  const studioRendition = await persistStudioMediaRenditionBestEffort(bucket, mediaId, fileBuffer);
  const readerRendition = await persistReaderMediaRenditionBestEffort(bucket, mediaId, fileBuffer);

  const payload: Record<string, unknown> = {
    filename: originalFilename || existing.filename,
    width,
    height,
    size: fileBuffer.length,
    contentType,
    storageUrl,
    contentIdentity: {
      algorithm: 'sha256',
      digest: replacementDigest,
      basis: 'source-bytes',
    },
    sourceIdentities: [
      ...(existing.sourceIdentities ?? []),
      buildMediaSourceIdentity(
        'upload',
        `replacement:${mediaId}:${replacementDigest}`,
        `replacement://${originalFilename}`,
        Date.now(),
        { observedFilename: originalFilename }
      ),
    ],
    updatedAt: Date.now(),
  };
  const mergedRenditions = mergeMediaRenditions(studioRendition, readerRendition);
  if (mergedRenditions) {
    payload.renditions = {
      ...(existing.renditions ?? {}),
      ...mergedRenditions,
    };
  }

  const oldDigest = existing.contentIdentity?.digest;
  const oldIdentityRef =
    oldDigest && oldDigest !== replacementDigest
      ? firestore.collection(MEDIA_CONTENT_IDENTITIES_COLLECTION).doc(oldDigest)
      : null;
  const newIdentityRef = firestore
    .collection(MEDIA_CONTENT_IDENTITIES_COLLECTION)
    .doc(replacementDigest);
  await firestore.runTransaction(async tx => {
    const [oldIdentitySnap, newIdentitySnap] = await Promise.all([
      oldIdentityRef ? tx.get(oldIdentityRef) : Promise.resolve(null),
      tx.get(newIdentityRef),
    ]);
    tx.update(mediaRef, payload);
    if (oldIdentityRef && oldIdentitySnap?.data()?.mediaId === mediaId) {
      tx.delete(oldIdentityRef);
    }
    if (!newIdentitySnap.exists || newIdentitySnap.data()?.mediaId === mediaId) {
      tx.set(newIdentityRef, {
        mediaId,
        algorithm: 'sha256',
        createdAt: Date.now(),
      });
    }
  });
  void syncMediaToTypesenseById(mediaId);
}

export async function refreshMediaStudioRendition(
  mediaId: string,
  options?: { dryRun?: boolean }
): Promise<{ ok: true; updated: boolean; message: string } | { ok: false; message: string }> {
  const dryRun = options?.dryRun ?? false;
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);
  const snap = await mediaRef.get();
  if (!snap.exists) {
    return { ok: false, message: `Media document ${mediaId} not found.` };
  }

  const media = snap.data() as Media;
  if (!media.storagePath?.trim()) {
    return { ok: false, message: `Media ${mediaId} has no storagePath.` };
  }

  const storageFile = bucket.file(media.storagePath);
  const [exists] = await storageFile.exists();
  if (!exists) {
    return { ok: false, message: `Storage object missing for ${mediaId} at ${media.storagePath}.` };
  }

  const [buffer] = await storageFile.download();
  const { buffer: renditionBuffer, rendition } = await buildStudioMediaRendition(mediaId, buffer);

  if (dryRun) {
    return {
      ok: true,
      updated: false,
      message: `Would write studio rendition ${rendition.storagePath} (${rendition.width}x${rendition.height}).`,
    };
  }

  await bucket.file(rendition.storagePath).save(renditionBuffer, {
    metadata: {
      contentType: rendition.contentType,
    },
  });
  await mediaRef.update({
    renditions: {
      ...(media.renditions ?? {}),
      studio: rendition,
    },
    updatedAt: Date.now(),
  });
  void syncMediaToTypesenseById(mediaId);
  return {
    ok: true,
    updated: true,
    message: `Studio rendition refreshed at ${rendition.storagePath}.`,
  };
}

export async function refreshMediaReaderRendition(
  mediaId: string,
  options?: { dryRun?: boolean }
): Promise<{ ok: true; updated: boolean; message: string } | { ok: false; message: string }> {
  const dryRun = options?.dryRun ?? false;
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);
  const snap = await mediaRef.get();
  if (!snap.exists) {
    return { ok: false, message: `Media document ${mediaId} not found.` };
  }

  const media = snap.data() as Media;
  if (!media.storagePath?.trim()) {
    return { ok: false, message: `Media ${mediaId} has no storagePath.` };
  }

  const storageFile = bucket.file(media.storagePath);
  const [exists] = await storageFile.exists();
  if (!exists) {
    return { ok: false, message: `Storage object missing for ${mediaId} at ${media.storagePath}.` };
  }

  const [buffer] = await storageFile.download();
  const { buffer: renditionBuffer, rendition } = await buildReaderMediaRendition(mediaId, buffer);

  if (dryRun) {
    return {
      ok: true,
      updated: false,
      message: `Would write reader rendition ${rendition.storagePath} (${rendition.width}x${rendition.height}).`,
    };
  }

  await bucket.file(rendition.storagePath).save(renditionBuffer, {
    metadata: {
      contentType: rendition.contentType,
    },
  });
  await mediaRef.update({
    renditions: {
      ...(media.renditions ?? {}),
      reader: rendition,
    },
    updatedAt: Date.now(),
  });
  void syncMediaToTypesenseById(mediaId);
  return {
    ok: true,
    updated: true,
    message: `Reader rendition refreshed at ${rendition.storagePath}.`,
  };
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
