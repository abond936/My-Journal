import { getAdminApp } from '@/lib/config/firebase/admin';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';

export type AudienceImpactReader = { contactId: string; displayName: string };
export type CardAudienceImpact = {
  basis: 'current_after_save' | 'if_published';
  standaloneIncluded: boolean;
  effectiveReaders: AudienceImpactReader[];
  otherRoutes: Array<{ collectionId: string; title: string; readers: AudienceImpactReader[] }>;
};
export type CollectionAudienceImpactRoute = {
  kind: 'this_collection' | 'standalone_feed' | 'other_collection';
  collectionId?: string;
  title: string;
  readers: AudienceImpactReader[];
};
export type CollectionAudienceImpactCard = {
  cardId: string;
  title: string;
  status: Card['status'];
  effectiveReaders: AudienceImpactReader[];
  routes: CollectionAudienceImpactRoute[];
};
export type CollectionAudienceImpact = {
  basis: 'current_after_save' | 'if_published_and_reader_valid';
  proposedRouteReaders: AudienceImpactReader[];
  cards: CollectionAudienceImpactCard[];
  missingCardIds: string[];
};

type GroupMembership = { docId: string; memberContactIds: string[] };

export function resolveAudienceReaderIds(args: {
  audience?: AudienceSelection;
  enabledReaderIds: ReadonlySet<string>;
  groups: GroupMembership[];
}): Set<string> {
  if (!args.audience || args.audience.allContacts) return new Set(args.enabledReaderIds);
  const resolved = new Set(
    args.audience.contactIds.filter((contactId) => args.enabledReaderIds.has(contactId))
  );
  args.groups
    .filter((group) => args.audience?.groupIds.includes(group.docId))
    .forEach((group) => group.memberContactIds.forEach((contactId) => {
      if (args.enabledReaderIds.has(contactId)) resolved.add(contactId);
    }));
  return resolved;
}

function readersForIds(
  ids: ReadonlySet<string>,
  readersById: Map<string, AudienceImpactReader>
): AudienceImpactReader[] {
  return [...ids]
    .map((id) => readersById.get(id))
    .filter((reader): reader is AudienceImpactReader => Boolean(reader))
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.contactId.localeCompare(right.contactId));
}

export async function getCardAudienceImpact(
  cardId: string,
  proposedAudience: AudienceSelection,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<CardAudienceImpact | null> {
  const [cardSnapshot, readersSnapshot, groupsSnapshot, placementsSnapshot] = await Promise.all([
    firestore.collection('cards').doc(cardId).get(),
    firestore.collection('journal_users').where('role', '==', 'viewer').get(),
    firestore.collection('audience_groups').get(),
    firestore.collection('collection_placements').where('cardId', '==', cardId).get(),
  ]);
  if (!cardSnapshot.exists) return null;
  const card = { docId: cardSnapshot.id, ...cardSnapshot.data() } as Card;
  const readers = readersSnapshot.docs
    .filter((doc) => (doc.data() as { disabled?: boolean }).disabled !== true)
    .map((doc) => ({
      contactId: doc.id,
      displayName: String((doc.data() as { displayName?: string }).displayName || (doc.data() as { username?: string }).username || doc.id),
    }));
  const readersById = new Map(readers.map((reader) => [reader.contactId, reader]));
  const enabledReaderIds = new Set(readersById.keys());
  const groups = groupsSnapshot.docs.map((doc) => ({
    docId: doc.id,
    memberContactIds: Array.isArray((doc.data() as { memberContactIds?: unknown }).memberContactIds)
      ? (doc.data() as { memberContactIds: string[] }).memberContactIds
      : [],
  }));

  const collectionIds = Array.from(new Set(placementsSnapshot.docs
    .map((doc) => String((doc.data() as { collectionId?: string }).collectionId || ''))
    .filter(Boolean)));
  const collectionSnapshots = collectionIds.length
    ? await firestore.getAll(...collectionIds.map((id) => firestore.collection('collections').doc(id)))
    : [];
  const collectionCandidates = collectionSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ docId: snapshot.id, ...snapshot.data() } as Collection))
    .filter((collection) => collection.recordState === 'active' && collection.lifecycle === 'published');
  const collections = (await Promise.all(collectionCandidates.map(async (collection) => ({
    collection,
    valid: Boolean(await getReaderCollectionStructure({
      collectionId: collection.docId,
      includeDrafts: false,
      firestore,
    })),
  })))).filter((result) => result.valid).map((result) => result.collection);

  const effectiveIds = isCardIncludedInFeed(card)
    ? resolveAudienceReaderIds({ audience: proposedAudience, enabledReaderIds, groups })
    : new Set<string>();
  const otherRoutes = collections.map((collection) => {
    const ids = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups });
    ids.forEach((id) => effectiveIds.add(id));
    return {
      collectionId: collection.docId,
      title: collection.title,
      readers: readersForIds(ids, readersById),
    };
  }).sort((left, right) => left.title.localeCompare(right.title) || left.collectionId.localeCompare(right.collectionId));

  return {
    basis: card.status === 'published' ? 'current_after_save' : 'if_published',
    standaloneIncluded: isCardIncludedInFeed(card),
    effectiveReaders: readersForIds(effectiveIds, readersById),
    otherRoutes,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function getCollectionAudienceImpact(
  collectionId: string,
  proposedAudience: AudienceSelection,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<CollectionAudienceImpact | null> {
  const [collectionSnapshot, readersSnapshot, groupsSnapshot, placementsSnapshot] = await Promise.all([
    firestore.collection('collections').doc(collectionId).get(),
    firestore.collection('journal_users').where('role', '==', 'viewer').get(),
    firestore.collection('audience_groups').get(),
    firestore.collection('collection_placements').where('collectionId', '==', collectionId).get(),
  ]);
  if (!collectionSnapshot.exists) return null;
  const collection = { docId: collectionSnapshot.id, ...collectionSnapshot.data() } as Collection;
  const readers = readersSnapshot.docs
    .filter((doc) => (doc.data() as { disabled?: boolean }).disabled !== true)
    .map((doc) => ({
      contactId: doc.id,
      displayName: String((doc.data() as { displayName?: string }).displayName || (doc.data() as { username?: string }).username || doc.id),
    }));
  const readersById = new Map(readers.map((reader) => [reader.contactId, reader]));
  const enabledReaderIds = new Set(readersById.keys());
  const groups = groupsSnapshot.docs.map((doc) => ({
    docId: doc.id,
    memberContactIds: Array.isArray((doc.data() as { memberContactIds?: unknown }).memberContactIds)
      ? (doc.data() as { memberContactIds: string[] }).memberContactIds
      : [],
  }));
  const proposedRouteIds = resolveAudienceReaderIds({
    audience: proposedAudience,
    enabledReaderIds,
    groups,
  });

  const cardIds = Array.from(new Set([
    ...(collection.introductionCardId ? [collection.introductionCardId] : []),
    ...placementsSnapshot.docs
      .map((doc) => (doc.data() as { cardId?: unknown }).cardId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ]));
  const cardSnapshotBatches = cardIds.length
    ? await Promise.all(chunks(cardIds, 300).map((batch) =>
      firestore.getAll(...batch.map((id) => firestore.collection('cards').doc(id)))
    ))
    : [];
  const cardSnapshots = cardSnapshotBatches.flat();
  const cards = cardSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ docId: snapshot.id, ...snapshot.data() } as Card));
  const cardsById = new Map(cards.map((card) => [card.docId!, card]));
  const missingCardIds = cardIds.filter((id) => !cardsById.has(id)).sort();

  const placementSnapshots = cardIds.length
    ? await Promise.all(chunks(cardIds, 30).map((batch) =>
      firestore.collection('collection_placements').where('cardId', 'in', batch).get()
    ))
    : [];
  const otherCollectionIdsByCard = new Map<string, Set<string>>();
  placementSnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    const data = doc.data() as { cardId?: unknown; collectionId?: unknown };
    if (typeof data.cardId !== 'string' || typeof data.collectionId !== 'string') return;
    if (data.collectionId === collectionId) return;
    const ids = otherCollectionIdsByCard.get(data.cardId) ?? new Set<string>();
    ids.add(data.collectionId);
    otherCollectionIdsByCard.set(data.cardId, ids);
  });
  const otherCollectionIds = Array.from(new Set(
    [...otherCollectionIdsByCard.values()].flatMap((ids) => [...ids])
  ));
  const otherCollectionSnapshotBatches = otherCollectionIds.length
    ? await Promise.all(chunks(otherCollectionIds, 300).map((batch) =>
      firestore.getAll(...batch.map((id) => firestore.collection('collections').doc(id)))
    ))
    : [];
  const otherCollectionSnapshots = otherCollectionSnapshotBatches.flat();
  const otherCandidates = otherCollectionSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ docId: snapshot.id, ...snapshot.data() } as Collection))
    .filter((candidate) => candidate.recordState === 'active' && candidate.lifecycle === 'published');
  const validOtherCollections = (await Promise.all(otherCandidates.map(async (candidate) => ({
    collection: candidate,
    valid: Boolean(await getReaderCollectionStructure({
      collectionId: candidate.docId,
      includeDrafts: false,
      firestore,
    })),
  })))).filter((result) => result.valid).map((result) => result.collection);
  const validOtherCollectionsById = new Map(validOtherCollections.map((candidate) => [candidate.docId, candidate]));
  const currentRouteActive = collection.recordState === 'active'
    && collection.lifecycle === 'published'
    && Boolean(await getReaderCollectionStructure({ collectionId, includeDrafts: false, firestore }));

  const impactCards = cards.map((card) => {
    const effectiveIds = new Set(proposedRouteIds);
    const routes: CollectionAudienceImpactRoute[] = [{
      kind: 'this_collection',
      collectionId,
      title: collection.title,
      readers: readersForIds(proposedRouteIds, readersById),
    }];
    if (isCardIncludedInFeed(card)) {
      const standaloneIds = resolveAudienceReaderIds({
        audience: card.audience,
        enabledReaderIds,
        groups,
      });
      standaloneIds.forEach((id) => effectiveIds.add(id));
      routes.push({
        kind: 'standalone_feed',
        title: 'standalone Feed',
        readers: readersForIds(standaloneIds, readersById),
      });
    }
    const otherCollections = [...(otherCollectionIdsByCard.get(card.docId!) ?? [])]
      .map((id) => validOtherCollectionsById.get(id))
      .filter((candidate): candidate is Collection => Boolean(candidate))
      .sort((left, right) => left.title.localeCompare(right.title) || left.docId.localeCompare(right.docId));
    otherCollections.forEach((candidate) => {
      const ids = resolveAudienceReaderIds({
        audience: candidate.audience,
        enabledReaderIds,
        groups,
      });
      ids.forEach((id) => effectiveIds.add(id));
      routes.push({
        kind: 'other_collection',
        collectionId: candidate.docId,
        title: candidate.title,
        readers: readersForIds(ids, readersById),
      });
    });
    return {
      cardId: card.docId!,
      title: card.title || 'Untitled Card',
      status: card.status,
      effectiveReaders: readersForIds(effectiveIds, readersById),
      routes,
    };
  }).sort((left, right) => left.title.localeCompare(right.title) || left.cardId.localeCompare(right.cardId));

  return {
    basis: currentRouteActive ? 'current_after_save' : 'if_published_and_reader_valid',
    proposedRouteReaders: readersForIds(proposedRouteIds, readersById),
    cards: impactCards,
    missingCardIds,
  };
}
