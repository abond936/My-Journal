import { fetchAuthoritativeMediaReferenceSummaries } from '@/lib/utils/mediaReferenceSummaryClient';

describe('fetchAuthoritativeMediaReferenceSummaries', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('deduplicates ids and returns authoritative summaries', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summaries: { m1: ['c1'], m2: [] } }),
    } as Response);

    await expect(fetchAuthoritativeMediaReferenceSummaries(['m1', 'm1', 'm2'])).resolves.toEqual({
      m1: ['c1'],
      m2: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('chunks selections at the route cap', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `m${index}`);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summaries: Object.fromEntries(ids.slice(0, 100).map(id => [id, []])) }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summaries: { m100: ['c1'] } }),
      } as Response);

    const result = await fetchAuthoritativeMediaReferenceSummaries(ids);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.m100).toEqual(['c1']);
  });

  it('blocks callers when the lookup fails or is incomplete', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response);
    await expect(fetchAuthoritativeMediaReferenceSummaries(['m1'])).rejects.toThrow(
      'Could not verify linked-card consequences.'
    );

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ summaries: {} }) } as Response);
    await expect(fetchAuthoritativeMediaReferenceSummaries(['m1'])).rejects.toThrow(
      'Could not verify linked-card consequences.'
    );
  });
});
