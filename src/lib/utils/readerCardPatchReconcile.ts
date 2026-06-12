import { mutate as globalMutate, type Key } from 'swr';
import type { Card, CardUpdate } from '@/lib/types/card';

export function reconcileReaderCardListCaches(savedCard: Card): void {
  void globalMutate(
    (key: Key) => typeof key === 'string' && key.startsWith('/api/cards?'),
    (current) => {
      if (!current) return current;

      const patchItems = (items: unknown) => {
        if (!Array.isArray(items)) return items;
        return items.map((item) => {
          if (!item || typeof item !== 'object') return item;
          return (item as Card).docId === savedCard.docId ? savedCard : item;
        });
      };

      if (Array.isArray(current)) {
        return current.map((page) => {
          if (!page || typeof page !== 'object' || !('items' in page)) return page;
          return {
            ...page,
            items: patchItems((page as { items?: unknown }).items),
          };
        });
      }

      if (typeof current === 'object' && 'items' in current) {
        return {
          ...current,
          items: patchItems((current as { items?: unknown }).items),
        };
      }

      return current;
    },
    { revalidate: false }
  );
}

export async function patchReaderCard(
  cardId: string,
  updates: CardUpdate,
  opts?: { onFeedPatch?: (savedCard: Card) => void }
): Promise<Card> {
  const response = await fetch(`/api/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const savedData = (await response.json()) as Card & { error?: string };
  if (!response.ok) {
    throw new Error(savedData.error || 'Failed to save card.');
  }
  reconcileReaderCardListCaches(savedData);
  opts?.onFeedPatch?.(savedData);
  return savedData;
}

export type ReaderMetadataQuickEditDraft = {
  title: string;
  subtitle: string;
  excerpt: string;
};

export type ReaderMetadataQuickEditInitial = ReaderMetadataQuickEditDraft & {
  excerptAuto?: boolean;
};

export function buildReaderMetadataQuickEditPatch(
  draft: ReaderMetadataQuickEditDraft,
  initial: ReaderMetadataQuickEditInitial
): CardUpdate {
  const patch: CardUpdate = {};

  const nextTitle = draft.title.trim();
  const nextSubtitle = draft.subtitle.trim();
  const nextExcerpt = draft.excerpt.trim();

  if (nextTitle !== initial.title.trim()) {
    patch.title = nextTitle;
  }
  if (nextSubtitle !== (initial.subtitle ?? '').trim()) {
    patch.subtitle = nextSubtitle || null;
  }

  const initialExcerpt = (initial.excerpt ?? '').trim();
  if (nextExcerpt !== initialExcerpt) {
    patch.excerpt = nextExcerpt || null;
    patch.excerptAuto = false;
  }

  return patch;
}
