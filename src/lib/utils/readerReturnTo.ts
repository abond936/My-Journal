/**
 * Validates `returnTo` from query string for "Back to Content" from card edit.
 * Only same-app Reader paths under `/view` or `/search` are allowed.
 */
export function getSafeReaderReturnTo(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length === 0 || t.length > 512) return null;
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  if (t.includes('://')) return null;
  const isViewPath = t === '/view' || t.startsWith('/view/') || t.startsWith('/view?');
  const isSearchPath = t === '/search' || t.startsWith('/search?');
  if (!isViewPath && !isSearchPath) return null;
  if (t.includes('..')) return null;
  return t;
}
