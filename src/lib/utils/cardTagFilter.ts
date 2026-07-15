import type { Card } from '@/lib/types/card';

export function cardMatchesExactTagScope(
  card: Pick<Card, 'tags' | 'subjectTagId'>,
  required: string[] | undefined,
  tagScope: 'all' | 'subject'
): boolean {
  if (!required || required.length === 0) return true;
  if (tagScope === 'subject') {
    return Boolean(card.subjectTagId && required.includes(card.subjectTagId));
  }
  const directTags = new Set(card.tags ?? []);
  return required.some((tagId) => directTags.has(tagId));
}
