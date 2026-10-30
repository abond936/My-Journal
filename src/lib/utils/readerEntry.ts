export type ReaderEntryMode = 'guided' | 'freeform';

export const READER_LAST_MODE_KEY = 'myjournal-reader-last-mode';

export function parseReaderEntryMode(value: string | null | undefined): ReaderEntryMode | null {
  return value === 'guided' || value === 'freeform' ? value : null;
}

export function buildReaderModePath(mode: ReaderEntryMode): string {
  return `/view?mode=${mode}`;
}

export function isReaderHomeRoute(
  pathname: string | null | undefined,
  explicitMode: string | null | undefined
): boolean {
  return pathname === '/view' && parseReaderEntryMode(explicitMode) === null;
}
