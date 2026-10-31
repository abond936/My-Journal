import {
  protectCardForReader,
  protectMediaForReader,
} from '@/lib/utils/readerMediaDelivery';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

const publicUrl =
  'https://firebasestorage.googleapis.com/v0/b/example/o/images%2Fphoto.jpg?alt=media';

function media(id: string): Media {
  return {
    docId: id,
    storageUrl: publicUrl,
    storagePath: `images/${id}.jpg`,
    renditions: {
      reader: {
        storagePath: `renditions/reader/${id}.jpg`,
        storageUrl: publicUrl,
        width: 800,
        height: 600,
        contentType: 'image/jpeg',
      },
      studio: {
        storagePath: `renditions/studio/${id}.jpg`,
        storageUrl: publicUrl,
        width: 1600,
        height: 1200,
        contentType: 'image/jpeg',
      },
    },
  } as Media;
}

describe('Reader Media delivery transformation', () => {
  it('replaces every hydrated Media URL with authenticated delivery URLs', () => {
    const protectedMedia = protectMediaForReader(media('media one'))!;

    expect(protectedMedia.storageUrl).toBe('/api/reader/media/media%20one');
    expect(protectedMedia.renditions?.reader?.storageUrl).toBe(
      '/api/reader/media/media%20one'
    );
    expect(protectedMedia.renditions?.studio?.storageUrl).toBe(
      '/api/reader/media/media%20one?rendition=studio'
    );
    expect(JSON.stringify(protectedMedia)).not.toContain('firebasestorage.googleapis.com');
    expect(protectedMedia).not.toHaveProperty('storagePath');
    expect(protectedMedia.renditions?.reader).not.toHaveProperty('storagePath');
  });

  it('protects covers, galleries, thumbnails, and authored HTML without mutating input', () => {
    const sourceMedia = media('media-1');
    const card = {
      docId: 'card-1',
      title: 'Story',
      content: `<figure data-media-id="media-1"><img src="${publicUrl}" srcset="${publicUrl} 2x"></figure><img src="${publicUrl}">`,
      coverImage: sourceMedia,
      displayThumbnail: sourceMedia,
      galleryMedia: [{ mediaId: 'media-1', order: 0, media: sourceMedia }],
    } as Card;

    const protectedCard = protectCardForReader(card);

    expect(protectedCard.coverImage.storageUrl).toBe('/api/reader/media/media-1');
    expect(protectedCard.galleryMedia?.[0].media?.storageUrl).toBe(
      '/api/reader/media/media-1'
    );
    expect(protectedCard.content).toContain('src="/api/reader/media/media-1"');
    expect(JSON.stringify(protectedCard)).not.toContain('firebasestorage.googleapis.com');
    expect(sourceMedia.storageUrl).toBe(publicUrl);
    expect(card.content).toContain(publicUrl);
  });
});
