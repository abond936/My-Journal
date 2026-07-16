export function getDimensionSubjectPresentation(
  dimensionTagIds: string[],
  explicitSubjectTagIds: string[]
): 'empty' | 'implicit' | 'multiple' | 'subject' | 'subjects' {
  if (dimensionTagIds.length === 0) return 'empty';
  if (dimensionTagIds.length === 1) return 'implicit';
  const dimensionSet = new Set(dimensionTagIds);
  const subjectCount = new Set(
    explicitSubjectTagIds.filter((tagId) => dimensionSet.has(tagId))
  ).size;
  if (subjectCount === 0) return 'multiple';
  return subjectCount === 1 ? 'subject' : 'subjects';
}
