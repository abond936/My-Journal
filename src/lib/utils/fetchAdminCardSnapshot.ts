import type { Card } from '@/lib/types/card';

/**
 * Loads the latest card from GET `/api/cards/[id]` (admin session).
 * Call immediately before PATCHing `childrenIds` so the client never builds the next list from a
 * stale or partial catalog row (which can omit `childrenIds` and wipe existing children in Firestore).
 */
export async function fetchAdminCardSnapshot(cardId: string): Promise<Card> {
  const res = await fetch(`/api/cards/${cardId}`);
  const data = (await res.json().catch(() => ({}))) as Card & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load card');
  }
  return data;
}
