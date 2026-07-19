export type ReaderRouteMode = 'guided' | 'freeform';

export function resolveReaderRouteMode(
  pathname: string | null | undefined,
  explicitMode: string | null | undefined,
  persistedMode: ReaderRouteMode
): ReaderRouteMode {
  if (pathname?.startsWith('/view/') && (explicitMode === 'guided' || explicitMode === 'freeform')) {
    return explicitMode;
  }
  return persistedMode;
}
