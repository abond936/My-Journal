/**
 * Validates `returnTo` from query string for "Back to Content" from card edit.
 * Only same-app reader paths under `/view` are allowed.
 */
export function getSafeReaderReturnTo(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length === 0 || t.length > 512) return null;
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  if (t.includes('://')) return null;
  if (!t.startsWith('/view')) return null;
  if (t.includes('..')) return null;
  return t;
}
