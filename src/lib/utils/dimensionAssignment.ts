import type { DimensionReviewMap } from '@/lib/types/dimensionReview';
import type { TemporalValue } from '@/lib/types/temporal';

export type AssignmentDimension = 'who' | 'what' | 'when' | 'where';

type DimensionAssignmentRecord = Partial<Record<AssignmentDimension, string[]>> & {
  temporal?: TemporalValue | null;
  dimensionReview?: DimensionReviewMap;
};

/**
 * A dimension is assigned when it has a tag value or an explicit structured
 * value. For When, a structured date and the reviewed Unknown/N/A resolutions
 * are values too; they must not appear in an Empty result.
 */
export function hasDimensionAssignment(
  record: DimensionAssignmentRecord,
  dimension: AssignmentDimension
): boolean {
  if ((record[dimension] ?? []).length > 0) return true;
  if (dimension === 'when' && record.temporal != null) return true;
  return record.dimensionReview?.[dimension]?.resolution != null;
}
