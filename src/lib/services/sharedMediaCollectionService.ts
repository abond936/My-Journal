import { FieldPath } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { validateAudienceSelectionReferences } from '@/lib/services/audienceGroupService';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Media } from '@/lib/types/photo';
import {
  sharedMediaCollectionSchema,
  type SharedMediaCollection,
} from '@/lib/types/sharedMediaCollection';

const COLLECTION = 'shared_media_collections';
const MEDIA = 'media';

export type SharedMediaCollectionErrorCode =
  | 'NOT_FOUND'
  | 'REVISION_CONFLICT'
  | 'PUBLISHED_LOCKED'
  | 'TITLE_CONFLICT'
  | 'AUDIENCE_REQUIRED'
  | 'MEDIA_REQUIRED'
  | 'MEDIA_MISSING'
  | 'MEDIA_NOT_DELIVERABLE';

export class SharedMediaCollectionError extends Error {
  constructor(
    public readonly code: SharedMediaCollectionErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SharedMediaCollectionError';
  }
}

function normalizeMediaIds(mediaIds: string[]): string[] {
  return Array.from(new Set(mediaIds.map((id) => id.trim()).filter(Boolean)));
}

function hasAudience(audience: AudienceSelection | undefined): boolean {
  return Boolean(audience && (
    audience.allContacts || audience.groupIds.length > 0 || audience.contactIds.length > 0
  ));
}

function storedCollection(collection: SharedMediaCollection): Omit<SharedMediaCollection, 'docId'> {
  const { docId, ...stored } = collection;
  void docId;
  return stored;
}

async function loadMediaByIds(
  firestore: FirebaseFirestore.Firestore,
  mediaIds: string[]
): Promise<Media[]> {
  const media: Media[] = [];
  for (let index = 0; index < mediaIds.length; index += 30) {
    const chunk = mediaIds.slice(index, index + 30);
    const snapshot = await firestore.collection(MEDIA).where(FieldPath.documentId(), 'in', chunk).get();
    snapshot.docs.forEach((doc) => media.push({ docId: doc.id, ...doc.data() } as Media));
  }
  const byId = new Map(media.map((item) => [item.docId, item]));
  return mediaIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
}

export async function listSharedMediaCollections(
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<SharedMediaCollection[]> {
  const snapshot = await firestore.collection(COLLECTION).get();
  return snapshot.docs
    .map((doc) => sharedMediaCollectionSchema.parse({ docId: doc.id, ...doc.data() }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title) || a.docId.localeCompare(b.docId));
}

export async function getSharedMediaCollection(args: {
  id: string;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<{ collection: SharedMediaCollection; media: Media[] } | null> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const snapshot = await firestore.collection(COLLECTION).doc(args.id).get();
  if (!snapshot.exists) return null;
  const collection = sharedMediaCollectionSchema.parse({ docId: snapshot.id, ...snapshot.data() });
  return { collection, media: await loadMediaByIds(firestore, collection.mediaIds) };
}

export async function createSharedMediaCollection(args: {
  title: string;
  description?: string | null;
  mediaIds?: string[];
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<SharedMediaCollection> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const now = args.now ?? Date.now();
  const title = args.title.trim();
  const description = args.description?.trim() || null;
  const mediaIds = normalizeMediaIds(args.mediaIds ?? []);
  const targetRef = firestore.collection(COLLECTION).doc();
  return firestore.runTransaction(async (transaction) => {
    const existingSnapshot = await transaction.get(firestore.collection(COLLECTION));
    const existing = existingSnapshot.docs.map((doc) =>
      sharedMediaCollectionSchema.parse({ docId: doc.id, ...doc.data() })
    );
    if (existing.some((item) => item.title.toLowerCase() === title.toLowerCase())) {
      throw new SharedMediaCollectionError('TITLE_CONFLICT', 'A Shared Media Collection already uses that title.');
    }
    const collection = sharedMediaCollectionSchema.parse({
      docId: targetRef.id,
      title,
      description,
      mediaIds,
      lifecycle: 'draft',
      revision: 0,
      order: existing.length ? Math.max(...existing.map((item) => item.order)) + 10 : 10,
      createdAt: now,
      updatedAt: now,
    });
    transaction.create(targetRef, storedCollection(collection));
    return collection;
  });
}

export async function updateSharedMediaCollection(args: {
  id: string;
  expectedRevision: number;
  title?: string;
  description?: string | null;
  mediaIds?: string[];
  audience?: AudienceSelection;
  lifecycle?: 'draft' | 'published';
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<SharedMediaCollection> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const now = args.now ?? Date.now();
  if (args.audience) await validateAudienceSelectionReferences(args.audience, firestore);
  const ref = firestore.collection(COLLECTION).doc(args.id);
  return firestore.runTransaction(async (transaction) => {
    const [snapshot, allSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(firestore.collection(COLLECTION)),
    ]);
    if (!snapshot.exists) throw new SharedMediaCollectionError('NOT_FOUND', 'Shared Media Collection not found.');
    const current = sharedMediaCollectionSchema.parse({ docId: snapshot.id, ...snapshot.data() });
    if (current.revision !== args.expectedRevision) {
      throw new SharedMediaCollectionError(
        'REVISION_CONFLICT',
        'This Shared Media Collection changed after the page loaded. Reload and try again.'
      );
    }
    const changingContent = args.title !== undefined
      || args.description !== undefined
      || args.mediaIds !== undefined
      || args.audience !== undefined;
    if (current.lifecycle === 'published' && changingContent) {
      throw new SharedMediaCollectionError(
        'PUBLISHED_LOCKED',
        'Return the Shared Media Collection to Draft before changing its title, audience, or photos.'
      );
    }
    const nextTitle = args.title?.trim() || current.title;
    const duplicate = allSnapshot.docs
      .filter((doc) => doc.id !== current.docId)
      .map((doc) => sharedMediaCollectionSchema.parse({ docId: doc.id, ...doc.data() }))
      .some((item) => item.title.toLowerCase() === nextTitle.toLowerCase());
    if (duplicate) {
      throw new SharedMediaCollectionError('TITLE_CONFLICT', 'A Shared Media Collection already uses that title.');
    }
    const next = sharedMediaCollectionSchema.parse({
      ...current,
      title: nextTitle,
      description: args.description === undefined ? current.description : args.description?.trim() || null,
      mediaIds: args.mediaIds === undefined ? current.mediaIds : normalizeMediaIds(args.mediaIds),
      audience: args.audience ?? current.audience,
      lifecycle: args.lifecycle ?? current.lifecycle,
      revision: current.revision + 1,
      updatedAt: now,
    });
    if (current.lifecycle !== 'published' && next.lifecycle === 'published') {
      if (!hasAudience(next.audience)) {
        throw new SharedMediaCollectionError('AUDIENCE_REQUIRED', 'Choose at least one Reader before publishing.');
      }
      if (!next.mediaIds.length) {
        throw new SharedMediaCollectionError('MEDIA_REQUIRED', 'Add at least one photo before publishing.');
      }
      const mediaSnapshots = await transaction.getAll(
        ...next.mediaIds.map((mediaId) => firestore.collection(MEDIA).doc(mediaId))
      );
      const missingIds = mediaSnapshots.filter((item) => !item.exists).map((item) => item.id);
      if (missingIds.length) {
        throw new SharedMediaCollectionError('MEDIA_MISSING', 'Some selected photos no longer exist.', { missingIds });
      }
      const undeliverableIds = mediaSnapshots
        .filter((item) => item.exists && !(item.data() as Partial<Media>).storagePath)
        .map((item) => item.id);
      if (undeliverableIds.length) {
        throw new SharedMediaCollectionError(
          'MEDIA_NOT_DELIVERABLE',
          'Some selected photos are not ready for protected delivery.',
          { undeliverableIds }
        );
      }
    }
    transaction.set(ref, storedCollection(next));
    return next;
  });
}
