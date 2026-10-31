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
