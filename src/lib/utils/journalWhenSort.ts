import type { Tag } from '@/lib/types/tag';

export function buildTagMap(allTags: Tag[]): Map<string, Tag> {
  return new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
}

/** Oldest-first: undated sorts after any real tagged date (8-digit packed keys). */
export const JOURNAL_WHEN_UNDATED_ASC = 99_999_999;

/** Newest-first: undated sorts after all dated cards. */
export const JOURNAL_WHEN_UNDATED_DESC = -1;

const ZNA = /^zna$/i;

/**
 * Parse a When tag **display name** (or path segment) into a sortable YYYYMMDD-style integer.
 * Uses `00` for unknown month/day per authoring convention for When tag names (see docs/02-Application.md → tags / When).
 */
export function parseWhenTagNameToPackedDate(name: string): number | null {
  const t = name.trim();
  if (!t || ZNA.test(t)) return null;

  const ymd = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) {
    const y = ymd[1]!;
    const mo = ymd[2]!;
    const d = ymd[3]!;
    const n = parseInt(`${y}${mo}${d}`, 10);
    return Number.isFinite(n) ? n : null;
  }

  const decade = t.match(/^(\d{4})s$/i);
  if (decade) {
    const y = parseInt(decade[1]!, 10);
    if (!Number.isFinite(y)) return null;
    return y * 10_000; // e.g. 2010s → 20100000
  }

  const yearOnly = t.match(/^(\d{4})$/);
  if (yearOnly) {
    const y = parseInt(yearOnly[1]!, 10);
    if (!Number.isFinite(y)) return null;
    return y * 10_000; // e.g. 2019 → 20190000
  }

  return null;
}

function tagNameChain(tagId: string, tagMap: Map<string, Tag>): string[] {
  const names: string[] = [];
  let cur: Tag | undefined = tagMap.get(tagId);
  const guard = new Set<string>();
  while (cur && cur.docId && !guard.has(cur.docId)) {
    guard.add(cur.docId);
    names.unshift((cur.name || '').trim());
    if (!cur.parentId) break;
    cur = tagMap.get(cur.parentId);
  }
  return names;
}

/** Smallest packed date found on this tag’s ancestry (earliest anchor). */
function bestPackedForWhenTagId(whenTagId: string, tagMap: Map<string, Tag>): number | null {
  const chain = tagNameChain(whenTagId, tagMap);
  let best: number | null = null;
  for (const segment of chain) {
    const p = parseWhenTagNameToPackedDate(segment);
    if (p == null) continue;
    if (best == null || p < best) best = p;
  }
  return best;
}

/**
 * From denormalized When tag ids on a card: earliest parseable journal date, or undated.
 * Rule: minimum packed key across all When tags; ignore segments that don’t parse (incl. zNA).
 */
export function computeJournalWhenSortKeys(
  whenTagIds: string[] | undefined,
  tagMap: Map<string, Tag>
): { journalWhenSortAsc: number; journalWhenSortDesc: number } {
  const ids = whenTagIds?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return {
      journalWhenSortAsc: JOURNAL_WHEN_UNDATED_ASC,
      journalWhenSortDesc: JOURNAL_WHEN_UNDATED_DESC,
    };
  }

  let minPacked: number | null = null;
  for (const id of ids) {
    const p = bestPackedForWhenTagId(id, tagMap);
    if (p == null) continue;
    if (minPacked == null || p < minPacked) minPacked = p;
  }

  if (minPacked == null) {
    return {
      journalWhenSortAsc: JOURNAL_WHEN_UNDATED_ASC,
      journalWhenSortDesc: JOURNAL_WHEN_UNDATED_DESC,
    };
  }

  return {
    journalWhenSortAsc: minPacked,
    journalWhenSortDesc: minPacked,
  };
}
