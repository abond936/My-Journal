import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { Media } from '@/lib/types/photo';
import useMediaReferenceSummaries from '@/components/admin/studio/media/useMediaReferenceSummaries';

function Harness({ mediaItems }: { mediaItems: Media[] }) {
  useMediaReferenceSummaries(mediaItems);
  return null;
}

describe('useMediaReferenceSummaries', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('does not refetch summaries when the same media ids rerender with a new array identity', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        summaries: {
          'media-1': ['card-1'],
          'media-2': ['card-2'],
        },
      }),
    } as Response);

    const initialItems = [
      { docId: 'media-1', filename: 'one.jpg' },
      { docId: 'media-2', filename: 'two.jpg' },
    ] as Media[];

    const { rerender } = render(<Harness mediaItems={initialItems} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(
      <Harness
        mediaItems={[
          { docId: 'media-1', filename: 'one.jpg' } as Media,
          { docId: 'media-2', filename: 'two.jpg' } as Media,
        ]}
      />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
