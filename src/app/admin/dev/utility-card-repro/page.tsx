import { getCards } from '@/lib/services/cards/cardListQueryService';
import type { Card } from '@/lib/types/card';
import UtilityCardReproClient from './UtilityCardReproClient';

export const dynamic = 'force-dynamic';

function isQuestionBaselineCandidate(card: Card): boolean {
  return card.type === 'qa' && !card.coverImageId && !card.coverImage;
}

async function getQuestionBaseline(): Promise<Card | null> {
  const { items } = await getCards({
    status: 'all',
    type: 'qa',
    limit: 50,
    hydrationMode: 'full',
    sortBy: 'created',
    sortDir: 'desc',
  });

  return items.find(isQuestionBaselineCandidate) ?? items.find((card) => !card.coverImageId) ?? items[0] ?? null;
}

async function getUtilityCards(type: 'quote' | 'callout'): Promise<Card[]> {
  const { items } = await getCards({
    status: 'all',
    type,
    limit: 25,
    hydrationMode: 'full',
    sortBy: 'created',
    sortDir: 'desc',
  });

  return items;
}

export default async function UtilityCardReproPage() {
  const [questionCard, quoteCards, calloutCards] = await Promise.all([
    getQuestionBaseline(),
    getUtilityCards('quote'),
    getUtilityCards('callout'),
  ]);

  return (
    <UtilityCardReproClient
      questionCard={questionCard}
      quoteCards={quoteCards}
      calloutCards={calloutCards}
    />
  );
}
