import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap, buildTagByIdMap } from '@/lib/utils/tagDimensionResolve';
import { getDimensionSubjectPresentation } from '@/lib/utils/subjectPresentation';

export interface ReaderCardContextChip {
  dimension: TagDimension;
  label: string;
}

export interface FeedTileDimensionSlot {
  dimension: TagDimension;
  /** `null` = empty placeholder (`-` on tile). */
  label: string | null;
  /** Exact assignments and explicit subjects for compact-tile disclosure. */
  tooltip: string | null;
}

export interface ReaderCardPresentation {
  badgeLabel: 'Story' | 'Gallery' | 'Question' | null;
  chips: ReaderCardContextChip[];
}

/** Operational sentinels (e.g. `zNA`) are not reader tile vocabulary. */
export function isOperationalSentinelTagName(name: string | undefined | null): boolean {
  const normalized = name?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  if (normalized === 'zna' || normalized === 'zmisc') return true;
  return normalized.startsWith('z-');
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
    card.type === 'story'
      ? 'Story'
      : card.type === 'gallery'
        ? 'Gallery'
        : card.type === 'qa'
          ? 'Question'
          : null;

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

/** Fixed Who / What / When / Where slots for closed feed tile chip rows. */
export function buildFeedTileDimensionSlots(
  card: Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds'>,
  allTags: Tag[]
): FeedTileDimensionSlot[] {
  if (!allTags.length) {
    return DIMENSION_ORDER.map((dimension) => ({ dimension, label: null, tooltip: null }));
  }

  const tagById = buildTagByIdMap(allTags);
  const resolvedDimensionById = buildResolvedTagDimensionMap(allTags);
  const directTags = (card.tags ?? [])
    .map((id) => tagById.get(id))
    .filter((tag): tag is Tag => Boolean(tag?.docId))
    .filter((tag) => !isOperationalSentinelTagName(tag.name));
  const explicitSubjectTagIds = Array.from(new Set([
    ...(card.subjectTagIds ?? []),
    ...(card.subjectTagId ? [card.subjectTagId] : []),
  ]));

  return DIMENSION_ORDER.map((dimension) => {
    const dimensionalDirectTags = directTags.filter(
      (tag) => resolvedDimensionById.get(tag.docId!) === dimension
    );
    if (dimensionalDirectTags.length === 0) {
      return { dimension, label: null, tooltip: null };
    }
    const assigned = [...dimensionalDirectTags].sort((a, b) => a.name.localeCompare(b.name));
    const assignedIds = assigned.map((tag) => tag.docId!);
    const presentation = getDimensionSubjectPresentation(assignedIds, explicitSubjectTagIds);
    if (presentation === 'implicit') {
      const label = assigned[0]?.name.trim() || null;
      return { dimension, label, tooltip: label };
    }
    const assignedNames = assigned.map((tag) => tag.name.trim()).filter(Boolean);
    if (presentation === 'subject' || presentation === 'subjects') {
      const assignedIdSet = new Set(assignedIds);
      const subjectNames = explicitSubjectTagIds
        .filter((id) => assignedIdSet.has(id))
        .map((id) => tagById.get(id)?.name.trim())
        .filter((name): name is string => Boolean(name));
      return {
        dimension,
        label: presentation === 'subject' ? subjectNames[0] ?? 'Multiple' : 'Subjects+',
        tooltip: `Subjects: ${subjectNames.join(', ')}\nAll: ${assignedNames.join(', ')}`,
      };
    }
    return { dimension, label: 'Multiple', tooltip: assignedNames.join(', ') };
  });
}
