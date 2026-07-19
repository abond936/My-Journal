import type { Media, MediaReadiness } from '@/lib/types/photo';
import {
  buildMediaReadiness,
  deriveMediaReadinessOverall,
  failedStage,
  getRetryableMediaStages,
  pendingStage,
  readyStage,
} from '@/lib/utils/mediaReadiness';

const readyStages = (at = 1): MediaReadiness['stages'] => ({
  source: readyStage(at),
  metadata: readyStage(at),
  studioRendition: readyStage(at),
  readerRendition: readyStage(at),
  searchIndex: readyStage(at),
});

describe('mediaReadiness', () => {
  it('derives ready only when every stage is ready', () => {
    expect(deriveMediaReadinessOverall(readyStages())).toBe('ready');
  });

  it('gives failed precedence over pending', () => {
    const stages = readyStages();
    stages.searchIndex = pendingStage(2);
    stages.readerRendition = failedStage(3, 'READER_RENDITION_FAILED', true);
    expect(deriveMediaReadinessOverall(stages)).toBe('failed');
  });

  it('returns only failed stages explicitly marked retryable', () => {
    const stages = readyStages();
    stages.studioRendition = failedStage(2, 'STUDIO_RENDITION_FAILED', true);
    stages.metadata = failedStage(2, 'METADATA_FAILED', false);
    const media = {
      docId: 'media-1',
      readiness: buildMediaReadiness(stages, 2),
    } as Media;
    expect(getRetryableMediaStages(media)).toEqual(['studioRendition']);
    expect(getRetryableMediaStages({ docId: 'legacy' } as Media)).toEqual([]);
  });
});
