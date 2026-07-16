import type { Card } from '@/lib/types/card';

export function cardMatchesExactTagScope(
  card: Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds' | 'galleryImplicitSubjectTagIds'>,
  required: string[] | undefined,
  tagScope: 'all' | 'subject'
): boolean {
  if (!required || required.length === 0) return true;
  if (tagScope === 'subject') {
    const explicit = card.subjectTagIds?.length ? card.subjectTagIds : card.subjectTagId ? [card.subjectTagId] : [];
    const subjects = [...explicit, ...(card.galleryImplicitSubjectTagIds ?? [])];
    return subjects.some((tagId) => required.includes(tagId));
  }
  const directTags = new Set(card.tags ?? []);
  return required.some((tagId) => directTags.has(tagId));
}
