import type { Card } from '@/lib/types/card';

export type CardCodificationFilter = 'all' | 'complete' | 'incomplete';

export function isCardCodificationComplete(
  card: Pick<Card, 'who' | 'what' | 'when' | 'where'>
): boolean {
  return Boolean(
    card.who?.length &&
      card.what?.length &&
      card.when?.length &&
      card.where?.length
  );
}

export function cardMatchesCodificationFilter(
  card: Pick<Card, 'who' | 'what' | 'when' | 'where'>,
  filter: CardCodificationFilter
): boolean {
  if (filter === 'all') return true;
  const complete = isCardCodificationComplete(card);
  return filter === 'complete' ? complete : !complete;
}
