import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, type TagDimension } from '@/lib/utils/tagDisplay';
import { isOperationalSentinelTagName } from '@/lib/utils/readerCardContext';
import { resolveTagDimension } from '@/lib/utils/tagDimensionResolve';
import { normalizeTagDimensionKey } from '@/lib/utils/tagUtils';

const DIMENSION_LABEL_LOWER = new Set(
  Object.values(DIMENSION_LABEL).map((label) => label.trim().toLowerCase())
);
const DIMENSION_KEY_LOWER = new Set(['who', 'what', 'when', 'where']);

const YEAR_RE = /^\d{4}$/;
const DECADE_RE = /^\d{4}s$/i;
const MONTH_NAMES = new Set([
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
]);

export const RECONCILE_BULK_WARN_MEDIA_COUNT = 40;

export function isImportFacingTag(tag: Tag, tagById: Map<string, Tag>): boolean {
  const name = tag.name.trim().toLowerCase();
  if (isOperationalSentinelTagName(tag.name)) return true;
  if (name.startsWith('z-')) return true;
  for (const ancestorId of tag.path ?? []) {
    const ancestor = tagById.get(ancestorId);
    if (ancestor && isOperationalSentinelTagName(ancestor.name)) return true;
  }
  return false;
}

export function isDimensionLabelTagName(name: string | undefined | null): boolean {
  const normalized = name?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return DIMENSION_LABEL_LOWER.has(normalized) || DIMENSION_KEY_LOWER.has(normalized);
}

export function isDimensionLabelTag(tag: Tag): boolean {
  if (tag.docId?.startsWith('dim-')) return true;
  return isDimensionLabelTagName(tag.name);
}

export function tagHasChildren(tag: Tag, tagById: Map<string, Tag>): boolean {
  for (const candidate of tagById.values()) {
    if (candidate.parentId === tag.docId) return true;
  }
  return false;
}

export function whenTagNameLooksAssignable(name: string): boolean {
  const normalized = name.trim();
  if (!normalized) return false;
  if (isDimensionLabelTagName(normalized)) return false;
  if (YEAR_RE.test(normalized)) return true;
  if (DECADE_RE.test(normalized)) return true;
  return MONTH_NAMES.has(normalized.toLowerCase());
}

export function whereTagNameLooksAssignable(name: string): boolean {
  const normalized = name.trim();
  if (!normalized) return false;
  if (isDimensionLabelTagName(normalized)) return false;
  if (isOperationalSentinelTagName(normalized)) return false;
  return normalized.length >= 2;
}

export function whoWhatTagNameLooksAssignable(name: string): boolean {
  const normalized = name.trim();
  if (!normalized) return false;
  if (isDimensionLabelTagName(normalized)) return false;
  if (isOperationalSentinelTagName(normalized)) return false;
  return normalized.length >= 2;
}

export function tagNameLooksAssignableForDimension(
  name: string,
  dimension: TagDimension | undefined
): boolean {
  switch (dimension) {
    case 'when':
      return whenTagNameLooksAssignable(name);
    case 'where':
      return whereTagNameLooksAssignable(name);
    case 'who':
    case 'what':
      return whoWhatTagNameLooksAssignable(name);
    default:
      return false;
  }
}

/** Author-facing tag that may receive import remaps. */
export function isValidMapTargetTag(tag: Tag, tagById: Map<string, Tag>): boolean {
  if (!tag.docId) return false;
  if (isImportFacingTag(tag, tagById)) return false;
  if (isDimensionLabelTag(tag)) return false;
  if (tagHasChildren(tag, tagById)) return false;

  const dimension = resolveTagDimension(tag.docId, tagById);
  if (!dimension) return false;
  return tagNameLooksAssignableForDimension(tag.name, dimension);
}

/** Import tag that should not offer one-click bulk map without extra confirmation. */
export function isLikelyBucketImportTag(tag: Tag, tagById: Map<string, Tag>): boolean {
  if (isDimensionLabelTagName(tag.name)) return true;
  if (isOperationalSentinelTagName(tag.name)) return true;
  if (tag.name.trim().toLowerCase().startsWith('z-')) return true;
  for (const ancestorId of tag.path ?? []) {
    const ancestor = tagById.get(ancestorId);
    if (ancestor && isOperationalSentinelTagName(ancestor.name)) return true;
  }
  return (tag.mediaCount ?? 0) > RECONCILE_BULK_WARN_MEDIA_COUNT;
}

export type MapTargetSuggestion = {
  tag: Tag;
  score: number;
};

export function suggestMapTargetTags(
  source: Tag,
  authorTags: Tag[],
  tagById: Map<string, Tag>
): MapTargetSuggestion[] {
  const needle = source.name.trim().toLowerCase();
  if (!needle) return [];

  const sourceDimension =
    (source.docId ? resolveTagDimension(source.docId, tagById) : undefined) ??
    normalizeTagDimensionKey(source.dimension as string | undefined);
  if (!sourceDimension) return [];

  return authorTags
    .filter((tag) => tag.docId && isValidMapTargetTag(tag, tagById))
    .filter((tag) => resolveTagDimension(tag.docId!, tagById) === sourceDimension)
    .map((tag) => {
      const name = tag.name.trim().toLowerCase();
      let score = 99;
      if (name === needle) score = 0;
      else if (name.startsWith(needle)) score = 1;
      else if (needle.startsWith(name)) score = 2;
      else if (name.includes(needle)) score = 3;
      else if (needle.includes(name)) score = 4;
      else return null;
      return { tag, score };
    })
    .filter((entry): entry is MapTargetSuggestion => entry !== null)
    .sort((a, b) => a.score - b.score || a.tag.name.localeCompare(b.tag.name))
    .slice(0, 5);
}

export function buildReconcileMediaFilter(
  sourceTagId: string,
  tagById: Map<string, Tag>
): Partial<Record<TagDimension, string[]>> | null {
  const dimension = resolveTagDimension(sourceTagId, tagById);
  if (!dimension) return null;
  return { [dimension]: [sourceTagId] };
}
