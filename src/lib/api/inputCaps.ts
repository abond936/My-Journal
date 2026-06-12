/**
 * Shared API input bounds for list pagination and bulk mutation routes (post-review step 7a).
 * Legitimate clients stay well under these caps; values align with Studio page sizes and
 * service-layer bulk chunk sizes (for example card tag bulk at 400).
 */
export const API_INPUT_CAPS = {
  listPageDefault: 10,
  listPageMax: 100,
  cardChildrenPageMax: 250,
  cardByIdsMax: 400,
  bulkCardIdsMax: 400,
  bulkTagIdsMax: 100,
  bulkMediaIdsMax: 400,
  mediaReferenceSummaryMax: 100,
} as const;

export type InputCapError = {
  code: 'INPUT_LIMIT_INVALID' | 'INPUT_LIMIT_EXCEEDED' | 'INPUT_ARRAY_INVALID' | 'INPUT_ARRAY_EXCEEDED';
  message: string;
};

export function isInputCapFailure<T extends { ok: boolean }>(
  result: T
): result is Extract<T, { ok: false }> {
  return result.ok === false;
}

export function parseListPageLimit(
  raw: string | null | undefined,
  opts?: { defaultLimit?: number; max?: number }
): { ok: true; value: number } | { ok: false; error: InputCapError } {
  const defaultLimit = opts?.defaultLimit ?? API_INPUT_CAPS.listPageDefault;
  const max = opts?.max ?? API_INPUT_CAPS.listPageMax;

  if (raw == null || raw.trim() === '') {
    return { ok: true as const, value: defaultLimit };
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_LIMIT_INVALID',
        message: 'limit must be a positive integer.',
      },
    };
  }

  if (parsed > max) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_LIMIT_EXCEEDED',
        message: `limit must be at most ${max}.`,
      },
    };
  }

  return { ok: true as const, value: parsed };
}

export function validateStringIdArray(
  value: unknown,
  opts: {
    field: string;
    max: number;
    requireNonEmpty?: boolean;
  }
): { ok: true; ids: string[] } | { ok: false; error: InputCapError } {
  const { field, max, requireNonEmpty = false } = opts;

  if (!Array.isArray(value)) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_INVALID',
        message: `${field} must be an array.`,
      },
    };
  }

  if (requireNonEmpty && value.length === 0) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_INVALID',
        message: `${field} must be a non-empty array.`,
      },
    };
  }

  if (value.length > max) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_EXCEEDED',
        message: `${field} must contain at most ${max} items.`,
      },
    };
  }

  const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (requireNonEmpty && ids.length === 0) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_INVALID',
        message: `${field} must contain at least one valid id.`,
      },
    };
  }

  return { ok: true as const, ids };
}

export function validateRepeatedIdQueryParams(
  ids: string[],
  opts: { max: number; emptyCode?: string; emptyMessage?: string }
): { ok: true; ids: string[] } | { ok: false; error: InputCapError } {
  if (ids.length === 0) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_INVALID',
        message: opts.emptyMessage ?? 'Missing id query parameters.',
      },
    };
  }

  if (ids.length > opts.max) {
    return {
      ok: false as const,
      error: {
        code: 'INPUT_ARRAY_EXCEEDED',
        message: `Request at most ${opts.max} ids at a time.`,
      },
    };
  }

  return { ok: true as const, ids };
}
