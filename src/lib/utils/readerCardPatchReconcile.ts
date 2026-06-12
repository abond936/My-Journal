import { mutate as globalMutate, type Key } from 'swr';
import type { Card, CardUpdate, HydratedGalleryMediaItem } from '@/lib/types/card';
import {
  applyGallerySlotCaptionEdit,
  dehydrateGalleryMediaForPatch,
  getEffectiveGalleryCaption,
} from '@/lib/utils/galleryObjectPosition';
import {
  buildReaderBodyQuickEditPatch,
} from '@/lib/utils/readerBodyQuickEdit';

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

export type ReaderQuickEditInitial = ReaderMetadataQuickEditInitial & {
  content?: string;
};

export type ReaderQuickEditDraft = ReaderMetadataQuickEditDraft & {
  body: string;
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

export function buildGalleryCaptionPatch(
  gallery: HydratedGalleryMediaItem[],
  mediaId: string,
  newCaption: string
): CardUpdate | null {
  const target = gallery.find((item) => item.mediaId === mediaId);
  if (!target) return null;

  const trimmed = newCaption.trim();
  const currentEffective = getEffectiveGalleryCaption(target, target.media).trim();
  if (trimmed === currentEffective) return null;

  const nextGallery = gallery.map((item) =>
    item.mediaId === mediaId ? applyGallerySlotCaptionEdit(item, trimmed) : item
  );

  return { galleryMedia: dehydrateGalleryMediaForPatch(nextGallery) };
}

export async function patchReaderGalleryCaption(
  cardId: string,
  gallery: HydratedGalleryMediaItem[],
  mediaId: string,
  newCaption: string
): Promise<Card | null> {
  const patch = buildGalleryCaptionPatch(gallery, mediaId, newCaption);
  if (!patch) return null;
  return patchReaderCard(cardId, patch);
}

export async function patchReaderQuickEdit(
  cardId: string,
  draft: ReaderQuickEditDraft,
  initial: ReaderQuickEditInitial
): Promise<Card | null> {
  const metadataPatch = buildReaderMetadataQuickEditPatch(draft, initial);
  const bodyPatch = buildReaderBodyQuickEditPatch(draft.body, initial.content ?? '');

  if (Object.keys(metadataPatch).length === 0 && !bodyPatch) {
    return null;
  }

  let saved: Card | undefined;
  if (Object.keys(metadataPatch).length > 0) {
    saved = await patchReaderCard(cardId, metadataPatch);
  }
  if (bodyPatch) {
    saved = await patchReaderCard(cardId, bodyPatch);
  }
  return saved ?? null;
}
