export type MediaIdentityClassificationRow = {
  docId: string;
  source?: string;
  sourcePath?: string;
  contentIdentity?: { digest?: string };
};

export type MediaIdentityClassification =
  | 'verified'
  | 'recoverable-local-original'
  | 'local-original-not-found'
  | 'source-original-not-retained';

export function classifyMediaIdentityEvidence(
  row: MediaIdentityClassificationRow,
  localOriginalAccessible: boolean
): MediaIdentityClassification {
  if (row.contentIdentity?.digest) return 'verified';
  if (row.source !== 'local') return 'source-original-not-retained';
  return localOriginalAccessible ? 'recoverable-local-original' : 'local-original-not-found';
}

