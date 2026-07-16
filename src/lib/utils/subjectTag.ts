import { getTagAncestors } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

type ResolveSubjectTagStateInput = {
  assignedTagIds?: string[] | null;
  existingSubjectTagId?: string | null;
  existingSubjectTagIds?: string[] | null;
  requestedSubjectTagId?: string | null;
  requestedSubjectTagIds?: string[] | null;
  subjectTagIdProvided: boolean;
  subjectTagIdsProvided?: boolean;
  allTags?: Tag[];
};

export function normalizeSubjectTagId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSubjectTagIds(values: string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map(normalizeSubjectTagId).filter((id): id is string => Boolean(id))));
}

export function getDimensionSubjectPresentation(
  dimensionTagIds: string[],
  explicitSubjectTagIds: string[]
): 'empty' | 'implicit' | 'multiple' | 'subjects' {
  if (dimensionTagIds.length === 0) return 'empty';
  if (dimensionTagIds.length === 1) return 'implicit';
  const dimensionSet = new Set(dimensionTagIds);
  return explicitSubjectTagIds.some((tagId) => dimensionSet.has(tagId)) ? 'subjects' : 'multiple';
}

export async function buildSubjectFilterTags(
  subjectTagIdOrIds: string | string[] | null | undefined,
  allTags?: Tag[]
): Promise<Record<string, boolean>> {
  const subjectTagIds = Array.isArray(subjectTagIdOrIds)
    ? normalizeSubjectTagIds(subjectTagIdOrIds)
    : [normalizeSubjectTagId(subjectTagIdOrIds)].filter((id): id is string => Boolean(id));
  if (subjectTagIds.length === 0) return {};

  const ancestorIds = await getTagAncestors(subjectTagIds, allTags);
  return Array.from(new Set([...subjectTagIds, ...ancestorIds])).reduce(
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
  existingSubjectTagIds,
  requestedSubjectTagId,
  requestedSubjectTagIds,
  subjectTagIdProvided,
  subjectTagIdsProvided = false,
  allTags,
}: ResolveSubjectTagStateInput): Promise<{
  subjectTagId: string | null;
  subjectTagIds: string[];
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

  let resolvedSubjectTagIds: string[];
  if (subjectTagIdsProvided) {
    resolvedSubjectTagIds = normalizeSubjectTagIds(requestedSubjectTagIds);
  } else if (subjectTagIdProvided) {
    const requested = normalizeSubjectTagId(requestedSubjectTagId);
    resolvedSubjectTagIds = requested ? [requested] : [];
  } else {
    const existing = normalizeSubjectTagIds(existingSubjectTagIds);
    const legacy = normalizeSubjectTagId(existingSubjectTagId);
    resolvedSubjectTagIds = (existing.length > 0 ? existing : legacy ? [legacy] : [])
      .filter((tagId) => assignedSet.has(tagId));
  }
  for (const tagId of resolvedSubjectTagIds) {
    if (!assignedSet.has(tagId)) {
      throw new Error(
        subjectTagIdsProvided
          ? "Subject tags must be among the item's assigned tags."
          : "Subject tag must be one of the item's assigned tags."
      );
    }
  }

  return {
    subjectTagId: resolvedSubjectTagIds[0] ?? null,
    subjectTagIds: resolvedSubjectTagIds,
    subjectFilterTags: await buildSubjectFilterTags(resolvedSubjectTagIds, allTags),
  };
}
