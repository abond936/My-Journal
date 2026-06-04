import { getDisplayUrl, getStudioDisplayUrl } from '@/lib/utils/photoUtils';

describe('photoUtils', () => {
  it('prefers the studio rendition for Studio/admin surfaces when present', () => {
    expect(
      getStudioDisplayUrl({
        storageUrl: 'https://example.com/original.webp',
        renditions: {
          studio: {
            storageUrl: 'https://example.com/studio.webp',
          },
        },
      })
    ).toBe('https://example.com/studio.webp');
  });

  it('falls back to the original display URL when the studio rendition is missing', () => {
    expect(
      getStudioDisplayUrl({
        storageUrl: 'https://example.com/original.webp',
      })
    ).toBe('https://example.com/original.webp');
  });

  it('keeps the default display URL on the canonical original path', () => {
    expect(
      getDisplayUrl({
        storageUrl: 'https://example.com/original.webp',
        renditions: {
          studio: {
            storageUrl: 'https://example.com/studio.webp',
          },
        },
      })
    ).toBe('https://example.com/original.webp');
  });
});
