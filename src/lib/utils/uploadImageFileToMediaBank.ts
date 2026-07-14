import type { Media } from '@/lib/types/photo';

/** Upload a browser file (paste/drop) into the media bank (`source: paste`). */
export async function uploadImageFileToMediaBank(file: File): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/images/browser', { method: 'POST', body: formData });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || 'Upload failed');
  }
  const data = (await response.json()) as { media?: Media } & Media;
  const media = data.media ?? data;
  if (!media?.docId) {
    throw new Error('Invalid upload response');
  }
  return media;
}
