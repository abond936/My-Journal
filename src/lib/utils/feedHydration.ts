/** Reader list surfaces that need covers plus complete ordered Gallery media. */
export function shouldUseReaderFeedHydration(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.startsWith('/view') || pathname?.startsWith('/search'));
}

export function appendReaderFeedHydration(
  params: URLSearchParams,
  pathname: string | null | undefined
): URLSearchParams {
  if (shouldUseReaderFeedHydration(pathname)) {
    params.set('hydration', 'reader-feed');
  }
  return params;
}

export function withReaderFeedHydrationQuery(
  url: string,
  pathname: string | null | undefined
): string {
  const urlObj = new URL(url, 'http://localhost');
  appendReaderFeedHydration(urlObj.searchParams, pathname);
  return `${urlObj.pathname}${urlObj.search}`;
}
