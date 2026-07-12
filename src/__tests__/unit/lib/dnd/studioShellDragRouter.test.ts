import {
  isLocalGalleryReorderDropId,
  resolveStudioShellExternalDropId,
} from '@/lib/dnd/studioShellDragRouter';

describe('studioShellDragRouter', () => {
  describe('isLocalGalleryReorderDropId', () => {
    it('accepts gallery row, end, and append-zone targets', () => {
      expect(isLocalGalleryReorderDropId('gallery:media-1:0')).toBe(true);
      expect(isLocalGalleryReorderDropId('gallery:end')).toBe(true);
      expect(isLocalGalleryReorderDropId('drop:gallery')).toBe(true);
    });

    it('rejects assignment and unrelated targets', () => {
      expect(isLocalGalleryReorderDropId('drop:cover')).toBe(false);
      expect(isLocalGalleryReorderDropId('drop:body')).toBe(false);
      expect(isLocalGalleryReorderDropId('studioChild:child-1')).toBe(false);
      expect(isLocalGalleryReorderDropId(null)).toBe(false);
    });
  });

  describe('resolveStudioShellExternalDropId', () => {
    it('prefers rawOverId when present', () => {
      expect(
        resolveStudioShellExternalDropId({
          activeId: 'gallery:media-1:0',
          rawOverId: 'gallery:media-2:1',
          lastValidOverId: 'gallery:media-3:2',
        })
      ).toBe('gallery:media-2:1');
    });

    it('reuses last local gallery target when rawOver clears on drop', () => {
      expect(
        resolveStudioShellExternalDropId({
          activeId: 'gallery:media-1:0',
          rawOverId: null,
          lastValidOverId: 'gallery:media-2:1',
        })
      ).toBe('gallery:media-2:1');

      expect(
        resolveStudioShellExternalDropId({
          activeId: 'gallery:media-1:0',
          rawOverId: null,
          lastValidOverId: 'gallery:end',
        })
      ).toBe('gallery:end');

      expect(
        resolveStudioShellExternalDropId({
          activeId: 'gallery:media-1:0',
          rawOverId: null,
          lastValidOverId: 'drop:gallery',
        })
      ).toBe('drop:gallery');
    });

    it('does not reuse stale gallery-to-cover assignment hover', () => {
      expect(
        resolveStudioShellExternalDropId({
          activeId: 'gallery:media-1:0',
          rawOverId: null,
          lastValidOverId: 'drop:cover',
        })
      ).toBeNull();
    });

    it('still refuses last-over reuse for source assignment drags', () => {
      expect(
        resolveStudioShellExternalDropId({
          activeId: 'source:media-9',
          rawOverId: null,
          lastValidOverId: 'drop:gallery',
        })
      ).toBeNull();
    });

    it('still reuses last-over for studioChild local reorder', () => {
      expect(
        resolveStudioShellExternalDropId({
          activeId: 'studioChild:child-1',
          rawOverId: null,
          lastValidOverId: 'studioChild:child-2',
        })
      ).toBe('studioChild:child-2');
    });
  });
});
