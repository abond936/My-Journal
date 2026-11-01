export function isMarketingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/login' || pathname === '/invite') return true;
  if (pathname === '/my-stories' || pathname.startsWith('/my-stories/')) return true;
  return false;
}

export function buildLoginRedirectPath(callbackUrl: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Only same-origin application paths may survive authentication. */
export function safeInternalCallbackPath(
  raw: string | null | undefined,
  fallback = '/view'
): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export function resolveAuthenticatedEntryPath(
  callbackUrl: string | null | undefined,
  role: string | null | undefined
): string {
  return safeInternalCallbackPath(callbackUrl, role === 'admin' ? '/admin' : '/view');
}
