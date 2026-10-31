import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

export type ReaderMediaRendition = 'original' | 'reader' | 'studio';

export function buildReaderMediaUrl(
  mediaId: string,
  rendition: ReaderMediaRendition = 'reader'
): string {
  const base = `/api/reader/media/${encodeURIComponent(mediaId)}`;
  return rendition === 'reader' ? base : `${base}?rendition=${rendition}`;
}

export function protectMediaForReader(media: Media | null | undefined): Media | null | undefined {
  if (!media?.docId) return media;
  const mediaId = media.docId;
  // Reader payloads are deliberately display-only. In particular, do not send
  // Storage paths, source paths, archive tags, identity evidence, or reverse
  // Card references that belong to the author's private Media record.
  return {
    docId: mediaId,
    filename: media.filename,
    width: media.width,
    height: media.height,
    contentType: media.contentType,
    storageUrl: buildReaderMediaUrl(mediaId),
    ...(media.caption !== undefined ? { caption: media.caption } : {}),
    ...(media.objectPosition !== undefined ? { objectPosition: media.objectPosition } : {}),
    ...(media.renditions
      ? {
          renditions: {
            ...(media.renditions.studio
              ? {
                  studio: {
                    width: media.renditions.studio.width,
                    height: media.renditions.studio.height,
                    contentType: media.renditions.studio.contentType,
                    storageUrl: buildReaderMediaUrl(mediaId, 'studio'),
                  },
                }
              : {}),
            ...(media.renditions.reader
              ? {
                  reader: {
                    width: media.renditions.reader.width,
                    height: media.renditions.reader.height,
                    contentType: media.renditions.reader.contentType,
                    storageUrl: buildReaderMediaUrl(mediaId),
                  },
                }
              : {}),
          },
        }
      : {}),
  } as Media;
}

function rewriteAuthoredMediaHtml(html: string): string {
  let rewritten = html.replace(
    /<figure\b[^>]*data-media-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/figure>/gi,
    (figure, mediaId: string) => {
      const url = buildReaderMediaUrl(mediaId);
      return figure
        .replace(/(<img\b[^>]*\bsrc=)["'][^"']*["']/gi, `$1"${url}"`)
        .replace(/\s+srcset=["'][^"']*["']/gi, '');
    }
  );

  rewritten = rewritten.replace(
    /<img\b[^>]*data-media-id=["']([^"']+)["'][^>]*>/gi,
    (image, mediaId: string) => {
      const url = buildReaderMediaUrl(mediaId);
      const withoutSrcset = image.replace(/\s+srcset=["'][^"']*["']/gi, '');
      if (/\bsrc=["'][^"']*["']/i.test(withoutSrcset)) {
        return withoutSrcset.replace(/(\bsrc=)["'][^"']*["']/i, `$1"${url}"`);
      }
      return withoutSrcset.replace(/^<img/i, `<img src="${url}"`);
    }
  );

  // Fail closed for legacy HTML that contains a permanent Storage URL but no
  // stable Media id that can be authorized by the delivery endpoint.
  return rewritten
    .replace(
      /\s+(?:src|href)=["']https?:\/\/(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com)[^"']*["']/gi,
      ''
    )
    .replace(
      /\s+srcset=["'][^"']*(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com)[^"']*["']/gi,
      ''
    )
    .replace(
      /https?:\/\/(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com)[^"'\s<>)]+/gi,
      ''
    );
}

export function protectCardForReader(card: Card): Card {
  const protectedCover = protectMediaForReader(card.coverImage as Media | null | undefined);
  const protectedThumbnail = protectMediaForReader(
    card.displayThumbnail as Media | null | undefined
  );
  return {
    ...card,
    ...(typeof card.content === 'string' ? { content: rewriteAuthoredMediaHtml(card.content) } : {}),
    ...(Object.prototype.hasOwnProperty.call(card, 'coverImage')
      ? { coverImage: protectedCover }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(card, 'displayThumbnail')
      ? { displayThumbnail: protectedThumbnail }
      : {}),
    ...(card.galleryMedia
      ? {
          galleryMedia: card.galleryMedia.map((item) => ({
            ...item,
            ...(item.media
              ? { media: protectMediaForReader(item.media) ?? undefined }
              : {}),
          })),
        }
      : {}),
  };
}

export function protectCardsForReader(cards: Card[]): Card[] {
  return cards.map(protectCardForReader);
}

export function protectCardPageForReader<T extends Card & { children?: Card[] }>(value: T): T {
  const protectedCard = protectCardForReader(value);
  return {
    ...protectedCard,
    ...(value.children ? { children: protectCardsForReader(value.children) } : {}),
  } as T;
}

export function protectCardListForReader<T extends { items: Card[] }>(value: T): T {
  return { ...value, items: protectCardsForReader(value.items) };
}
