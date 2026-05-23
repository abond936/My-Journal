/**
 * Pure utility functions for card-media reconciliation.
 * No Firebase dependency - safe for unit testing.
 */

/** Normalize path for comparison: use forward slashes, no leading/trailing slashes */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** Media sourcePath matches card's importedFromFolder (same folder or subfolder) */
export function mediaBelongsToCard(mediaSourcePath: string, cardImportedFrom: string): boolean {
  const m = normalizePath(mediaSourcePath);
  const c = normalizePath(cardImportedFrom);
  return m === c || m.startsWith(c + '/');
}

export function extractMediaFromContent(html: string | null | undefined): string[] {
  if (!html || typeof html !== 'string') return [];
  const ids = new Set<string>();
  const regex = /<figure[^>]*data-media-id=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) ids.add(match[1]);
  return Array.from(ids);
}

export type CardMediaReferenceField =
  | 'coverImageId'
  | 'galleryMedia'
  | 'contentMedia'
  | 'contentHtml';

export type CardMediaReference = {
  mediaId: string;
  field: CardMediaReferenceField;
};

export function collectCardMediaReferences(card: {
  coverImageId?: string | null;
  galleryMedia?: Array<{ mediaId?: string | null }>;
  contentMedia?: string[];
  content?: string | null;
}): CardMediaReference[] {
  const refs: CardMediaReference[] = [];
  const add = (mediaId: string | null | undefined, field: CardMediaReferenceField) => {
    if (typeof mediaId === 'string' && mediaId.trim()) {
      refs.push({ mediaId, field });
    }
  };

  add(card.coverImageId, 'coverImageId');
  for (const item of card.galleryMedia ?? []) {
    add(item?.mediaId, 'galleryMedia');
  }
  for (const mediaId of card.contentMedia ?? []) {
    add(mediaId, 'contentMedia');
  }
  for (const mediaId of extractMediaFromContent(card.content)) {
    add(mediaId, 'contentHtml');
  }

  return refs;
}
