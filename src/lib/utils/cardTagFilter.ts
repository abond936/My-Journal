import type { Card } from '@/lib/types/card';
import { matchesSelectedTags, type TagSelectionMode } from './tagSelectionMode';
import { resolveStoredSubjectTagIds } from './storedSubjectTags';

export function cardMatchesExactTagScope(
  card: Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds' | 'galleryImplicitSubjectTagIds'>,
  required: string[] | undefined,
  tagScope: 'all' | 'subject',
  tagSelectionMode: TagSelectionMode = 'any'
): boolean {
  if (!required || required.length === 0) return true;
  if (tagScope === 'subject') {
    const explicit = resolveStoredSubjectTagIds(card.subjectTagIds, card.subjectTagId);
    const subjects = [...explicit, ...(card.galleryImplicitSubjectTagIds ?? [])];
    return matchesSelectedTags(subjects, required, tagSelectionMode);
  }
  const directTags = new Set(card.tags ?? []);
  return matchesSelectedTags(directTags, required, tagSelectionMode);
}
