import { Card } from '@/lib/types/card';
import CardDetailPage from '@/components/view/CardDetailPage';
import { getCardById, getCardsByIds } from '@/lib/services/cardService';
import { notFound } from 'next/navigation';

interface CardPageProps {
  params: {
    id: string;
  };
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

export default async function CardPage({ params: { id } }: CardPageProps) {
  const pageData = await getCardData(id);

  if (!pageData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Error</h2>
        <p>Could not load card data for ID: {id}</p>
      </div>
    );
  }

  return <CardDetailPage card={pageData.card} childrenCards={pageData.children} />;
} 