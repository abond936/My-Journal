import {
  appendTemporalFilterParams,
  formatTemporalValue,
  formatTemporalValueLong,
  matchesTemporalValueFilter,
  parseTemporalFilterParams,
} from '@/lib/utils/temporalValue';
import type { TemporalValue } from '@/lib/types/temporal';

const julyFourth: TemporalValue = {
  status: 'known',
  year: 1965,
  month: 7,
  day: 4,
  precision: 'day',
  approximate: false,
  source: 'manual',
};

describe('temporal value pilot', () => {
  it('formats partial and resolved values without inventing precision', () => {
    expect(formatTemporalValue({ ...julyFourth, month: undefined, day: undefined, precision: 'year' }))
      .toBe('1965');
    expect(formatTemporalValue(julyFourth)).toBe('1965-07-04');
    expect(formatTemporalValueLong(julyFourth)).toBe('July 4, 1965');
    expect(formatTemporalValue({ status: 'unknown', source: 'manual' })).toBe('Unknown');
    expect(formatTemporalValue(null)).toBe('Unreviewed');
  });

  it('matches broader partial filters against more precise values', () => {
    expect(matchesTemporalValueFilter(julyFourth, {
      ...julyFourth,
      year: 1960,
      month: undefined,
      day: undefined,
      precision: 'decade',
    })).toBe(true);
    expect(matchesTemporalValueFilter(julyFourth, {
      ...julyFourth,
      month: undefined,
      day: undefined,
      precision: 'year',
    })).toBe(true);
    expect(matchesTemporalValueFilter(julyFourth, {
      ...julyFourth,
      year: 1964,
      month: undefined,
      day: undefined,
      precision: 'year',
    })).toBe(false);
    expect(matchesTemporalValueFilter(undefined, null)).toBe(true);
    expect(matchesTemporalValueFilter(julyFourth, null)).toBe(false);
  });

  it('round-trips a partial filter through query parameters', () => {
    const params = new URLSearchParams();
    appendTemporalFilterParams(params, julyFourth);
    expect(parseTemporalFilterParams(params)).toEqual(julyFourth);
  });

  it('matches and round-trips an inclusive year range', () => {
    const range = { status: 'year_range' as const, fromYear: 1960, toYear: 1965 };
    expect(matchesTemporalValueFilter(julyFourth, range)).toBe(true);
    expect(matchesTemporalValueFilter({ ...julyFourth, year: 1966 }, range)).toBe(false);
    expect(formatTemporalValue(range)).toBe('1960–1965');

    const params = new URLSearchParams();
    appendTemporalFilterParams(params, range);
    expect(parseTemporalFilterParams(params)).toEqual(range);
  });

  it('rejects malformed and impossible filter dates', () => {
    expect(parseTemporalFilterParams(new URLSearchParams(
      'temporalStatus=known&temporalYear=1965&temporalMonth=13&temporalPrecision=month'
    ))).toBeUndefined();
    expect(parseTemporalFilterParams(new URLSearchParams(
      'temporalStatus=known&temporalYear=1965&temporalMonth=2&temporalDay=30&temporalPrecision=day'
    ))).toBeUndefined();
    expect(parseTemporalFilterParams(new URLSearchParams(
      'temporalStatus=known&temporalYear=1965&temporalPrecision=decade'
    ))).toBeUndefined();
    expect(parseTemporalFilterParams(new URLSearchParams(
      'temporalStatus=year_range&temporalFromYear=1970&temporalToYear=1960'
    ))).toBeUndefined();
  });
});
