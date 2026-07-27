import type { Tag } from '@/lib/types/tag';
import type { KnownTemporalValue, TemporalValue } from '@/lib/types/temporal';

const MONTH_INDEX = new Map(
  [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ].map((name, index) => [name, index + 1])
);

export type WhenTagTemporalResult =
  | { status: 'empty'; tagIds: string[]; tagNames: string[] }
  | { status: 'ambiguous'; tagIds: string[]; tagNames: string[]; candidates: TemporalValue[] }
  | { status: 'convertible'; tagIds: string[]; tagNames: string[]; value: TemporalValue };

function validKnown(value: KnownTemporalValue): KnownTemporalValue | null {
  if (value.month !== undefined && (value.month < 1 || value.month > 12)) return null;
  if (value.day !== undefined) {
    if (value.month === undefined) return null;
    const maxDay = new Date(Date.UTC(value.year, value.month, 0)).getUTCDate();
    if (value.day < 1 || value.day > maxDay) return null;
  }
  return value;
}

function parseChain(names: string[]): TemporalValue | null {
  const normalized = names.map((name) => name.trim()).filter(Boolean);
  const leaf = normalized.at(-1)?.toLowerCase();
  if (!leaf) return null;
  if (['unknown', 'zunknown'].includes(leaf)) return { status: 'unknown', source: 'migrated' };
  if (['n/a', 'na', 'not applicable', 'zna'].includes(leaf)) {
    return { status: 'not_applicable', source: 'migrated' };
  }

  const packed = normalized.at(-1)?.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (packed) {
    return validKnown({
      status: 'known',
      year: Number(packed[1]),
      month: Number(packed[2]),
      day: Number(packed[3]),
      precision: 'day',
      approximate: false,
      source: 'migrated',
    });
  }

  let datedIndex = -1;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (/^(\d{4})s?$/i.test(normalized[index]!)) {
      datedIndex = index;
      break;
    }
  }
  if (datedIndex < 0) return null;
  const anchor = normalized[datedIndex]!;
  const decade = anchor.match(/^(\d{4})s$/i);
  const year = Number(decade?.[1] ?? anchor);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;

  const remaining = normalized.slice(datedIndex + 1);
  if (remaining.length === 0) {
    return {
      status: 'known',
      year,
      precision: decade ? 'decade' : 'year',
      approximate: false,
      source: 'migrated',
    };
  }
  if (decade) return null;

  const monthToken = remaining[0]!.toLowerCase();
  const numericMonth = /^\d{1,2}$/.test(monthToken) ? Number(monthToken) : undefined;
  const month = MONTH_INDEX.get(monthToken) ?? numericMonth;
  if (!month || month < 1 || month > 12) return null;
  if (remaining.length === 1) {
    return {
      status: 'known',
      year,
      month,
      precision: 'month',
      approximate: false,
      source: 'migrated',
    };
  }

  const day = /^\d{1,2}$/.test(remaining[1]!) ? Number(remaining[1]) : NaN;
  if (!Number.isInteger(day) || remaining.length > 2) return null;
  return validKnown({
    status: 'known',
    year,
    month,
    day,
    precision: 'day',
    approximate: false,
    source: 'migrated',
  });
}

function chainFor(tagId: string, tagMap: Map<string, Tag>): Tag[] {
  const chain: Tag[] = [];
  const seen = new Set<string>();
  let current = tagMap.get(tagId);
  while (current?.docId && !seen.has(current.docId)) {
    seen.add(current.docId);
    chain.unshift(current);
    current = current.parentId ? tagMap.get(current.parentId) : undefined;
  }
  return chain;
}

function knownRange(value: KnownTemporalValue): [number, number] {
  if (value.precision === 'decade') return [value.year, value.year + 9];
  return [value.year, value.year];
}

function compatible(left: TemporalValue, right: TemporalValue): boolean {
  if (left.status !== right.status) return false;
  if (left.status !== 'known' || right.status !== 'known') return true;
  const [leftStart, leftEnd] = knownRange(left);
  const [rightStart, rightEnd] = knownRange(right);
  if (leftEnd < rightStart || rightEnd < leftStart) return false;
  if (left.month !== undefined && right.month !== undefined && left.month !== right.month) return false;
  if (left.day !== undefined && right.day !== undefined && left.day !== right.day) return false;
  return true;
}

function precisionRank(value: TemporalValue): number {
  if (value.status !== 'known') return 0;
  return { decade: 1, year: 2, month: 3, day: 4, hour: 5, minute: 6 }[value.precision];
}

export function temporalFromWhenTagIds(
  whenTagIds: string[] | undefined,
  tagMap: Map<string, Tag>
): WhenTagTemporalResult {
  const tagIds = [...new Set((whenTagIds ?? []).filter(Boolean))];
  const tagNames = tagIds.map((id) => tagMap.get(id)?.name ?? `[missing:${id}]`);
  const candidates = tagIds
    .map((id) => parseChain(chainFor(id, tagMap).map((tag) => tag.name)))
    .filter((value): value is TemporalValue => value !== null);
  if (candidates.length === 0) return { status: 'empty', tagIds, tagNames };

  const unique = Array.from(new Map(candidates.map((value) => [JSON.stringify(value), value])).values());
  if (unique.some((candidate) => unique.some((other) => !compatible(candidate, other)))) {
    return { status: 'ambiguous', tagIds, tagNames, candidates: unique };
  }
  const value = [...unique].sort((a, b) => precisionRank(b) - precisionRank(a))[0]!;
  return { status: 'convertible', tagIds, tagNames, value };
}
