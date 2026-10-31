import { getAdminApp } from '@/lib/config/firebase/admin';
import { audienceAllowsContact } from '@/lib/auth/audienceAccess';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';

export type ReaderAccountAccessItem = { id: string; title: string };
export type ReaderAccountAccessImpact = {
  contactId: string;
  displayName: string;
  currentDisabled: boolean;
  proposedDisabled: boolean;
  effect: 'gain' | 'lose' | 'none';
  cards: ReaderAccountAccessItem[];
  collections: ReaderAccountAccessItem[];
};

export async function getReaderAccountAccessImpact(args: {
  contactId: string;
  proposedDisabled: boolean;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<ReaderAccountAccessImpact | null> {
  const firestore = args.firestore ?? getAdminApp().firestore();
  const [userSnapshot, groupsSnapshot, cardsSnapshot, collectionsSnapshot] = await Promise.all([
    firestore.collection('journal_users').doc(args.contactId).get(),
    firestore.collection('audience_groups').where('memberContactIds', 'array-contains', args.contactId).get(),
    firestore.collection('cards').where('status', '==', 'published').get(),
    firestore.collection('collections').where('recordState', '==', 'active').get(),
  ]);
  if (!userSnapshot.exists) return null;
  const user = userSnapshot.data() as {
    displayName?: string;
    username?: string;
    role?: string;
    disabled?: boolean;
  };
  if (user.role !== 'viewer') {
    throw new Error('Reader access impact is available only for Reader accounts.');
  }
  const currentDisabled = user.disabled === true;
  const effect = currentDisabled === args.proposedDisabled
    ? 'none'
    : args.proposedDisabled ? 'lose' : 'gain';
  const context = {
    contactId: args.contactId,
    groupIds: new Set(groupsSnapshot.docs.map((doc) => doc.id)),
  };
  const cards = cardsSnapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  const cardsById = new Map(cards.map((card) => [card.docId!, card]));
  const accessibleCardIds = new Set(cards
    .filter((card) => isCardIncludedInFeed(card) && audienceAllowsContact(card.audience, context))
    .map((card) => card.docId!)
  );
  const candidates = collectionsSnapshot.docs
    .map((doc) => ({ docId: doc.id, ...doc.data() } as Collection))
    .filter((collection) => collection.lifecycle === 'published');
  const structures = (await Promise.all(candidates.map(async (collection) => ({
    collection,
    structure: await getReaderCollectionStructure({
      collectionId: collection.docId,
      includeDrafts: false,
      firestore,
    }),
  })))).filter((entry) => Boolean(entry.structure));
  const accessibleCollections = structures.filter(({ collection }) =>
    audienceAllowsContact(collection.audience, context));
  accessibleCollections.forEach(({ structure }) => structure?.cards.forEach((card) => {
    if (card.docId && card.status === 'published') accessibleCardIds.add(card.docId);
  }));

  const byTitle = (left: ReaderAccountAccessItem, right: ReaderAccountAccessItem) =>
    left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  return {
    contactId: args.contactId,
    displayName: String(user.displayName || user.username || args.contactId),
    currentDisabled,
    proposedDisabled: args.proposedDisabled,
    effect,
    cards: [...accessibleCardIds]
      .map((id) => ({ id, title: cardsById.get(id)?.title || 'Untitled Card' }))
      .sort(byTitle),
    collections: accessibleCollections
      .map(({ collection }) => ({ id: collection.docId, title: collection.title }))
      .sort(byTitle),
  };
}
