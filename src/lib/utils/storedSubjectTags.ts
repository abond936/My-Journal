export function normalizeSubjectTagId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSubjectTagIds(values: string[] | null | undefined): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map(normalizeSubjectTagId)
        .filter((id): id is string => Boolean(id))
    )
  );
}

export function resolveStoredSubjectTagIds(
  subjectTagIds: string[] | null | undefined,
  legacySubjectTagId: string | null | undefined
): string[] {
  if (subjectTagIds != null) return normalizeSubjectTagIds(subjectTagIds);
  const legacy = normalizeSubjectTagId(legacySubjectTagId);
  return legacy ? [legacy] : [];
}
