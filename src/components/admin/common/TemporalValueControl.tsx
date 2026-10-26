'use client';

import React from 'react';
import type { TemporalFilter, TemporalValue } from '@/lib/types/temporal';
import styles from './TemporalValueControl.module.css';

type CommonProps = {
  mixed?: boolean;
  disabled?: boolean;
  idPrefix: string;
  allowAny?: boolean;
  showApproximate?: boolean;
  showResolvedStates?: boolean;
  directEntryOnly?: boolean;
  unreviewedLabel?: string;
};

type Props = CommonProps & (
  | {
      allowYearRange: true;
      value: TemporalFilter | null | undefined;
      onChange: (value: TemporalFilter | null | undefined) => void;
    }
  | {
      allowYearRange?: false;
      value: TemporalValue | null | undefined;
      onChange: (value: TemporalValue | null | undefined) => void;
    }
);

type ControlState =
  | 'mixed'
  | 'any'
  | 'unreviewed'
  | 'known'
  | 'year_range'
  | 'unknown'
  | 'not_applicable';

type DateFields = {
  decade: string;
  year: string;
  month: string;
  day: string;
  fromYear: string;
  toYear: string;
};

const EMPTY_FIELDS: DateFields = {
  decade: '',
  year: '',
  month: '',
  day: '',
  fromYear: '',
  toYear: '',
};

function fieldsFromValue(value: TemporalFilter | null | undefined): DateFields {
  if (value?.status === 'year_range') {
    return {
      ...EMPTY_FIELDS,
      fromYear: String(value.fromYear),
      toYear: String(value.toYear),
    };
  }
  if (value?.status !== 'known') return EMPTY_FIELDS;
  if (value.precision === 'decade') {
    return { ...EMPTY_FIELDS, decade: String(value.year) };
  }
  return {
    decade: '',
    year: String(value.year),
    month: value.month === undefined ? '' : String(value.month),
    day: value.day === undefined ? '' : String(value.day),
    fromYear: '',
    toYear: '',
  };
}

function parseInteger(text: string): number | undefined {
  const normalized = text.trim().replace(/s$/i, '');
  if (!/^\d+$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function StateChoice({
  idPrefix,
  state,
  value,
  label,
  disabled,
  onSelect,
}: {
  idPrefix: string;
  state: ControlState;
  value: ControlState;
  label: string;
  disabled?: boolean;
  onSelect: (value: ControlState) => void;
}) {
  return (
    <label className={styles.stateChoice}>
      <input
        type="radio"
        name={`${idPrefix}-date-state`}
        value={value}
        checked={state === value}
        disabled={disabled}
        onChange={() => onSelect(value)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function TemporalValueControl({
  value,
  onChange,
  mixed = false,
  disabled = false,
  idPrefix,
  allowAny = false,
  showApproximate = true,
  showResolvedStates = true,
  directEntryOnly = false,
  allowYearRange = false,
  unreviewedLabel = 'Unreviewed',
}: Props) {
  const [pendingKnown, setPendingKnown] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState(false);
  const [fields, setFields] = React.useState<DateFields>(() => fieldsFromValue(value));
  const known = value?.status === 'known' ? value : null;
  const emitChange = onChange as (next: TemporalFilter | null | undefined) => void;
  const state: ControlState =
    pendingRange
      ? 'year_range'
      : pendingKnown
      ? 'known'
      : mixed && value === undefined
        ? 'mixed'
        : value === undefined && allowAny
          ? 'any'
          : value?.status ?? 'unreviewed';

  React.useEffect(() => {
    if (value?.status === 'known' || value?.status === 'year_range') {
      setFields(fieldsFromValue(value));
      setPendingKnown(false);
      setPendingRange(false);
    } else if (!pendingKnown && !pendingRange) {
      setFields(EMPTY_FIELDS);
    }
  }, [pendingKnown, pendingRange, value]);

  const commitFields = (next: DateFields) => {
    setFields(next);
    const decade = parseInteger(next.decade);
    if (next.decade && decade !== undefined && decade >= 1 && decade <= 9999) {
      const normalizedDecade = Math.floor(decade / 10) * 10;
      emitChange({
        status: 'known',
        year: normalizedDecade,
        precision: 'decade',
        approximate: known?.approximate ?? false,
        source: 'manual',
      });
      setPendingKnown(false);
      return;
    }

    const year = parseInteger(next.year);
    if (year === undefined || year < 1 || year > 9999) {
      emitChange(null);
      setPendingKnown(true);
      return;
    }
    const month = parseInteger(next.month);
    const day = parseInteger(next.day);
    const validMonth = month !== undefined && month >= 1 && month <= 12;
    const maxDay = validMonth
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 0;
    const validDay = validMonth && day !== undefined && day >= 1 && day <= maxDay;
    emitChange({
      status: 'known',
      year,
      ...(validMonth ? { month } : {}),
      ...(validDay ? { day } : {}),
      precision:
        validDay
          ? 'day'
          : validMonth
            ? 'month'
            : 'year',
      approximate: known?.approximate ?? false,
      source: 'manual',
    });
    setPendingKnown(false);
  };

  const setState = (next: ControlState) => {
    setPendingKnown(false);
    setPendingRange(false);
    if (next === 'any') emitChange(undefined);
    else if (next === 'unreviewed') emitChange(null);
    else if (next === 'unknown' || next === 'not_applicable') {
      emitChange({ status: next, source: 'manual' });
    } else if (next === 'known') {
      setFields(fieldsFromValue(value));
      setPendingKnown(true);
    } else if (next === 'year_range') {
      setFields(fieldsFromValue(value));
      setPendingRange(true);
    }
  };

  const commitYearRange = (next: DateFields) => {
    setFields(next);
    const fromYear = parseInteger(next.fromYear);
    const toYear = parseInteger(next.toYear);
    if (
      fromYear === undefined ||
      toYear === undefined ||
      fromYear < 1 ||
      toYear > 9999 ||
      fromYear > toYear
    ) {
      setPendingRange(true);
      return;
    }
    emitChange({ status: 'year_range', fromYear, toYear });
    setPendingRange(false);
  };

  return (
    <fieldset
      className={styles.root}
      data-testid={`${idPrefix}-temporal-control`}
      disabled={disabled}
    >
      <legend>Date</legend>
      <div className={styles.stateChoices} aria-label="Date state">
        {!directEntryOnly && mixed ? (
          <StateChoice
            idPrefix={idPrefix}
            state={state}
            value="mixed"
            label="Mixed"
            disabled
            onSelect={setState}
          />
        ) : null}
        {!directEntryOnly && allowAny ? (
          <StateChoice
            idPrefix={idPrefix}
            state={state}
            value="any"
            label="Any"
            onSelect={setState}
          />
        ) : null}
        {!directEntryOnly ? (
          <>
            <StateChoice
              idPrefix={idPrefix}
              state={state}
              value="unreviewed"
              label={unreviewedLabel}
              onSelect={setState}
            />
            <StateChoice
              idPrefix={idPrefix}
              state={state}
              value="known"
              label="Known"
              onSelect={setState}
            />
            {allowYearRange ? (
              <StateChoice
                idPrefix={idPrefix}
                state={state}
                value="year_range"
                label="Year range"
                onSelect={setState}
              />
            ) : null}
          </>
        ) : null}

        {directEntryOnly || state === 'known' ? (
          <div className={styles.knownEditor}>
            <label className={styles.directField}>
              <span>Decade</span>
              <input
                aria-label="Decade"
                type="text"
                 inputMode="numeric"
                 value={fields.decade}
                 onChange={(event) => setFields({
                   decade: event.target.value,
                   year: '',
                   month: '',
                   day: '',
                   fromYear: '',
                   toYear: '',
                 })}
                 onBlur={() => commitFields(fields)}
               />
            </label>
            <label className={styles.directField}>
              <span>Year</span>
              <input
                aria-label="Year"
                type="text"
                 inputMode="numeric"
                 value={fields.year}
                 onChange={(event) => setFields({
                   ...fields,
                   decade: '',
                   year: event.target.value,
                   fromYear: '',
                   toYear: '',
                 })}
                 onBlur={() => commitFields(fields)}
              />
            </label>
            <label className={styles.directField}>
              <span>Month</span>
              <input
                aria-label="Month"
                type="text"
                inputMode="numeric"
                value={fields.month}
                disabled={!fields.year}
                 onChange={(event) => setFields({
                   ...fields,
                   month: event.target.value,
                   day: event.target.value ? fields.day : '',
                 })}
                 onBlur={() => commitFields(fields)}
              />
            </label>
            <label className={styles.directField}>
              <span>Day</span>
              <input
                aria-label="Day"
                type="text"
                inputMode="numeric"
                value={fields.day}
                disabled={!fields.year || !fields.month}
                 onChange={(event) => setFields({
                   ...fields,
                   day: event.target.value,
                 })}
                 onBlur={() => commitFields(fields)}
              />
            </label>
            {showApproximate ? (
              <label className={styles.compactChoice}>
                <input
                  type="checkbox"
                  checked={known?.approximate ?? false}
                  disabled={!known}
                  onChange={(event) => {
                    if (!known) return;
                    emitChange({ ...known, approximate: event.target.checked, source: 'manual' });
                  }}
                />
                <span>Approximate</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {!directEntryOnly && state === 'year_range' ? (
          <div className={styles.knownEditor}>
            <label className={styles.directField}>
              <span>From year</span>
              <input
                aria-label="From year"
                type="text"
                inputMode="numeric"
                value={fields.fromYear}
                onChange={(event) => setFields({
                  ...EMPTY_FIELDS,
                  fromYear: event.target.value,
                  toYear: fields.toYear,
                })}
                onBlur={() => commitYearRange(fields)}
              />
            </label>
            <label className={styles.directField}>
              <span>To year</span>
              <input
                aria-label="To year"
                type="text"
                inputMode="numeric"
                value={fields.toYear}
                onChange={(event) => setFields({
                  ...EMPTY_FIELDS,
                  fromYear: fields.fromYear,
                  toYear: event.target.value,
                })}
                onBlur={() => commitYearRange(fields)}
              />
            </label>
          </div>
        ) : null}

        {!directEntryOnly && showResolvedStates ? (
          <>
            <StateChoice
              idPrefix={idPrefix}
              state={state}
              value="unknown"
              label="Unknown"
              onSelect={setState}
            />
            <StateChoice
              idPrefix={idPrefix}
              state={state}
              value="not_applicable"
              label="Not applicable"
              onSelect={setState}
            />
          </>
        ) : null}
      </div>
    </fieldset>
  );
}
