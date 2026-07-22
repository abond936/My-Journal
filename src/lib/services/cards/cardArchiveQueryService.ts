import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { compareCollectionRootCards } from '@/lib/utils/curatedCollectionTree';
import { orderIdsBySeed } from '@/lib/utils/seededRandomOrder';
import { FieldPath } from 'firebase-admin/firestore';
import {
  hydrateCards,
  hydrateCoverImagesOnly,
  hydrateReaderFeedCards,
} from './cardMediaHydrationService';
import { getCardsByIds, type CardHydrationMode } from './cardReadService';
import { matchesSelectedTags, type TagSelectionMode } from '@/lib/utils/tagSelectionMode';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

type RandomFeedProjection = Pick<
  Card,
  'docId' | 'status' | 'type' | 'filterTags' | 'who' | 'what' | 'when' | 'where' | 'tags'
>;

function normalizeChildrenIds(childrenIds: unknown): string[] {
  if (!Array.isArray(childrenIds)) return [];
  const ids = childrenIds
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function cardDimensionIsEmpty(values: string[] | undefined): boolean {
  return !values?.length;
}

export async function getSeededRandomCards(options: {
  seed: string;
  status?: Card['status'] | 'all';
  type?: Card['type'] | 'all';
  types?: Card['type'][];
  tags?: string[];
  dimensionalTags?: { who?: string[]; what?: string[]; when?: string[]; where?: string[] };
  exactDimensionalTags?: { who?: string[]; what?: string[]; when?: string[]; where?: string[] };
  dimensionMissing?: { who?: boolean; what?: boolean; when?: boolean; where?: boolean };
  tagSelectionMode?: TagSelectionMode;
  limit?: number;
  lastDocId?: string;
  hydrationMode?: CardHydrationMode;
}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const {
    seed,
    status = 'published',
    type = 'all',
    types,
    tags,
    dimensionalTags,
    exactDimensionalTags,
    dimensionMissing,
    tagSelectionMode = 'any',
    limit = 10,
    lastDocId,
    hydrationMode = 'full',
  } = options;
  const multiTypes = types && types.length > 1 ? Array.from(new Set(types)).slice(0, 10) : undefined;
  const singleType = multiTypes
    ? undefined
    : types?.length === 1
      ? types[0]
      : type !== 'all'
        ? type
        : undefined;
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
  if (status !== 'all') query = query.where('status', '==', status);
  if (multiTypes?.length) query = query.where('type', 'in', multiTypes);
  else if (singleType) query = query.where('type', '==', singleType);

  const snapshot = await query
    .select('status', 'type', 'filterTags', 'who', 'what', 'when', 'where', 'tags')
    .get();
  const filteredIds = snapshot.docs
    .map((doc) => ({ docId: doc.id, ...(doc.data() as Partial<Card>) } as RandomFeedProjection))
    .filter((card) => {
      if (tags?.some((tag) => tag && !card.filterTags?.[tag])) return false;
      if (dimensionalTags?.who && !matchesSelectedTags(card.who, dimensionalTags.who, tagSelectionMode)) return false;
      if (dimensionalTags?.what && !matchesSelectedTags(card.what, dimensionalTags.what, tagSelectionMode)) return false;
      if (dimensionalTags?.when && !matchesSelectedTags(card.when, dimensionalTags.when, tagSelectionMode)) return false;
      if (dimensionalTags?.where && !matchesSelectedTags(card.where, dimensionalTags.where, tagSelectionMode)) return false;
      if (exactDimensionalTags?.who && !matchesSelectedTags(card.tags, exactDimensionalTags.who, tagSelectionMode)) return false;
      if (exactDimensionalTags?.what && !matchesSelectedTags(card.tags, exactDimensionalTags.what, tagSelectionMode)) return false;
      if (exactDimensionalTags?.when && !matchesSelectedTags(card.tags, exactDimensionalTags.when, tagSelectionMode)) return false;
      if (exactDimensionalTags?.where && !matchesSelectedTags(card.tags, exactDimensionalTags.where, tagSelectionMode)) return false;
      if (dimensionMissing?.who && !cardDimensionIsEmpty(card.who)) return false;
      if (dimensionMissing?.what && !cardDimensionIsEmpty(card.what)) return false;
      if (dimensionMissing?.when && !cardDimensionIsEmpty(card.when)) return false;
      if (dimensionMissing?.where && !cardDimensionIsEmpty(card.where)) return false;
      return true;
    })
    .map((card) => card.docId)
    .filter((id): id is string => Boolean(id));

  const orderedIds = orderIdsBySeed(filteredIds, seed);
  const startIndex = lastDocId ? orderedIds.indexOf(lastDocId) + 1 : 0;
  if (startIndex < 0 || startIndex >= orderedIds.length) return { items: [], hasMore: false };
  const pageIds = orderedIds.slice(startIndex, startIndex + limit);
  return {
    items: await getCardsByIds(pageIds, { hydrationMode }),
    lastDocId: pageIds.length ? pageIds[pageIds.length - 1] : undefined,
    hasMore: startIndex + limit < orderedIds.length,
  };
}

export async function getCollectionCards(
  status: Card['status'] | 'all' = 'published',
  options: { limit?: number; hydrationMode?: CardHydrationMode; includeDescendants?: boolean } = {}
): Promise<Card[]> {
  const fetchCardsByIdsRaw = async (ids: string[]): Promise<Card[]> => {
    const cards: Card[] = [];
    for (let index = 0; index < ids.length; index += 30) {
      const chunk = ids.slice(index, index + 30);
      if (!chunk.length) continue;
      const snapshot = await firestore
        .collection(CARDS_COLLECTION)
        .where(FieldPath.documentId(), 'in', chunk)
        .get();
      snapshot.forEach((doc) => cards.push({ ...(doc.data() as Card), docId: doc.id }));
    }
    return cards;
  };

  let query: FirebaseFirestore.Query = firestore
    .collection(CARDS_COLLECTION)
    .where('isCollectionRoot', '==', true);
  if (status !== 'all') query = query.where('status', '==', status);
  if (typeof options.limit === 'number') query = query.limit(options.limit);
  const snapshot = await query.get();
  const roots = snapshot.docs
    .map((doc) => ({ docId: doc.id, ...doc.data() } as Card))
    .sort(compareCollectionRootCards);
  let cards = roots;

  if (options.includeDescendants) {
    const cardsById = new Map(roots.filter((card) => card.docId).map((card) => [card.docId!, card]));
    const pendingIds: string[] = [];
    const queuedIds = new Set(cardsById.keys());
    for (const root of roots) {
      for (const childId of normalizeChildrenIds(root.childrenIds)) {
        if (!queuedIds.has(childId)) {
          queuedIds.add(childId);
          pendingIds.push(childId);
        }
      }
    }
    while (pendingIds.length) {
      const fetched = await fetchCardsByIdsRaw(pendingIds.splice(0, 120));
      for (const card of fetched) {
        if (!card.docId || (status !== 'all' && card.status !== status)) continue;
        if (!cardsById.has(card.docId)) cardsById.set(card.docId, card);
        for (const childId of normalizeChildrenIds(card.childrenIds)) {
          if (!queuedIds.has(childId)) {
            queuedIds.add(childId);
            pendingIds.push(childId);
          }
        }
      }
    }
    cards = Array.from(cardsById.values());
  }

  if (options.hydrationMode === 'cover-only') return hydrateCoverImagesOnly(cards);
  if (options.hydrationMode === 'reader-feed') return hydrateReaderFeedCards(cards);
  return hydrateCards(cards);
}
