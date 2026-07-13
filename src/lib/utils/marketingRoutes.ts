export function isMarketingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/login') return true;
  if (pathname === '/my-stories' || pathname.startsWith('/my-stories/')) return true;
  return false;
}

export function buildLoginRedirectPath(callbackUrl: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
