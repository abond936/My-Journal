/** Reader list surfaces that should default to cover-only card hydration. */
export function shouldUseCoverOnlyFeedHydration(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.startsWith('/view') || pathname?.startsWith('/search'));
}

export function appendCoverOnlyFeedHydration(
  params: URLSearchParams,
  pathname: string | null | undefined
): URLSearchParams {
  if (shouldUseCoverOnlyFeedHydration(pathname)) {
    params.set('hydration', 'cover-only');
  }
  return params;
}

export function withCoverOnlyFeedHydrationQuery(
  url: string,
  pathname: string | null | undefined
): string {
  const urlObj = new URL(url, 'http://localhost');
  appendCoverOnlyFeedHydration(urlObj.searchParams, pathname);
  return `${urlObj.pathname}${urlObj.search}`;
}
