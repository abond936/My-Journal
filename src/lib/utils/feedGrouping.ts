import type { Card } from '@/lib/types/card';
import { JOURNAL_WHEN_UNDATED_ASC } from '@/lib/utils/journalWhenSort';

export type FeedGroupBy = 'none' | 'who' | 'what' | 'when' | 'where';

const EMPTY_DIM = '—';

function isZnaName(name: string): boolean {
  return name.trim().toLowerCase() === 'zna';
}

/** One group per card: label from first tag in dimension sorted by display name (stable). */
export function primaryGroupLabel(
  card: Card,
  dimension: Exclude<FeedGroupBy, 'none'>,
  nameById: Map<string, string>
): string {
  const ids = card[dimension] ?? [];
  const nonZna = ids.filter((id) => !isZnaName(nameById.get(id) || ''));
  const pool = nonZna.length > 0 ? nonZna : ids;

  if (pool.length === 0) {
    if (dimension === 'when') {
      const asc = card.journalWhenSortAsc;
      if (asc == null || asc >= JOURNAL_WHEN_UNDATED_ASC) return 'Undated';
    }
    return dimension === 'when' ? 'Undated' : EMPTY_DIM;
  }

  const sorted = [...pool].sort((a, b) =>
    (nameById.get(a) || a).localeCompare(nameById.get(b) || b, undefined, { sensitivity: 'base' })
  );
  return nameById.get(sorted[0]!) || sorted[0]!;
}

function compareSectionHeadings(a: string, b: string): number {
  const sink = (h: string) => h === 'Undated' || h === EMPTY_DIM;
  if (sink(a) && !sink(b)) return 1;
  if (sink(b) && !sink(a)) return -1;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function groupCardsForFeed(
  cards: Card[],
  groupBy: FeedGroupBy,
  nameById: Map<string, string>
): { heading: string; cards: Card[] }[] | null {
  if (groupBy === 'none' || cards.length === 0) return null;

  const buckets = new Map<string, Card[]>();
  for (const card of cards) {
    const label = primaryGroupLabel(card, groupBy, nameById);
    const list = buckets.get(label) ?? [];
    list.push(card);
    buckets.set(label, list);
  }

  const entries = [...buckets.entries()].sort(([ha], [hb]) => compareSectionHeadings(ha, hb));
  return entries.map(([heading, sectionCards]) => ({ heading, cards: sectionCards }));
}
