import type { Session } from 'next-auth';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isAdminSession, isAuthenticatedSession } from '@/lib/auth/readerAccess';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import type { SharedMediaCollection } from '@/lib/types/sharedMediaCollection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';
import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';

type AudienceContactContext = {
  contactId: string;
  groupIds: ReadonlySet<string>;
};

export function audienceAllowsContact(
  audience: AudienceSelection | null | undefined,
  context: AudienceContactContext
): boolean {
  // Compatibility: content without an audience field remains available to every
  // enabled Reader account until the author explicitly restricts it.
  if (!audience) return true;
  if (audience.allContacts) return true;
  if (audience.contactIds.includes(context.contactId)) return true;
  return audience.groupIds.some((groupId) => context.groupIds.has(groupId));
}

async function loadContactContext(
  session: Session,
  firestore: FirebaseFirestore.Firestore
): Promise<AudienceContactContext | null> {
  const contactId = session.user.id?.trim();
  if (!contactId) return null;
  const snapshot = await firestore
    .collection('audience_groups')
    .where('memberContactIds', 'array-contains', contactId)
    .get();
  return { contactId, groupIds: new Set(snapshot.docs.map((doc) => doc.id)) };
}

export async function filterCollectionsForAudience<T extends Collection>(
  session: Session | null | undefined,
  collections: T[],
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<T[]> {
  if (!isAuthenticatedSession(session)) return [];
  if (isAdminSession(session)) return collections;
  const context = await loadContactContext(session, firestore);
  if (!context) return [];
  return collections.filter(
    (collection) =>
      collection.recordState === 'active' &&
      collection.lifecycle === 'published' &&
      audienceAllowsContact(collection.audience, context)
  );
}

export async function filterSharedMediaCollectionsForAudience<T extends SharedMediaCollection>(
  session: Session | null | undefined,
  collections: T[],
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<T[]> {
  if (!isAuthenticatedSession(session)) return [];
  if (isAdminSession(session)) return collections;
  const context = await loadContactContext(session, firestore);
  if (!context) return [];
  return collections.filter((collection) =>
    collection.lifecycle === 'published' && audienceAllowsContact(collection.audience, context)
  );
}

export async function canReadCollectionForAudience(
  session: Session | null | undefined,
  collection: Collection,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<boolean> {
  return (await filterCollectionsForAudience(session, [collection], firestore)).length === 1;
}

export async function filterCardsForAudience<T extends Card>(
  session: Session | null | undefined,
  cards: T[],
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<T[]> {
  if (!isAuthenticatedSession(session)) return [];
  if (isAdminSession(session)) return cards;
  const context = await loadContactContext(session, firestore);
  if (!context) return [];

  const publishedCards = cards.filter((card) => card.status === 'published');
  const allowedIds = new Set(
    publishedCards
      .filter(
        (card) => isCardIncludedInFeed(card) && audienceAllowsContact(card.audience, context)
      )
      .map((card) => card.docId)
      .filter((id): id is string => Boolean(id))
  );
  const unresolvedIds = publishedCards
    .map((card) => card.docId)
    .filter((id): id is string => Boolean(id) && !allowedIds.has(id));

  const collectionRoutesByCard = await getReaderValidCollectionRoutesByCard({
    cardIds: unresolvedIds,
    firestore,
  });
  unresolvedIds.forEach((cardId) => {
    if ((collectionRoutesByCard.get(cardId) ?? []).some((collection) =>
      audienceAllowsContact(collection.audience, context))) {
      allowedIds.add(cardId);
    }
  });

  return publishedCards.filter((card) => Boolean(card.docId && allowedIds.has(card.docId)));
}

export async function canReadCardForAudience(
  session: Session | null | undefined,
  card: Card,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<boolean> {
  return (await filterCardsForAudience(session, [card], firestore)).length === 1;
}
