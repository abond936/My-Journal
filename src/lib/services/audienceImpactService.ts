import { getAdminApp } from '@/lib/config/firebase/admin';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';

export type AudienceImpactReader = { contactId: string; displayName: string };
export type CardAudienceImpact = {
  basis: 'current_after_save' | 'if_published';
  standaloneIncluded: boolean;
  effectiveReaders: AudienceImpactReader[];
  gainingReaders: AudienceImpactReader[];
  losingReaders: AudienceImpactReader[];
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
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  proposedFeedIncluded?: boolean
): Promise<CardAudienceImpact | null> {
  const [cardSnapshot, readersSnapshot, groupsSnapshot] = await Promise.all([
    firestore.collection('cards').doc(cardId).get(),
    firestore.collection('journal_users').where('role', '==', 'viewer').get(),
    firestore.collection('audience_groups').get(),
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

  const collections = (await getReaderValidCollectionRoutesByCard({
    cardIds: [cardId],
    firestore,
  })).get(cardId) ?? [];

  const currentIds = isCardIncludedInFeed(card)
    ? resolveAudienceReaderIds({ audience: card.audience, enabledReaderIds, groups })
    : new Set<string>();
  const effectiveIds = (proposedFeedIncluded ?? isCardIncludedInFeed(card))
    ? resolveAudienceReaderIds({ audience: proposedAudience, enabledReaderIds, groups })
    : new Set<string>();
  const otherRoutes = collections.map((collection) => {
    const ids = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups });
    ids.forEach((id) => currentIds.add(id));
    ids.forEach((id) => effectiveIds.add(id));
    return {
      collectionId: collection.docId,
      title: collection.title,
      readers: readersForIds(ids, readersById),
    };
  }).sort((left, right) => left.title.localeCompare(right.title) || left.collectionId.localeCompare(right.collectionId));

  return {
    basis: card.status === 'published' ? 'current_after_save' : 'if_published',
    standaloneIncluded: proposedFeedIncluded ?? isCardIncludedInFeed(card),
    effectiveReaders: readersForIds(effectiveIds, readersById),
    gainingReaders: readersForIds(new Set([...effectiveIds].filter((id) => !currentIds.has(id))), readersById),
    losingReaders: readersForIds(new Set([...currentIds].filter((id) => !effectiveIds.has(id))), readersById),
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

  const otherCollectionsByCard = await getReaderValidCollectionRoutesByCard({
    cardIds,
    excludeCollectionIds: new Set([collectionId]),
    firestore,
  });
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
    const otherCollections = otherCollectionsByCard.get(card.docId!) ?? [];
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
