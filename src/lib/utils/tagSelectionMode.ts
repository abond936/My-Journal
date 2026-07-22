export type TagSelectionMode = 'any' | 'all';

export function readTagSelectionMode(raw: string | null | undefined): TagSelectionMode {
  return raw === 'all' ? 'all' : 'any';
}

export function appendTagSelectionModeParam(params: URLSearchParams, mode: TagSelectionMode): void {
  if (mode === 'all') params.set('tagOperator', 'all');
}

export function matchesSelectedTags(
  candidate: Iterable<string> | undefined,
  required: string[] | undefined,
  mode: TagSelectionMode
): boolean {
  if (!required?.length) return true;
  if (!candidate) return false;
  const values = candidate instanceof Set ? candidate : new Set(candidate);
  return mode === 'all'
    ? required.every((id) => values.has(id))
    : required.some((id) => values.has(id));
}
