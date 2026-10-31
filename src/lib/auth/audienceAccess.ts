import type { Session } from 'next-auth';
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isAdminSession, isAuthenticatedSession } from '@/lib/auth/readerAccess';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';

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

async function loadCollectionsByIds(
  ids: string[],
  firestore: FirebaseFirestore.Firestore
): Promise<Map<string, Collection>> {
  const collections = new Map<string, Collection>();
  for (let index = 0; index < ids.length; index += 30) {
    const chunk = ids.slice(index, index + 30);
    if (!chunk.length) continue;
    const snapshot = await firestore
      .collection('collections')
      .where(FieldPath.documentId(), 'in', chunk)
      .get();
    snapshot.docs.forEach((doc) => {
      collections.set(doc.id, { docId: doc.id, ...doc.data() } as Collection);
    });
  }
  return collections;
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

  const placements: Array<{ cardId: string; collectionId: string }> = [];
  for (let index = 0; index < unresolvedIds.length; index += 30) {
    const chunk = unresolvedIds.slice(index, index + 30);
    if (!chunk.length) continue;
    const snapshot = await firestore
      .collection('collection_placements')
      .where('cardId', 'in', chunk)
      .get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as { cardId?: string; collectionId?: string };
      if (data.cardId && data.collectionId) placements.push({ cardId: data.cardId, collectionId: data.collectionId });
    });
  }

  const collectionIds = Array.from(new Set(placements.map((placement) => placement.collectionId)));
  const collections = await loadCollectionsByIds(collectionIds, firestore);
  for (const placement of placements) {
    const collection = collections.get(placement.collectionId);
    if (
      collection?.recordState === 'active' &&
      collection.lifecycle === 'published' &&
      audienceAllowsContact(collection.audience, context)
    ) {
      allowedIds.add(placement.cardId);
    }
  }

  return publishedCards.filter((card) => Boolean(card.docId && allowedIds.has(card.docId)));
}

export async function canReadCardForAudience(
  session: Session | null | undefined,
  card: Card,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<boolean> {
  return (await filterCardsForAudience(session, [card], firestore)).length === 1;
}
