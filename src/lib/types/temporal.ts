import { z } from 'zod';

export const temporalPrecisionSchema = z.enum([
  'decade',
  'year',
  'month',
  'day',
  'hour',
  'minute',
]);

const knownTemporalValueSchema = z
  .object({
    status: z.literal('known'),
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    precision: temporalPrecisionSchema,
    approximate: z.boolean().default(false),
    source: z.enum(['manual', 'embedded', 'migrated']).default('manual'),
  })
  .superRefine((value, ctx) => {
    const required: Record<z.infer<typeof temporalPrecisionSchema>, Array<keyof typeof value>> = {
      decade: [],
      year: [],
      month: ['month'],
      day: ['month', 'day'],
      hour: ['month', 'day', 'hour'],
      minute: ['month', 'day', 'hour', 'minute'],
    };
    for (const field of required[value.precision]) {
      if (value[field] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required for ${value.precision} precision.`,
        });
      }
    }
    if (value.precision === 'decade' && value.year % 10 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['year'],
        message: 'A decade must begin with a year ending in zero.',
      });
    }
    if (value.month !== undefined && value.day !== undefined) {
      const maxDay = new Date(Date.UTC(value.year, value.month, 0)).getUTCDate();
      if (value.day > maxDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['day'],
          message: 'Day is not valid for the selected month and year.',
        });
      }
    }
  });

const resolvedTemporalValueSchema = z.object({
  status: z.enum(['unknown', 'not_applicable']),
  source: z.enum(['manual', 'embedded', 'migrated']).default('manual'),
});

export const temporalValueSchema: z.ZodType<TemporalValue> = z.union([
  knownTemporalValueSchema,
  resolvedTemporalValueSchema,
]) as z.ZodType<TemporalValue>;

export type TemporalPrecision =
  | 'decade'
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute';

export type KnownTemporalValue = {
  status: 'known';
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  precision: TemporalPrecision;
  approximate: boolean;
  source: 'manual' | 'embedded' | 'migrated';
};

export type TemporalValue =
  | KnownTemporalValue
  | {
      status: 'unknown';
      source: 'manual' | 'embedded' | 'migrated';
    }
  | {
      status: 'not_applicable';
      source: 'manual' | 'embedded' | 'migrated';
    };

export type TemporalYearRangeFilter = {
  status: 'year_range';
  fromYear: number;
  toYear: number;
};

export type TemporalFilter = TemporalValue | TemporalYearRangeFilter;
