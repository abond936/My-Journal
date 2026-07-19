import type { Media, MediaReadiness, MediaReadinessStage, MediaReadinessStageName } from '@/lib/types/photo';

export const MEDIA_READINESS_STAGE_NAMES: MediaReadinessStageName[] = [
  'source',
  'metadata',
  'studioRendition',
  'readerRendition',
  'searchIndex',
];

export function readyStage(attemptedAt: number): MediaReadinessStage {
  return { status: 'ready', attemptedAt };
}

export function pendingStage(attemptedAt: number): MediaReadinessStage {
  return { status: 'pending', attemptedAt };
}

export function failedStage(
  attemptedAt: number,
  code: string,
  retryable: boolean,
  detail?: string
): MediaReadinessStage {
  return { status: 'failed', attemptedAt, code, retryable, ...(detail ? { detail } : {}) };
}

export function deriveMediaReadinessOverall(
  stages: MediaReadiness['stages']
): MediaReadiness['overall'] {
  const values = MEDIA_READINESS_STAGE_NAMES.map(name => stages[name]);
  if (values.some(stage => stage.status === 'failed')) return 'failed';
  if (values.some(stage => stage.status === 'pending')) return 'pending';
  return 'ready';
}

export function buildMediaReadiness(
  stages: MediaReadiness['stages'],
  updatedAt: number
): MediaReadiness {
  return { overall: deriveMediaReadinessOverall(stages), stages, updatedAt };
}

export function getRetryableMediaStages(media: Media): MediaReadinessStageName[] {
  if (!media.readiness) return [];
  return MEDIA_READINESS_STAGE_NAMES.filter(name => {
    const stage = media.readiness?.stages[name];
    return stage?.status === 'failed' && stage.retryable === true;
  });
}
