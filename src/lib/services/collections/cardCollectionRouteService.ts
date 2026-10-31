import { getAdminApp } from '@/lib/config/firebase/admin';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import type { Collection } from '@/lib/types/collection';

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/**
 * Returns every reader-valid published Collection route for each Card. A Card can
 * enter a Collection either through a placement or as the Collection introduction.
 */
export async function getReaderValidCollectionRoutesByCard(args: {
  cardIds: string[];
  excludeCollectionIds?: ReadonlySet<string>;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<Map<string, Collection[]>> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const cardIds = [...new Set(args.cardIds.filter(Boolean))];
  const routesByCard = new Map<string, Set<string>>(cardIds.map((id) => [id, new Set()]));
  if (!cardIds.length) return new Map();

  const [placementBatches, introductionBatches] = await Promise.all([
    Promise.all(chunks(cardIds, 30).map((batch) =>
      firestore.collection('collection_placements').where('cardId', 'in', batch).get()
    )),
    Promise.all(chunks(cardIds, 30).map((batch) =>
      firestore.collection('collections').where('introductionCardId', 'in', batch).get()
    )),
  ]);
  placementBatches.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    const data = doc.data() as { cardId?: unknown; collectionId?: unknown };
    if (typeof data.cardId !== 'string' || typeof data.collectionId !== 'string') return;
    if (!args.excludeCollectionIds?.has(data.collectionId)) routesByCard.get(data.cardId)?.add(data.collectionId);
  });
  introductionBatches.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    const data = doc.data() as { introductionCardId?: unknown };
    if (typeof data.introductionCardId !== 'string') return;
    if (!args.excludeCollectionIds?.has(doc.id)) routesByCard.get(data.introductionCardId)?.add(doc.id);
  });

  const collectionIds = [...new Set([...routesByCard.values()].flatMap((ids) => [...ids]))];
  const collectionSnapshots = (await Promise.all(chunks(collectionIds, 300).map((batch) =>
    firestore.getAll(...batch.map((id) => firestore.collection('collections').doc(id)))
  ))).flat();
  const candidates = collectionSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ docId: snapshot.id, ...snapshot.data() } as Collection))
    .filter((collection) => collection.recordState === 'active' && collection.lifecycle === 'published');
  const validCollections = (await Promise.all(candidates.map(async (collection) => ({
    collection,
    valid: Boolean(await getReaderCollectionStructure({
      collectionId: collection.docId,
      includeDrafts: false,
      firestore,
    })),
  })))).filter((result) => result.valid).map((result) => result.collection);
  const validById = new Map(validCollections.map((collection) => [collection.docId, collection]));

  return new Map(cardIds.map((cardId) => [
    cardId,
    [...(routesByCard.get(cardId) ?? [])]
      .map((id) => validById.get(id))
      .filter((collection): collection is Collection => Boolean(collection))
      .sort((left, right) => left.title.localeCompare(right.title) || left.docId.localeCompare(right.docId)),
  ]));
}
