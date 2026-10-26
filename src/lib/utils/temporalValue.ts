import {
  temporalValueSchema,
  type TemporalFilter,
  type TemporalPrecision,
  type TemporalValue,
} from '@/lib/types/temporal';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function inferTemporalPrecision(parts: {
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
}): TemporalPrecision {
  if (parts.minute !== undefined) return 'minute';
  if (parts.hour !== undefined) return 'hour';
  if (parts.day !== undefined) return 'day';
  if (parts.month !== undefined) return 'month';
  return 'year';
}

export function formatTemporalValue(value: TemporalFilter | null | undefined): string {
  if (!value) return 'Unreviewed';
  if (value.status === 'year_range') return `${value.fromYear}–${value.toYear}`;
  if (value.status === 'unknown') return 'Unknown';
  if (value.status === 'not_applicable') return 'N/A';

  const prefix = value.approximate ? '~' : '';
  if (value.precision === 'decade') return `${prefix}${Math.floor(value.year / 10) * 10}s`;

  let label = String(value.year);
  if (value.month !== undefined) label += `-${String(value.month).padStart(2, '0')}`;
  if (value.day !== undefined) label += `-${String(value.day).padStart(2, '0')}`;
  if (value.hour !== undefined) {
    label += ` ${String(value.hour).padStart(2, '0')}:${String(value.minute ?? 0).padStart(2, '0')}`;
  }
  return `${prefix}${label}`;
}

export function formatTemporalValueLong(value: TemporalValue | null | undefined): string {
  if (!value) return 'Unreviewed';
  if (value.status === 'unknown') return 'Unknown';
  if (value.status === 'not_applicable') return 'Not applicable';

  const prefix = value.approximate ? 'circa ' : '';
  if (value.precision === 'decade') return `${prefix}${Math.floor(value.year / 10) * 10}s`;

  let label = String(value.year);
  if (value.month !== undefined) label = `${MONTHS[value.month - 1]} ${value.year}`;
  if (value.day !== undefined && value.month !== undefined) {
    label = `${MONTHS[value.month - 1]} ${value.day}, ${value.year}`;
  }
  if (value.hour !== undefined) {
    const minute = value.minute ?? 0;
    const suffix = value.hour >= 12 ? 'PM' : 'AM';
    const hour = value.hour % 12 || 12;
    label += `, ${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
  }
  return `${prefix}${label}`;
}

export function temporalValuesEqual(
  left: TemporalFilter | null | undefined,
  right: TemporalFilter | null | undefined
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * `undefined` means no temporal filter; `null` means records whose pilot date is blank.
 * A known partial value matches every record within that period.
 */
export function matchesTemporalValueFilter(
  candidate: TemporalValue | null | undefined,
  filter: TemporalFilter | null | undefined
): boolean {
  if (filter === undefined) return true;
  if (filter === null) return candidate == null;
  if (filter.status === 'year_range') {
    return Boolean(
      candidate?.status === 'known' &&
      candidate.year >= filter.fromYear &&
      candidate.year <= filter.toYear
    );
  }
  if (!candidate || candidate.status !== filter.status) return false;
  if (filter.status !== 'known' || candidate.status !== 'known') return true;
  if (filter.precision === 'decade') {
    return Math.floor(candidate.year / 10) === Math.floor(filter.year / 10);
  }
  if (candidate.year !== filter.year) return false;
  if (filter.month !== undefined && candidate.month !== filter.month) return false;
  if (filter.day !== undefined && candidate.day !== filter.day) return false;
  if (filter.hour !== undefined && candidate.hour !== filter.hour) return false;
  if (filter.minute !== undefined && candidate.minute !== filter.minute) return false;
  return true;
}

export function appendTemporalFilterParams(
  params: URLSearchParams,
  filter: TemporalFilter | null | undefined
): void {
  if (filter === undefined) return;
  if (filter === null) {
    params.set('temporalStatus', 'empty');
    return;
  }
  params.set('temporalStatus', filter.status);
  if (filter.status === 'year_range') {
    params.set('temporalFromYear', String(filter.fromYear));
    params.set('temporalToYear', String(filter.toYear));
    return;
  }
  if (filter.status !== 'known') return;
  params.set('temporalYear', String(filter.year));
  params.set('temporalPrecision', filter.precision);
  if (filter.month !== undefined) params.set('temporalMonth', String(filter.month));
  if (filter.day !== undefined) params.set('temporalDay', String(filter.day));
  if (filter.hour !== undefined) params.set('temporalHour', String(filter.hour));
  if (filter.minute !== undefined) params.set('temporalMinute', String(filter.minute));
}

export function parseTemporalFilterParams(params: URLSearchParams): TemporalFilter | null | undefined {
  const status = params.get('temporalStatus');
  if (!status) return undefined;
  if (status === 'empty') return null;
  if (status === 'unknown' || status === 'not_applicable') {
    return { status, source: 'manual' };
  }
  if (status === 'year_range') {
    const fromYear = Number(params.get('temporalFromYear'));
    const toYear = Number(params.get('temporalToYear'));
    if (
      !Number.isInteger(fromYear) ||
      !Number.isInteger(toYear) ||
      fromYear < 1 ||
      toYear > 9999 ||
      fromYear > toYear
    ) {
      return undefined;
    }
    return { status: 'year_range', fromYear, toYear };
  }
  if (status !== 'known') return undefined;
  const year = Number(params.get('temporalYear'));
  if (!Number.isInteger(year) || year < 1 || year > 9999) return undefined;
  const numberPart = (name: string) => {
    const raw = params.get(name);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isInteger(value) ? value : undefined;
  };
  const month = numberPart('temporalMonth');
  const day = numberPart('temporalDay');
  const hour = numberPart('temporalHour');
  const minute = numberPart('temporalMinute');
  const precisionRaw = params.get('temporalPrecision');
  const precision: TemporalPrecision =
    precisionRaw === 'decade' ||
    precisionRaw === 'year' ||
    precisionRaw === 'month' ||
    precisionRaw === 'day' ||
    precisionRaw === 'hour' ||
    precisionRaw === 'minute'
      ? precisionRaw
      : inferTemporalPrecision({ month, day, hour, minute });
  const parsed = temporalValueSchema.safeParse({
    status: 'known',
    year,
    month,
    day,
    hour,
    minute,
    precision,
    approximate: false,
    source: 'manual',
  });
  return parsed.success ? parsed.data : undefined;
}
