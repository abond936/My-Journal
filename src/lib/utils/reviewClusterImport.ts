/** Append suggested review clusters for newly imported media (Organize / overlay path). */
export const MEDIA_BANK_IMPORT_PATH_LABEL = 'Media bank import';

export async function generateReviewClustersForImport(
  mediaIds: string[]
): Promise<{ created: number }> {
  if (mediaIds.length === 0) return { created: 0 };
  const response = await fetch('/api/admin/media/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lens: 'suggested', mediaIds }),
    credentials: 'same-origin',
  });
  const payload = (await response.json().catch(() => ({}))) as { created?: number; message?: string };
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  return { created: payload.created ?? 0 };
}
