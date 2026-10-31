import type { Session } from 'next-auth';
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isAdminSession, isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { getMediaIdsFromCard } from '@/lib/services/cards/cardMediaHydrationService';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import { filterCardsForAudience } from '@/lib/auth/audienceAccess';

export async function canReadMedia(
  session: Session | null | undefined,
  media: Pick<Media, 'docId' | 'referencedByCardIds'>,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<boolean> {
  if (!isAuthenticatedSession(session)) return false;
  if (isAdminSession(session)) return true;

  const cardIds = Array.from(
    new Set((media.referencedByCardIds ?? []).filter((id) => typeof id === 'string' && id.trim()))
  );
  if (cardIds.length === 0) return false;

  for (let index = 0; index < cardIds.length; index += 30) {
    const chunk = cardIds.slice(index, index + 30);
    const snapshot = await firestore
      .collection('cards')
      .where(FieldPath.documentId(), 'in', chunk)
      .get();
    const referencedPublishedCards: Card[] = [];
    for (const doc of snapshot.docs) {
      const card = { docId: doc.id, ...doc.data() } as Card;
      if (card.status === 'published' && getMediaIdsFromCard(card).has(media.docId)) {
        referencedPublishedCards.push(card);
      }
    }
    if ((await filterCardsForAudience(session, referencedPublishedCards, firestore)).length > 0) {
      return true;
    }
  }
  return false;
}
