import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Media } from '@/lib/types/photo';
import {
  createMediaStackInputSchema,
  mediaStackSchema,
  type CreateMediaStackInput,
  type MediaStack,
} from '@/lib/types/mediaStack';

const COLLECTION = 'media_stacks';
const MEDIA_COLLECTION = 'media';

function normalizeStack(raw: unknown, docId: string): MediaStack {
  const parsed = mediaStackSchema.safeParse({ ...(raw as object), docId });
  if (parsed.success) return parsed.data;
  throw new Error(`Invalid media stack document ${docId}`);
}

async function loadMediaByIds(mediaIds: string[]): Promise<Map<string, Media>> {
  const firestore = getAdminApp().firestore();
  const docs = await Promise.all(mediaIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get()));
  const map = new Map<string, Media>();
  for (const doc of docs) {
    if (doc.exists) {
      map.set(doc.id, { docId: doc.id, ...doc.data() } as Media);
    }
  }
  return map;
}

async function clearStackFromMedia(mediaIds: string[]): Promise<void> {
  if (mediaIds.length === 0) return;
  const firestore = getAdminApp().firestore();
  const batch = firestore.batch();
  for (const mediaId of mediaIds) {
    batch.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
      stackId: null,
      stackRole: null,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
}

async function applyStackToMedia(stack: MediaStack): Promise<void> {
  const firestore = getAdminApp().firestore();
  const batch = firestore.batch();
  const now = Date.now();
  for (const mediaId of stack.memberMediaIds) {
    batch.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
      stackId: stack.docId,
      stackRole: mediaId === stack.heroMediaId ? 'hero' : 'member',
      updatedAt: now,
    });
  }
  await batch.commit();
}

export async function listActiveMediaStacks(): Promise<MediaStack[]> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection(COLLECTION).where('status', '==', 'active').get();
  return snap.docs
    .map((doc) => normalizeStack(doc.data(), doc.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMediaStack(stackId: string): Promise<MediaStack | null> {
  const firestore = getAdminApp().firestore();
  const doc = await firestore.collection(COLLECTION).doc(stackId).get();
  if (!doc.exists) return null;
  return normalizeStack(doc.data(), doc.id);
}

export async function createMediaStack(input: CreateMediaStackInput): Promise<MediaStack> {
  const parsed = createMediaStackInputSchema.parse(input);
  const uniqueIds = [...new Set(parsed.mediaIds.filter(Boolean))];
  if (uniqueIds.length < 2) {
    throw new Error('At least two media items are required to create a stack.');
  }

  const mediaById = await loadMediaByIds(uniqueIds);
  if (mediaById.size !== uniqueIds.length) {
    throw new Error('One or more media items were not found.');
  }

  for (const mediaId of uniqueIds) {
    const item = mediaById.get(mediaId)!;
    if (item.stackId) {
      throw new Error('One or more selected media items already belong to a stack.');
    }
  }

  const heroMediaId =
    parsed.heroMediaId && uniqueIds.includes(parsed.heroMediaId)
      ? parsed.heroMediaId
      : uniqueIds[0]!;

  const orderedMembers = uniqueIds.sort((a, b) => {
    const aCreated = mediaById.get(a)?.createdAt ?? 0;
    const bCreated = mediaById.get(b)?.createdAt ?? 0;
    return aCreated - bCreated;
  });

  if (!orderedMembers.includes(heroMediaId)) {
    throw new Error('Hero media must be part of the stack.');
  }

  const now = Date.now();
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection(COLLECTION).doc();
  const stack: MediaStack = {
    docId: ref.id,
    kind: parsed.kind ?? 'manual',
    status: 'active',
    heroMediaId,
    memberMediaIds: orderedMembers,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(stack);
  await applyStackToMedia(stack);
  return stack;
}

export async function dissolveMediaStack(stackId: string): Promise<MediaStack> {
  const stack = await getMediaStack(stackId);
  if (!stack) throw new Error('Stack not found.');
  if (stack.status !== 'active') throw new Error('Stack is not active.');

  const firestore = getAdminApp().firestore();
  const now = Date.now();
  await firestore.collection(COLLECTION).doc(stackId).update({
    status: 'dissolved',
    updatedAt: now,
  });
  await clearStackFromMedia(stack.memberMediaIds);
  return { ...stack, status: 'dissolved', updatedAt: now };
}

export async function setMediaStackHero(stackId: string, heroMediaId: string): Promise<MediaStack> {
  const stack = await getMediaStack(stackId);
  if (!stack) throw new Error('Stack not found.');
  if (stack.status !== 'active') throw new Error('Stack is not active.');
  if (!stack.memberMediaIds.includes(heroMediaId)) {
    throw new Error('Hero media must be a stack member.');
  }

  const firestore = getAdminApp().firestore();
  const now = Date.now();
  const next: MediaStack = { ...stack, heroMediaId, updatedAt: now };
  await firestore.collection(COLLECTION).doc(stackId).update({
    heroMediaId,
    updatedAt: now,
  });
  await applyStackToMedia(next);
  return next;
}
