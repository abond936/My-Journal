import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

/**
 * Pane-safe card shape for tree/cards workspace surfaces.
 * `displayThumbnail` may be used for preview tiles when a card has no true cover.
 */
export type StudioCatalogCard = Card & {
  displayThumbnail?: Media | null;
  displayThumbnailSource?: 'cover' | 'gallery' | null;
};

/** Immediate shell handoff shape for Compose; may be incomplete. */
export type StudioSelectedPreview = StudioCatalogCard & {
  children?: Card[];
};

/** Authoritative selected-card edit context used by Compose after hydration. */
export type StudioSelectedDetail = Card & {
  children?: Card[];
};

/** Back-compat alias while Studio migrates to explicit preview/detail layers. */
export type StudioCardContext = StudioSelectedDetail;

export type StudioSelectedLoadState = 'idle' | 'loading' | 'ready' | 'degraded' | 'error';

export type StudioActiveCardViewModel = {
  status: 'empty' | 'preview' | 'hydrated' | 'degraded' | 'error';
  card: StudioSelectedPreview | StudioSelectedDetail | null;
  preview: StudioSelectedPreview | null;
  detail: StudioSelectedDetail | null;
  error: string | null;
};
