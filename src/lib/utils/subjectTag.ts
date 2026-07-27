import { getTagAncestors } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';
import type { TemporalValue } from '@/lib/types/temporal';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import {
  normalizeSubjectTagId,
  normalizeSubjectTagIds,
  resolveStoredSubjectTagIds,
} from '@/lib/utils/storedSubjectTags';

export {
  normalizeSubjectTagId,
  normalizeSubjectTagIds,
  resolveStoredSubjectTagIds,
} from '@/lib/utils/storedSubjectTags';

type ResolveSubjectTagStateInput = {
  assignedTagIds?: string[] | null;
  existingSubjectTagId?: string | null;
  existingSubjectTagIds?: string[] | null;
  requestedSubjectTagId?: string | null;
  requestedSubjectTagIds?: string[] | null;
  subjectTagIdProvided: boolean;
  subjectTagIdsProvided?: boolean;
  temporal?: TemporalValue | null;
  allTags?: Tag[];
};

export function filterSubjectTagIdsForTemporal(
  subjectTagIds: string[],
  temporal: TemporalValue | null | undefined,
  allTags?: Tag[]
): string[] {
  const normalized = normalizeSubjectTagIds(subjectTagIds);
  if (temporal?.status !== 'known' || !allTags) return normalized;
  const dimensions = buildResolvedTagDimensionMap(allTags);
  return normalized.filter((tagId) => dimensions.get(tagId) !== 'when');
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
  temporal,
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
    // Once the canonical array exists, including as an explicit empty array, it owns truth.
    // The legacy singular field is fallback only for records that predate the array field.
    resolvedSubjectTagIds = resolveStoredSubjectTagIds(existingSubjectTagIds, existingSubjectTagId)
      .filter((tagId) => assignedSet.has(tagId));
  }

  // A structured known date is the authored When subject. Legacy When tags remain assigned
  // for migration safety, but must not remain effective subjects or subject-filter truth.
  resolvedSubjectTagIds = filterSubjectTagIdsForTemporal(
    resolvedSubjectTagIds,
    temporal,
    allTags
  );
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
