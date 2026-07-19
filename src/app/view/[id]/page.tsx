import { Card } from '@/lib/types/card';
import CardDetailPage from './CardDetailPage';
import { getCardById, getCardsByIds } from '@/lib/services/cardService';
import { serializeCardForClient } from '@/lib/utils/dateUtils';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { buildLoginRedirectPath } from '@/lib/utils/marketingRoutes';
import { canReadCard, filterReadableCards, isAuthenticatedSession } from '@/lib/auth/readerAccess';

interface CardPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface CardPageData {
  card: Card;
  children: Card[];
}

// Re-export for Next.js to recognize the dynamic nature of the page
export const dynamic = 'force-dynamic';

async function getCardData(id: string, session: Session | null): Promise<CardPageData | null> {
  try {
    // 1. Fetch the parent card
    const card = await getCardById(id);
    if (!card || !canReadCard(session, card)) {
      return null;
    }

    // 2. Fetch the children if they exist
    let children: Card[] = [];
    if (card.childrenIds && card.childrenIds.length > 0) {
      const hydratedChildren = await getCardsByIds(card.childrenIds, { hydrationMode: 'cover-only' });
      children = filterReadableCards(session, hydratedChildren);
    }
    
    return { card, children };
  } catch (error) {
    console.error(`Error fetching card data for ${id}:`, error);
    return null;
  }
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!isAuthenticatedSession(session)) {
    redirect(buildLoginRedirectPath(`/view/${encodeURIComponent(id)}`));
  }

  const pageData = await getCardData(id, session);

  if (!pageData) {
    notFound();
  }

  // Serialize both card and children data for client components
  const serializedCard = serializeCardForClient(pageData.card);
  const serializedChildren = pageData.children.map(child => serializeCardForClient(child));

  return <CardDetailPage card={serializedCard} childrenCards={serializedChildren} />;
}
