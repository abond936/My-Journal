import type {
  DimensionReviewEntry,
  DimensionReviewMap,
} from '@/lib/types/dimensionReview';
import type { TagDimension } from '@/lib/utils/tagDisplay';
import type { Tag } from '@/lib/types/tag';
import type { TemporalValue } from '@/lib/types/temporal';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import { DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import type { AdminDimensionReviewFilter } from '@/lib/preferences/adminFilters';

export function getDimensionReviewEntry(
  review: DimensionReviewMap,
  dimension: TagDimension
): DimensionReviewEntry | undefined {
  return review?.[dimension];
}

export function formatDimensionResolution(
  entry: DimensionReviewEntry | null | undefined
): 'N/A' | 'Unknown' | null {
  if (entry?.resolution === 'not_applicable') return 'N/A';
  if (entry?.resolution === 'unknown') return 'Unknown';
  return null;
}

export function matchesDimensionReviewFilter(
  dimensionReview: DimensionReviewMap,
  dimension: TagDimension,
  filter: AdminDimensionReviewFilter | undefined
): boolean {
  if (!filter) return true;
  const entry = dimensionReview?.[dimension];
  if (filter === 'unreviewed') return entry?.reviewed !== true;
  return entry?.resolution === filter;
}

export function reconcileDimensionReviewMap({
  dimensionReview,
  assignedTagIds,
  temporal,
  allTags,
}: {
  dimensionReview: DimensionReviewMap;
  assignedTagIds: string[];
  temporal?: TemporalValue | null;
  allTags: Tag[];
}): DimensionReviewMap {
  const dimensions = buildResolvedTagDimensionMap(allTags);
  const assignedDimensions = new Set(
    assignedTagIds
      .map((tagId) => dimensions.get(tagId))
      .filter((dimension): dimension is TagDimension => Boolean(dimension))
  );
  const next: NonNullable<DimensionReviewMap> = {};

  for (const dimension of DIMENSION_ORDER) {
    const current = dimensionReview?.[dimension];
    const temporalResolution =
      dimension === 'when' &&
      (temporal?.status === 'unknown' || temporal?.status === 'not_applicable')
        ? temporal.status
        : null;
    if (!current && !temporalResolution) continue;

    const hasKnownValue =
      assignedDimensions.has(dimension) ||
      (dimension === 'when' && temporal?.status === 'known');
    const resolution = hasKnownValue
      ? null
      : temporalResolution ?? current?.resolution ?? null;
    const reviewed = resolution != null
      ? true
      : current?.reviewed === true && hasKnownValue;
    const entry: DimensionReviewEntry = { reviewed, resolution };
    if (reviewed && current?.reviewedAt !== undefined) {
      entry.reviewedAt = current.reviewedAt;
    }
    if (reviewed && current?.reviewedBy !== undefined) {
      entry.reviewedBy = current.reviewedBy;
    }
    next[dimension] = entry;
  }

  return next;
}
