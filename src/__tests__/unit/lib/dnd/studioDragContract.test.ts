import type { Collision } from '@dnd-kit/core';
import {
  acceptsStudioDomain,
  filterStudioHitsByDomain,
  prioritizeCollectionHits,
} from '@/lib/dnd/studioDragContract';

describe('studioDragContract', () => {
  describe('acceptsStudioDomain', () => {
    it('keeps structural collection drops out of media and compose domains', () => {
      expect(acceptsStudioDomain('tree-root', 'media')).toBe(false);
      expect(acceptsStudioDomain('parent:welcome', 'media')).toBe(false);
      expect(acceptsStudioDomain('tree-root', 'compose')).toBe(false);
      expect(acceptsStudioDomain('insertBefore:__root__:welcome', 'compose')).toBe(false);
    });

    it('keeps compose and media drops out of the collections domain', () => {
      expect(acceptsStudioDomain('drop:cover', 'collections')).toBe(false);
      expect(acceptsStudioDomain('drop:gallery', 'collections')).toBe(false);
      expect(acceptsStudioDomain('drop:body', 'collections')).toBe(false);
      expect(acceptsStudioDomain('gallery:media-1:0', 'collections')).toBe(false);
      expect(acceptsStudioDomain('studioChild:child-1', 'collections')).toBe(false);
    });
  });

  describe('filterStudioHitsByDomain', () => {
    const hits = [
      { id: 'tree-root' },
      { id: 'parent:welcome' },
      { id: 'drop:cover' },
      { id: 'gallery:media-1:0' },
    ] as Collision[];

    it('returns only collection-compatible hits for collection drags', () => {
      expect(filterStudioHitsByDomain(hits, 'collections').map((hit) => String(hit.id))).toEqual([
        'tree-root',
        'parent:welcome',
      ]);
    });

    it('returns only compose-compatible hits for compose drags', () => {
      expect(filterStudioHitsByDomain(hits, 'compose').map((hit) => String(hit.id))).toEqual([
        'drop:cover',
        'gallery:media-1:0',
      ]);
    });
  });

  describe('prioritizeCollectionHits', () => {
    it('prefers shell zones over parent and insert targets when they are present', () => {
      const ordered = prioritizeCollectionHits([
        { id: 'parent:welcome' },
        { id: 'insertBefore:__root__:welcome' },
        { id: 'tree-root' },
      ] as Collision[]);

      expect(ordered.map((hit) => String(hit.id))).toEqual(['tree-root']);
    });

    it('prefers parent targets over insert-before targets when no shell zone is present', () => {
      const ordered = prioritizeCollectionHits([
        { id: 'insertBefore:__root__:welcome' },
        { id: 'parent:welcome' },
      ] as Collision[]);

      expect(ordered.map((hit) => String(hit.id))).toEqual(['parent:welcome']);
    });
  });
});
