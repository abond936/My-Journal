const MEDIA_REFERENCE_SUMMARY_CHUNK_SIZE = 100;

export async function fetchAuthoritativeMediaReferenceSummaries(
  mediaIds: string[]
): Promise<Record<string, string[]>> {
  const uniqueIds = Array.from(new Set(mediaIds.filter(Boolean)));
  const summaries: Record<string, string[]> = {};
  for (let start = 0; start < uniqueIds.length; start += MEDIA_REFERENCE_SUMMARY_CHUNK_SIZE) {
    const ids = uniqueIds.slice(start, start + MEDIA_REFERENCE_SUMMARY_CHUNK_SIZE);
    const params = new URLSearchParams();
    ids.forEach(id => params.append('id', id));
    const response = await fetch(`/api/media/reference-summary?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('Could not verify linked-card consequences.');
    const payload = (await response.json().catch(() => ({}))) as {
      summaries?: Record<string, string[]>;
    };
    if (!payload.summaries || ids.some(id => !Array.isArray(payload.summaries?.[id]))) {
      throw new Error('Could not verify linked-card consequences.');
    }
    Object.assign(summaries, payload.summaries);
  }
  return summaries;
}
