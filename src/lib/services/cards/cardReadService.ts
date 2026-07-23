import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { FieldPath } from 'firebase-admin/firestore';
import {
  hydrateCards,
  hydrateCoverImagesOnly,
  hydrateFirstGallerySlideWhereNoCover,
  hydrateReaderFeedCards,
} from './cardMediaHydrationService';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export type CardHydrationMode = 'full' | 'cover-only' | 'reader-feed';

export type GetCardsByIdsOptions = {
  /** `reader-feed`: covers plus complete Gallery media; `cover-only`: thumbnails only. Default `full`. */
  hydrationMode?: CardHydrationMode;
};

export type GalleryCardMediaIndexItem = Pick<
  Card,
  'docId' | 'title' | 'subtitle' | 'status' | 'galleryMedia'
>;

/** Minimal administration index for grouping Media by authored Gallery membership. */
export async function getGalleryCardMediaIndex(): Promise<GalleryCardMediaIndexItem[]> {
  const snapshot = await firestore
    .collection(CARDS_COLLECTION)
    .select('title', 'subtitle', 'status', 'galleryMedia')
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as Card;
      return {
        docId: doc.id,
        title: data.title ?? '',
        subtitle: data.subtitle ?? null,
        status: data.status ?? 'draft',
        galleryMedia: data.galleryMedia ?? [],
      };
    })
    .filter((card) => card.galleryMedia.length > 0);
}

function normalizeChildrenIds(childrenIds: unknown, selfId?: string): string[] {
  if (!Array.isArray(childrenIds)) return [];
  const seen = new Set<string>();
  for (const raw of childrenIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || (selfId && id === selfId)) continue;
    seen.add(id);
  }
  return Array.from(seen);
}

export async function getCardById(id: string): Promise<Card | null> {
  const docSnap = await firestore.collection(CARDS_COLLECTION).doc(id).get();
  if (!docSnap.exists) return null;
  const hydratedCards = await hydrateCards([
    { ...docSnap.data(), docId: docSnap.id } as Card,
  ]);
  return hydratedCards[0] ?? null;
}

export async function getCardsByIds(
  ids: string[],
  options?: GetCardsByIdsOptions
): Promise<Card[]> {
  if (!ids?.length) return [];
  const cards: Card[] = [];
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  for (let index = 0; index < ids.length; index += 30) {
    const chunk = ids.slice(index, index + 30);
    if (!chunk.length) continue;
    const snapshot = await collectionRef.where(FieldPath.documentId(), 'in', chunk).get();
    snapshot.forEach((doc) => cards.push({ ...(doc.data() as Card), docId: doc.id }));
  }

  const cardMap = new Map(cards.map((card) => [card.docId, card]));
  const orderedCards = ids.map((id) => cardMap.get(id)).filter((card): card is Card => Boolean(card));
  const mode = options?.hydrationMode ?? 'full';
  if (mode === 'cover-only') {
    return hydrateFirstGallerySlideWhereNoCover(await hydrateCoverImagesOnly(orderedCards));
  }
  if (mode === 'reader-feed') return hydrateReaderFeedCards(orderedCards);
  return hydrateCards(orderedCards);
}

export async function expandFeedItemsWithChildren(
  items: Card[],
  options: { status: Card['status'] | 'all'; hydrationMode: CardHydrationMode }
): Promise<Card[]> {
  if (!items.length) return items;
  const seen = new Set(items.flatMap((card) => (card.docId ? [card.docId] : [])));
  const idsToFetch = new Set<string>();
  for (const card of items) {
    for (const id of card.childrenIds ?? []) {
      if (id && !seen.has(id)) idsToFetch.add(id);
    }
  }
  if (!idsToFetch.size) return items;

  const fetched = await getCardsByIds(Array.from(idsToFetch), {
    hydrationMode: options.hydrationMode,
  });
  const byId = new Map(fetched.map((card) => [card.docId!, card]));
  const output: Card[] = [];
  for (const card of items) {
    output.push(card);
    for (const childId of card.childrenIds ?? []) {
      if (!childId || seen.has(childId)) continue;
      const child = byId.get(childId);
      if (!child?.docId) continue;
      if (options.status !== 'all' && child.status !== options.status) continue;
      seen.add(childId);
      output.push(child);
    }
  }
  return output;
}

export async function getPaginatedCardsByIds(
  ids: string[],
  options: { limit?: number; lastDocId?: string } = {}
): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { limit = 10, lastDocId } = options;
  if (!ids?.length) return { items: [], hasMore: false };
  const startIndex = lastDocId ? ids.indexOf(lastDocId) + 1 : 0;
  if (startIndex < 0 || startIndex >= ids.length) return { items: [], hasMore: false };
  const endIndex = startIndex + limit;
  const pageIds = ids.slice(startIndex, endIndex);
  if (!pageIds.length) return { items: [], hasMore: false };
  const items = await getCardsByIds(pageIds);
  return {
    items,
    lastDocId: items.length ? items[items.length - 1].docId : undefined,
    hasMore: endIndex < ids.length,
  };
}

export async function getCardsByCollectionId(
  collectionId: string,
  options: {
    limit?: number;
    lastDocId?: string;
    status?: Card['status'] | 'all';
    hydrationMode?: CardHydrationMode;
  } = {}
): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const collectionCard = await getCardById(collectionId);
  if (!collectionCard) return { items: [], hasMore: false };
  const { limit = 10, lastDocId, status = 'published', hydrationMode = 'full' } = options;
  const childIds = normalizeChildrenIds(collectionCard.childrenIds, collectionId);
  if (!childIds.length) return { items: [], hasMore: false };
  const allChildren = await getCardsByIds(childIds, { hydrationMode });
  const visibleChildren =
    status === 'all' ? allChildren : allChildren.filter((card) => card.status === status);
  const startIndex = lastDocId
    ? visibleChildren.findIndex((card) => card.docId === lastDocId) + 1
    : 0;
  if (startIndex < 0 || startIndex >= visibleChildren.length) {
    return { items: [], hasMore: false };
  }
  const items = visibleChildren.slice(startIndex, startIndex + limit);
  return {
    items,
    lastDocId: items.length ? items[items.length - 1].docId : undefined,
    hasMore: startIndex + limit < visibleChildren.length,
  };
}

export async function findCardByImportedFolder(importedFromFolder: string): Promise<Card | null> {
  const snapshot = await firestore
    .collection(CARDS_COLLECTION)
    .where('importedFromFolder', '==', importedFromFolder)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ...(doc.data() as Card), docId: doc.id };
}

export async function searchCards(options: {
  q: string;
  status?: Card['status'] | 'all';
  limit?: number;
  lastDocId?: string;
} = { q: '' }): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { q, status = 'published', limit = 10, lastDocId } = options;
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
  const tags = q.split(' ').filter((tag) => tag.trim() !== '');
  if (!tags.length) return { items: [], hasMore: false };
  tags.forEach((tag) => {
    query = query.where(`filterTags.${tag.trim()}`, '==', true);
  });
  if (status !== 'all') query = query.where('status', '==', status);
  query = query.orderBy('createdAt', 'desc');
  if (lastDocId) {
    const lastDocSnap = await firestore.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDocSnap.exists) query = query.startAfter(lastDocSnap);
  }
  const snapshot = await query.limit(limit).get();
  const items = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  return {
    items,
    lastDocId: items.length ? items[items.length - 1].docId : undefined,
    hasMore: items.length === limit,
  };
}

export async function getParentCardsByChildId(
  childId: string,
  options: {
    status?: Card['status'] | 'all';
    limit?: number;
    hydrationMode?: CardHydrationMode;
  } = {}
): Promise<Card[]> {
  const { status = 'all', limit = 200, hydrationMode = 'cover-only' } = options;
  let query: FirebaseFirestore.Query = firestore
    .collection(CARDS_COLLECTION)
    .where('childrenIds', 'array-contains', childId);
  if (status !== 'all') query = query.where('status', '==', status);
  const snapshot = await query.limit(limit).get();
  const cards = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  if (hydrationMode === 'cover-only') return hydrateCoverImagesOnly(cards);
  if (hydrationMode === 'reader-feed') return hydrateReaderFeedCards(cards);
  return hydrateCards(cards);
}
