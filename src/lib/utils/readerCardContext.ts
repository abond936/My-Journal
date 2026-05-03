import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap, buildTagByIdMap } from '@/lib/utils/tagDimensionResolve';

export interface ReaderCardContextChip {
  dimension: TagDimension;
  label: string;
}

export interface ReaderCardPresentation {
  badgeLabel: 'Story' | 'Gallery' | null;
  chips: ReaderCardContextChip[];
}

const EXACT_YEAR_RE = /^\d{4}$/;
const DECADE_RE = /^\d{4}s$/i;
const STATE_LEVEL_SUFFIX_RE = /\b(county|province|region|territory|prefecture|department|canton)\b/i;
const US_STATE_NAMES = new Set([
  'alabama',
  'alaska',
  'arizona',
  'arkansas',
  'california',
  'colorado',
  'connecticut',
  'delaware',
  'district of columbia',
  'florida',
  'georgia',
  'hawaii',
  'idaho',
  'illinois',
  'indiana',
  'iowa',
  'kansas',
  'kentucky',
  'louisiana',
  'maine',
  'maryland',
  'massachusetts',
  'michigan',
  'minnesota',
  'mississippi',
  'missouri',
  'montana',
  'nebraska',
  'nevada',
  'new hampshire',
  'new jersey',
  'new mexico',
  'new york',
  'north carolina',
  'north dakota',
  'ohio',
  'oklahoma',
  'oregon',
  'pennsylvania',
  'rhode island',
  'south carolina',
  'south dakota',
  'tennessee',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'washington',
  'west virginia',
  'wisconsin',
  'wyoming',
]);

function isGenericDimensionNode(tag: Tag, dimension: TagDimension): boolean {
  return tag.name.trim().toLowerCase() === dimension;
}

function getSameDimensionLineage(
  tag: Tag,
  dimension: TagDimension,
  tagById: Map<string, Tag>,
  resolvedDimensionById: Map<string, TagDimension | undefined>
): Tag[] {
  const ids = [...(tag.path ?? []), tag.docId].filter((id): id is string => Boolean(id));
  return ids
    .map((id) => tagById.get(id))
    .filter((candidate): candidate is Tag => Boolean(candidate?.docId))
    .filter((candidate) => resolvedDimensionById.get(candidate.docId!) === dimension);
}

function getUsefulLineage(line: Tag[], dimension: TagDimension): Tag[] {
  return line.filter((tag) => !isGenericDimensionNode(tag, dimension));
}

function getDeepestCommonTag(lines: Tag[][], dimension: TagDimension): Tag | undefined {
  if (lines.length === 0) return undefined;

  let idx = 0;
  let lastCommon: Tag | undefined;

  while (true) {
    const candidate = lines[0]?.[idx];
    if (!candidate?.docId) break;
    const matchesEveryLine = lines.every((line) => line[idx]?.docId === candidate.docId);
    if (!matchesEveryLine) break;
    if (!isGenericDimensionNode(candidate, dimension)) {
      lastCommon = candidate;
    }
    idx += 1;
  }

  return lastCommon;
}

function getParentOrSelf(line: Tag[]): Tag | undefined {
  if (line.length === 0) return undefined;
  return line.length >= 2 ? line[line.length - 2] : line[line.length - 1];
}

function getWhenTag(line: Tag[]): Tag | undefined {
  const useful = line.filter((tag) => !isGenericDimensionNode(tag, 'when'));
  const exactYear = [...useful].reverse().find((tag) => EXACT_YEAR_RE.test(tag.name.trim()));
  if (exactYear) return exactYear;

  const decade = [...useful].reverse().find((tag) => DECADE_RE.test(tag.name.trim()));
  if (decade) return decade;

  return useful[useful.length - 1];
}

function getWhereTag(line: Tag[]): Tag | undefined {
  const useful = getUsefulLineage(line, 'where');
  if (useful.length === 0) return undefined;
  if (useful.length === 1) return useful[0];
  if (useful.length === 2) {
    const candidate = useful[1]!;
    const normalized = candidate.name.trim().toLowerCase();
    return US_STATE_NAMES.has(normalized) || STATE_LEVEL_SUFFIX_RE.test(candidate.name)
      ? candidate
      : useful[0];
  }
  if (useful.length >= 3) return useful[1];
  return useful[0];
}

function getDisplayTagForDimension(
  dimension: TagDimension,
  directTags: Tag[],
  tagById: Map<string, Tag>,
  resolvedDimensionById: Map<string, TagDimension | undefined>
): Tag | undefined {
  if (directTags.length === 0) return undefined;

  const lines = directTags
    .map((tag) => getSameDimensionLineage(tag, dimension, tagById, resolvedDimensionById))
    .map((line) => getUsefulLineage(line, dimension))
    .filter((line) => line.length > 0);

  if (lines.length === 0) return undefined;

  if (dimension === 'when') return getWhenTag(lines[0]!);
  if (dimension === 'where') {
    return lines.length > 1 ? getDeepestCommonTag(lines, dimension) ?? getWhereTag(lines[0]!) : getWhereTag(lines[0]!);
  }

  if (lines.length > 1) {
    return getDeepestCommonTag(lines, dimension);
  }

  return getParentOrSelf(lines[0]!);
}

export function buildReaderCardPresentation(card: Pick<Card, 'type' | 'tags'>, allTags: Tag[]): ReaderCardPresentation {
  const badgeLabel =
    card.type === 'story' ? 'Story' : card.type === 'gallery' ? 'Gallery' : null;

  if (!card.tags?.length || allTags.length === 0) {
    return { badgeLabel, chips: [] };
  }

  const tagById = buildTagByIdMap(allTags);
  const resolvedDimensionById = buildResolvedTagDimensionMap(allTags);
  const directTags = card.tags
    .map((id) => tagById.get(id))
    .filter((tag): tag is Tag => Boolean(tag?.docId));

  const chips = DIMENSION_ORDER.flatMap((dimension) => {
    const dimensionalDirectTags = directTags.filter(
      (tag) => resolvedDimensionById.get(tag.docId!) === dimension
    );
    const displayTag = getDisplayTagForDimension(
      dimension,
      dimensionalDirectTags,
      tagById,
      resolvedDimensionById
    );
    const label = displayTag?.name?.trim();
    return label ? [{ dimension, label }] : [];
  });

  return { badgeLabel, chips };
}
