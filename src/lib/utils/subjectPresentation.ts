export function getDimensionSubjectPresentation(
  dimensionTagIds: string[],
  explicitSubjectTagIds: string[]
): 'empty' | 'implicit' | 'multiple' | 'subjects' {
  if (dimensionTagIds.length === 0) return 'empty';
  if (dimensionTagIds.length === 1) return 'implicit';
  const dimensionSet = new Set(dimensionTagIds);
  return explicitSubjectTagIds.some((tagId) => dimensionSet.has(tagId)) ? 'subjects' : 'multiple';
}
