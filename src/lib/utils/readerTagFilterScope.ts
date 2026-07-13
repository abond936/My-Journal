export type ReaderTagFilterScope = 'all' | 'subject';

export function readStoredReaderTagFilterScope(raw: string | null | undefined): ReaderTagFilterScope {
  return raw === 'subject' ? 'subject' : 'all';
}

export function appendReaderTagScopeParam(
  params: URLSearchParams,
  scope: ReaderTagFilterScope
): void {
  if (scope === 'subject') {
    params.set('tagScope', 'subject');
  }
}
