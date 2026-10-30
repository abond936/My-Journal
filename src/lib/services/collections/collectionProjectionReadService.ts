import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import {
  buildReaderCollectionProjection,
  type ReaderCollectionProjection,
} from '@/lib/utils/collectionPlacementProjection';
import {
  evaluateCollectionShadowReadiness,
  type CollectionShadowReadiness,
} from '@/lib/utils/collectionShadowReadiness';
import { FieldPath } from 'firebase-admin/firestore';

export type CollectionProjectionReadModel = {
  projection: ReaderCollectionProjection;
  readiness: CollectionShadowReadiness;
};

export type CollectionStructureReadModel = {
  collection: ReturnType<typeof collectionSchema.parse>;
  placements: Array<ReturnType<typeof collectionPlacementSchema.parse>>;
  cards: Card[];
};

export async function listActiveCollections(
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
) {
  const snapshot = await firestore.collection('collections').where('recordState', '==', 'active').get();
  return snapshot.docs
    .map((doc) => collectionSchema.parse({ docId: doc.id, ...doc.data() }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title) || a.docId.localeCompare(b.docId));
}

export async function listReaderCollections(args: {
  includeDrafts: boolean;
  firestore?: FirebaseFirestore.Firestore;
}) {
  const collections = await listActiveCollections(args.firestore);
  return args.includeDrafts
    ? collections
    : collections.filter((collection) => collection.lifecycle === 'published');
}

export async function getActiveCollectionStructure(
  collectionId: string,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<CollectionStructureReadModel | null> {
  const [collectionSnap, placementsSnap] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).get(),
  ]);
  if (!collectionSnap.exists) return null;
  const collection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });
  if (collection.recordState !== 'active') return null;
  const placements = placementsSnap.docs
    .map((doc) => collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() }))
    .sort((a, b) => a.order - b.order || a.docId.localeCompare(b.docId));
  const cardIds = Array.from(new Set([
    ...(collection.introductionCardId ? [collection.introductionCardId] : []),
    ...placements.map((placement) => placement.cardId),
  ]));
  const cards: Card[] = [];
  for (let index = 0; index < cardIds.length; index += 30) {
    const chunk = cardIds.slice(index, index + 30);
    const snapshot = await firestore.collection('cards').where(FieldPath.documentId(), 'in', chunk).get();
    snapshot.forEach((doc) => cards.push({ docId: doc.id, ...doc.data() } as Card));
  }
  return { collection, placements, cards };
}

export async function getReaderCollectionStructure(args: {
  collectionId: string;
  includeDrafts: boolean;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<CollectionStructureReadModel | null> {
  const structure = await getActiveCollectionStructure(args.collectionId, args.firestore);
  if (!structure) return null;
  if (args.includeDrafts) return structure;
  if (structure.collection.lifecycle !== 'published') return null;
  const cardsById = new Map(structure.cards.flatMap((card) => card.docId ? [[card.docId, card]] : []));
  const requiredCardIds = new Set([
    ...(structure.collection.introductionCardId ? [structure.collection.introductionCardId] : []),
    ...structure.placements.map((placement) => placement.cardId),
  ]);
  for (const cardId of requiredCardIds) {
    if (cardsById.get(cardId)?.status !== 'published') return null;
  }
  return structure;
}

export async function getCollectionProjectionReadModel(
  collectionId: string,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<CollectionProjectionReadModel | null> {
  const [collectionSnap, placementsSnap, sourceCardsSnap] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).get(),
    firestore.collection('cards').select('title', 'status', 'isCollectionRoot', 'childrenIds').get(),
  ]);
  if (!collectionSnap.exists) return null;
  const collection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });
  const placements = placementsSnap.docs.map((doc) =>
    collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() })
  );
  const sourceCards = sourceCardsSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  const cardIds = Array.from(new Set([
    ...(collection.introductionCardId ? [collection.introductionCardId] : []),
    ...placements.map((placement) => placement.cardId),
  ]));
  const cards: Card[] = [];
  for (let index = 0; index < cardIds.length; index += 30) {
    const chunk = cardIds.slice(index, index + 30);
    const snapshot = await firestore.collection('cards').where(FieldPath.documentId(), 'in', chunk).get();
    snapshot.forEach((doc) => cards.push({ docId: doc.id, ...doc.data() } as Card));
  }
  return {
    projection: buildReaderCollectionProjection({ collection, placements, cards }),
    readiness: evaluateCollectionShadowReadiness({ collection, placements, sourceCards }),
  };
}
