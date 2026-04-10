import type { Card } from '@/lib/types/card';

/** Allowed `displayMode` values per card `type` (product rule). */
const ALLOWED: Record<Card['type'], readonly Card['displayMode'][]> = {
  story: ['navigate'],
  gallery: ['navigate', 'inline'],
  qa: ['navigate', 'inline'],
  quote: ['static'],
  callout: ['static'],
};

export function getAllowedDisplayModes(type: Card['type']): Card['displayMode'][] {
  return [...ALLOWED[type]];
}

/** Coerce `displayMode` to the first allowed value for `type` when invalid or missing. */
export function normalizeDisplayModeForType(
  type: Card['type'],
  displayMode: Card['displayMode'] | undefined | null
): Card['displayMode'] {
  const allowed = ALLOWED[type];
  const dm = (displayMode ?? allowed[0]) as Card['displayMode'];
  return (allowed as readonly Card['displayMode'][]).includes(dm) ? dm : allowed[0];
}
