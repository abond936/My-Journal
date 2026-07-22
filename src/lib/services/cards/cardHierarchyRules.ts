import type { Card } from '@/lib/types/card';

export function normalizeChildrenIds(childrenIds: unknown, selfId?: string): string[] {
  if (!Array.isArray(childrenIds)) return [];
  const seen = new Set<string>();
  for (const raw of childrenIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || (selfId && id === selfId)) continue;
    seen.add(id);
  }
  return Array.from(seen);
}

export function computeCuratedNavEligible(
  card: Pick<Card, 'childrenIds' | 'isCollectionRoot'>
): boolean {
  return normalizeChildrenIds(card.childrenIds).length > 0 || card.isCollectionRoot === true;
}
