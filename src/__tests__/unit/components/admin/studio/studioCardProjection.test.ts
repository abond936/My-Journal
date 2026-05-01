import {
  mergeStudioCatalogCard,
  toStudioCatalogCard,
  toStudioSelectedPreview,
} from '@/components/admin/studio/studioCardProjection';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

const baseMedia = (overrides: Partial<Media> = {}): Media => ({
  docId: 'media-1',
  filename: 'image.jpg',
  width: 100,
  height: 100,
  size: 1024,
  contentType: 'image/jpeg',
  storageUrl: 'https://example.com/image.jpg',
  storagePath: 'images/image.jpg',
  source: 'paste',
  sourcePath: 'upload://image.jpg',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const baseCard = (overrides: Partial<Card> = {}): Card => ({
  docId: 'card-1',
  title: 'Test Card',
  title_lowercase: 'test card',
  subtitle: null,
  excerpt: null,
  excerptAuto: true,
  content: '',
  type: 'story',
  status: 'draft',
  displayMode: 'navigate',
  createdAt: 1,
  updatedAt: 1,
  tags: [],
  who: [],
  what: [],
  when: [],
  where: [],
  childrenIds: [],
  filterTags: {},
  coverImageId: null,
  coverImage: null,
  contentMedia: [],
  galleryMedia: [],
  ...overrides,
});

describe('studioCardProjection', () => {
  it('uses the real cover as the catalog preview thumbnail when present', () => {
    const cover = baseMedia({ docId: 'cover-1' });
    const projected = toStudioCatalogCard(
      baseCard({
        coverImageId: cover.docId,
        coverImage: cover,
      })
    );

    expect(projected.displayThumbnail?.docId).toBe('cover-1');
    expect(projected.displayThumbnailSource).toBe('cover');
  });

  it('uses the first gallery media as the preview thumbnail when there is no cover', () => {
    const galleryMedia = baseMedia({ docId: 'gallery-1' });
    const projected = toStudioCatalogCard(
      baseCard({
        galleryMedia: [
          {
            mediaId: galleryMedia.docId,
            order: 0,
            media: galleryMedia,
          },
        ],
      })
    );

    expect(projected.coverImage).toBeNull();
    expect(projected.displayThumbnail?.docId).toBe('gallery-1');
    expect(projected.displayThumbnailSource).toBe('gallery');
  });

  it('preserves an explicit display thumbnail from the payload', () => {
    const galleryPreview = baseMedia({ docId: 'gallery-preview' });
    const projected = toStudioCatalogCard({
      ...baseCard(),
      displayThumbnail: galleryPreview,
      displayThumbnailSource: 'gallery',
    });

    expect(projected.displayThumbnail?.docId).toBe('gallery-preview');
    expect(projected.displayThumbnailSource).toBe('gallery');
  });

  it('merges thin incoming payloads without stripping richer existing preview fields', () => {
    const existingCover = baseMedia({ docId: 'cover-1' });
    const existing = toStudioCatalogCard(
      baseCard({
        childrenIds: ['child-1'],
        coverImageId: existingCover.docId,
        coverImage: existingCover,
      })
    );

    const merged = mergeStudioCatalogCard(existing, {
      docId: existing.docId,
      title: 'Updated Title',
    });

    expect(merged.title).toBe('Updated Title');
    expect(merged.childrenIds).toEqual(['child-1']);
    expect(merged.coverImage?.docId).toBe('cover-1');
    expect(merged.displayThumbnail?.docId).toBe('cover-1');
    expect(merged.displayThumbnailSource).toBe('cover');
  });

  it('selected previews inherit the projected display thumbnail semantics', () => {
    const galleryMedia = baseMedia({ docId: 'gallery-1' });
    const preview = toStudioSelectedPreview(
      baseCard({
        galleryMedia: [
          {
            mediaId: galleryMedia.docId,
            order: 0,
            media: galleryMedia,
          },
        ],
      })
    );

    expect(preview.displayThumbnail?.docId).toBe('gallery-1');
    expect(preview.displayThumbnailSource).toBe('gallery');
  });
});
