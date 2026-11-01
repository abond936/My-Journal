import { getAdminApp } from '@/lib/config/firebase/admin';
import { resolveAudienceReaderIds, type AudienceImpactReader } from '@/lib/services/audienceImpactService';
import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { audienceGroupSchema } from '@/lib/types/audience';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import { sharedMediaCollectionSchema } from '@/lib/types/sharedMediaCollection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';

export type AudienceGroupChangedMember = AudienceImpactReader & { enabled: boolean };
export type AudienceGroupLiveContentImpact = {
  id: string;
  title: string;
  gainingReaders: AudienceImpactReader[];
  losingReaders: AudienceImpactReader[];
};
export type AudienceGroupMembershipImpact = {
  groupId: string;
  groupName: string;
  addedMembers: AudienceGroupChangedMember[];
  removedMembers: AudienceGroupChangedMember[];
  referencedCardAudiences: number;
  referencedCollectionAudiences: number;
  referencedSharedMediaCollectionAudiences: number;
  cards: AudienceGroupLiveContentImpact[];
  collections: AudienceGroupLiveContentImpact[];
  sharedMediaCollections: AudienceGroupLiveContentImpact[];
};

type GroupMembership = { docId: string; memberContactIds: string[] };

function normalize(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

function difference(left: ReadonlySet<string>, right: ReadonlySet<string>): Set<string> {
  return new Set([...left].filter((id) => !right.has(id)));
}

function namedReaders(ids: ReadonlySet<string>, readersById: Map<string, AudienceImpactReader>): AudienceImpactReader[] {
  return [...ids]
    .map((id) => readersById.get(id))
    .filter((reader): reader is AudienceImpactReader => Boolean(reader))
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.contactId.localeCompare(right.contactId));
}

function resolveAcrossCardRoutes(args: {
  card: Card;
  collections: Collection[];
  groups: GroupMembership[];
  enabledReaderIds: ReadonlySet<string>;
}): Set<string> {
  const resolved = isCardIncludedInFeed(args.card)
    ? resolveAudienceReaderIds({
        audience: args.card.audience,
        enabledReaderIds: args.enabledReaderIds,
        groups: args.groups,
      })
    : new Set<string>();
  args.collections.forEach((collection) => {
    resolveAudienceReaderIds({
      audience: collection.audience,
      enabledReaderIds: args.enabledReaderIds,
      groups: args.groups,
    }).forEach((id) => resolved.add(id));
  });
  return resolved;
}

export async function getAudienceGroupMembershipImpact(args: {
  groupId: string;
  proposedMemberContactIds: string[];
  firestore?: FirebaseFirestore.Firestore;
}): Promise<AudienceGroupMembershipImpact | null> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const [groupSnapshot, readersSnapshot, groupsSnapshot, cardReferences, collectionReferences, sharedMediaReferences] = await Promise.all([
    firestore.collection('audience_groups').doc(args.groupId).get(),
    firestore.collection('journal_users').where('role', '==', 'viewer').get(),
    firestore.collection('audience_groups').get(),
    firestore.collection('cards').where('audience.groupIds', 'array-contains', args.groupId).get(),
    firestore.collection('collections').where('audience.groupIds', 'array-contains', args.groupId).get(),
    firestore.collection('shared_media_collections').where('audience.groupIds', 'array-contains', args.groupId).get(),
  ]);
  if (!groupSnapshot.exists) return null;
  const group = audienceGroupSchema.parse({ docId: groupSnapshot.id, ...groupSnapshot.data() });
  const proposedIds = normalize(args.proposedMemberContactIds);
  const usersById = new Map(readersSnapshot.docs.map((doc) => {
    const data = doc.data() as { displayName?: string; username?: string; disabled?: boolean };
    return [doc.id, {
      contactId: doc.id,
      displayName: String(data.displayName || data.username || doc.id),
      enabled: data.disabled !== true,
    }];
  }));
  if (proposedIds.some((id) => !usersById.has(id))) {
    throw new Error('Every audience-group member must be an existing Reader account.');
  }
  const enabledReaders = [...usersById.values()].filter((reader) => reader.enabled);
  const readersById = new Map(enabledReaders.map(({ contactId, displayName }) => [contactId, { contactId, displayName }]));
  const enabledReaderIds = new Set(readersById.keys());
  const currentIds = new Set(group.memberContactIds);
  const proposedIdSet = new Set(proposedIds);
  const changedMembers = (ids: ReadonlySet<string>): AudienceGroupChangedMember[] => [...ids]
    .map((id) => usersById.get(id))
    .filter((reader): reader is AudienceGroupChangedMember => Boolean(reader))
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.contactId.localeCompare(right.contactId));

  const currentGroups: GroupMembership[] = groupsSnapshot.docs.map((doc) => ({
    docId: doc.id,
    memberContactIds: Array.isArray((doc.data() as { memberContactIds?: unknown }).memberContactIds)
      ? (doc.data() as { memberContactIds: string[] }).memberContactIds
      : [],
  }));
  const proposedGroups = currentGroups.map((candidate) => candidate.docId === args.groupId
    ? { ...candidate, memberContactIds: proposedIds }
    : candidate);

  const referencedCollections = collectionReferences.docs
    .map((doc) => ({ docId: doc.id, ...doc.data() } as Collection));
  const liveCollectionStructures = (await Promise.all(referencedCollections.map(async (collection) => ({
    collection,
    structure: collection.recordState === 'active' && collection.lifecycle === 'published'
      ? await getReaderCollectionStructure({ collectionId: collection.docId, includeDrafts: false, firestore })
      : null,
  })))).filter((entry) => Boolean(entry.structure));

  const collections = liveCollectionStructures.flatMap(({ collection }) => {
    const current = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups: currentGroups });
    const proposed = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups: proposedGroups });
    const gainingReaders = namedReaders(difference(proposed, current), readersById);
    const losingReaders = namedReaders(difference(current, proposed), readersById);
    return gainingReaders.length || losingReaders.length
      ? [{ id: collection.docId, title: collection.title, gainingReaders, losingReaders }]
      : [];
  }).sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));

  const sharedMediaCollections = sharedMediaReferences.docs
    .map((doc) => sharedMediaCollectionSchema.parse({ docId: doc.id, ...doc.data() }))
    .filter((collection) => collection.lifecycle === 'published')
    .flatMap((collection) => {
      const current = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups: currentGroups });
      const proposed = resolveAudienceReaderIds({ audience: collection.audience, enabledReaderIds, groups: proposedGroups });
      const gainingReaders = namedReaders(difference(proposed, current), readersById);
      const losingReaders = namedReaders(difference(current, proposed), readersById);
      return gainingReaders.length || losingReaders.length
        ? [{ id: collection.docId, title: collection.title, gainingReaders, losingReaders }]
        : [];
    })
    .sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));

  const candidateCards = new Map<string, Card>();
  cardReferences.docs.forEach((doc) => {
    const card = { docId: doc.id, ...doc.data() } as Card;
    if (card.status === 'published') candidateCards.set(doc.id, card);
  });
  liveCollectionStructures.forEach(({ structure }) => structure?.cards.forEach((card) => {
    if (card.docId && card.status === 'published') candidateCards.set(card.docId, card);
  }));
  const cardIds = [...candidateCards.keys()];
  const routesByCard = await getReaderValidCollectionRoutesByCard({ cardIds, firestore });
  const cards = [...candidateCards.values()].flatMap((card) => {
    const current = resolveAcrossCardRoutes({
      card,
      collections: routesByCard.get(card.docId!) ?? [],
      groups: currentGroups,
      enabledReaderIds,
    });
    const proposed = resolveAcrossCardRoutes({
      card,
      collections: routesByCard.get(card.docId!) ?? [],
      groups: proposedGroups,
      enabledReaderIds,
    });
    const gainingReaders = namedReaders(difference(proposed, current), readersById);
    const losingReaders = namedReaders(difference(current, proposed), readersById);
    return gainingReaders.length || losingReaders.length
      ? [{ id: card.docId!, title: card.title || 'Untitled Card', gainingReaders, losingReaders }]
      : [];
  }).sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));

  return {
    groupId: group.docId,
    groupName: group.name,
    addedMembers: changedMembers(difference(proposedIdSet, currentIds)),
    removedMembers: changedMembers(difference(currentIds, proposedIdSet)),
    referencedCardAudiences: cardReferences.size,
    referencedCollectionAudiences: collectionReferences.size,
    referencedSharedMediaCollectionAudiences: sharedMediaReferences.size,
    cards,
    collections,
    sharedMediaCollections,
  };
}
