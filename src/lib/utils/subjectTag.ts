import { getTagAncestors } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

type ResolveSubjectTagStateInput = {
  assignedTagIds?: string[] | null;
  existingSubjectTagId?: string | null;
  requestedSubjectTagId?: string | null;
  subjectTagIdProvided: boolean;
  allTags?: Tag[];
};

export function normalizeSubjectTagId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function buildSubjectFilterTags(
  subjectTagId: string | null | undefined,
  allTags?: Tag[]
): Promise<Record<string, boolean>> {
  const normalizedSubjectTagId = normalizeSubjectTagId(subjectTagId);
  if (!normalizedSubjectTagId) {
    return {};
  }

  const ancestorIds = await getTagAncestors([normalizedSubjectTagId], allTags);
  return Array.from(new Set([normalizedSubjectTagId, ...ancestorIds])).reduce(
    (acc, tagId) => {
      acc[tagId] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

export async function resolveSubjectTagState({
  assignedTagIds,
  existingSubjectTagId,
  requestedSubjectTagId,
  subjectTagIdProvided,
  allTags,
}: ResolveSubjectTagStateInput): Promise<{
  subjectTagId: string | null;
  subjectFilterTags: Record<string, boolean>;
}> {
  const normalizedAssignedTagIds = Array.from(
    new Set(
      (assignedTagIds ?? []).filter(
        (tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0
      )
    )
  );
  const assignedSet = new Set(normalizedAssignedTagIds);

  let resolvedSubjectTagId: string | null;
  if (subjectTagIdProvided) {
    resolvedSubjectTagId = normalizeSubjectTagId(requestedSubjectTagId);
    if (resolvedSubjectTagId && !assignedSet.has(resolvedSubjectTagId)) {
      throw new Error("Subject tag must be one of the item's assigned tags.");
    }
  } else {
    const existingSubject = normalizeSubjectTagId(existingSubjectTagId);
    resolvedSubjectTagId = existingSubject && assignedSet.has(existingSubject) ? existingSubject : null;
  }

  return {
    subjectTagId: resolvedSubjectTagId,
    subjectFilterTags: await buildSubjectFilterTags(resolvedSubjectTagId, allTags),
  };
}
