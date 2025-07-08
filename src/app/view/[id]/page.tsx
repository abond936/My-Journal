import { Card } from '@/lib/types/card';
import CardDetailPage from './CardDetailPage';
import { getCardById, getCardsByIds } from '@/lib/services/cardService';
import { serializeCardForClient } from '@/lib/utils/dateUtils';
import { notFound } from 'next/navigation';

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

async function getCardData(id: string): Promise<CardPageData | null> {
  try {
    // 1. Fetch the parent card
    const card = await getCardById(id);
    if (!card) {
      return null;
    }

    // 2. Fetch the children if they exist
    let children: Card[] = [];
    if (card.childrenIds && card.childrenIds.length > 0) {
      children = await getCardsByIds(card.childrenIds);
    }
    
    return { card, children };
  } catch (error) {
    console.error(`Error fetching card data for ${id}:`, error);
    return null;
  }
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;
  const pageData = await getCardData(id);

  if (!pageData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Error</h2>
        <p>Could not load card data for ID: {id}</p>
      </div>
    );
  }

  // Serialize both card and children data for client components
  const serializedCard = serializeCardForClient(pageData.card);
  const serializedChildren = pageData.children.map(child => serializeCardForClient(child));

  return <CardDetailPage card={serializedCard} childrenCards={serializedChildren} />;
} 