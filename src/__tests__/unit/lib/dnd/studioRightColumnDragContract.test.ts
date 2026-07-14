import type { Collision } from '@dnd-kit/core';
import {
  acceptsStudioRightColumnDrop,
  classifyStudioRightColumnDragId,
  filterStudioRightColumnHits,
  prioritizeStudioRightColumnHits,
  shouldUseRectIntersectionFallback,
  shouldReuseLastOverOnDrop,
  shouldUseClosestCenterFallback,
} from '@/lib/dnd/studioRightColumnDragContract';

describe('studioRightColumnDragContract', () => {
  describe('classifyStudioRightColumnDragId', () => {
    it('classifies only right-column drag kinds', () => {
      expect(classifyStudioRightColumnDragId('source:media-1')).toBe('source');
      expect(classifyStudioRightColumnDragId('gallery:media-1:0')).toBe('gallery');
      expect(classifyStudioRightColumnDragId('studioChild:child-1')).toBe('studioChild');
      expect(classifyStudioRightColumnDragId('card:welcome')).toBe('collectionCard');
    });
  });

  describe('acceptsStudioRightColumnDrop', () => {
    it('keeps collections targets out of source-media drags', () => {
      expect(acceptsStudioRightColumnDrop('tree-root', 'source')).toBe(false);
      expect(acceptsStudioRightColumnDrop('parent:welcome', 'source')).toBe(false);
      expect(acceptsStudioRightColumnDrop('drop:cover', 'source')).toBe(true);
      expect(acceptsStudioRightColumnDrop('drop:body', 'source')).toBe(true);
    });

    it('keeps body and child targets out of gallery drags', () => {
      expect(acceptsStudioRightColumnDrop('drop:body', 'gallery')).toBe(false);
      expect(acceptsStudioRightColumnDrop('studioChild:child-1', 'gallery')).toBe(false);
      expect(acceptsStudioRightColumnDrop('drop:cover', 'gallery')).toBe(true);
      expect(acceptsStudioRightColumnDrop('gallery:media-1:0', 'gallery')).toBe(true);
    });

    it('limits child drags to child reorder targets', () => {
      expect(acceptsStudioRightColumnDrop('drop:cover', 'studioChild')).toBe(false);
      expect(acceptsStudioRightColumnDrop('gallery:media-1:0', 'studioChild')).toBe(false);
      expect(acceptsStudioRightColumnDrop('studioChild:child-1', 'studioChild')).toBe(true);
      expect(acceptsStudioRightColumnDrop('studioChildAfter:card-1', 'studioChild')).toBe(true);
    });

    it('limits collection-card bridge drags to compose child attach targets', () => {
      expect(acceptsStudioRightColumnDrop('tree-root', 'collectionCard')).toBe(false);
      expect(acceptsStudioRightColumnDrop('drop:cover', 'collectionCard')).toBe(false);
      expect(acceptsStudioRightColumnDrop('studio-parent:card-1', 'collectionCard')).toBe(true);
    });
  });

  describe('filterStudioRightColumnHits', () => {
    const hits = [
      { id: 'tree-root' },
      { id: 'drop:cover' },
      { id: 'drop:body' },
      { id: 'gallery:media-1:0' },
      { id: 'studioChild:child-1' },
    ] as Collision[];

    it('returns only assignment targets for source drags', () => {
      expect(filterStudioRightColumnHits(hits, 'source').map((hit) => String(hit.id))).toEqual([
        'drop:cover',
        'drop:body',
      ]);
    });

    it('includes story pile targets for source drags', () => {
      expect(
        filterStudioRightColumnHits(
          [{ id: 'pile:cluster-1' }, { id: 'tree-root' }] as Collision[],
          'source'
        ).map((hit) => String(hit.id))
      ).toEqual(['pile:cluster-1']);
    });

    it('returns only reorder targets for child drags', () => {
      expect(filterStudioRightColumnHits(hits, 'studioChild').map((hit) => String(hit.id))).toEqual([
        'studioChild:child-1',
      ]);
    });

    it('returns only compose attach targets for collection-card bridge drags', () => {
      expect(
        filterStudioRightColumnHits(
          [{ id: 'studio-parent:card-1' }, { id: 'drop:cover' }] as Collision[],
          'collectionCard'
        ).map((hit) => String(hit.id))
      ).toEqual(['studio-parent:card-1']);
    });
  });

  describe('prioritizeStudioRightColumnHits', () => {
    it('prefers cover over broader body hits for source media drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'drop:body' }, { id: 'drop:cover' }] as Collision[],
        'source'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['drop:cover']);
    });

    it('prefers gallery over body when both are hit for source media drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'drop:body' }, { id: 'drop:gallery' }] as Collision[],
        'source'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['drop:gallery']);
    });

    it('prefers compose targets over pile headers for source media drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'pile:cluster-1' }, { id: 'drop:body' }] as Collision[],
        'source'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['drop:body']);
    });

    it('returns pile headers when no compose target is hit for source media drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'pile:cluster-2' }, { id: 'pile:unsorted' }] as Collision[],
        'source'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['pile:cluster-2', 'pile:unsorted']);
    });

    it('prefers cover over gallery rows for gallery drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'gallery:media-1:0' }, { id: 'drop:cover' }] as Collision[],
        'gallery'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['drop:cover']);
    });

    it('prefers child rows over the end-of-list target for child drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'studioChildAfter:card-1' }, { id: 'studioChild:child-1' }] as Collision[],
        'studioChild'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['studioChild:child-1']);
    });

    it('keeps the compose attach zone for collection-card bridge drags', () => {
      const ordered = prioritizeStudioRightColumnHits(
        [{ id: 'studio-parent:card-1' }] as Collision[],
        'collectionCard'
      );

      expect(ordered.map((hit) => String(hit.id))).toEqual(['studio-parent:card-1']);
    });
  });

  describe('assignment safety', () => {
    it('disables rect-intersection guessing for cross-pane assignment drags', () => {
      expect(shouldUseRectIntersectionFallback('source')).toBe(false);
      expect(shouldUseRectIntersectionFallback('gallery')).toBe(false);
      expect(shouldUseRectIntersectionFallback('collectionCard')).toBe(false);
      expect(shouldUseRectIntersectionFallback('studioChild')).toBe(true);
    });

    it('does not broadly reuse stale hover targets for source or gallery assignment via shouldReuseLastOverOnDrop', () => {
      // Gallery local reorder reuse is handled narrowly in resolveStudioShellExternalDropId.
      expect(shouldReuseLastOverOnDrop('source')).toBe(false);
      expect(shouldReuseLastOverOnDrop('gallery')).toBe(false);
      expect(shouldReuseLastOverOnDrop('studioChild')).toBe(true);
    });

    it('disables closest-center guessing for source and gallery assignment drags', () => {
      expect(shouldUseClosestCenterFallback('source')).toBe(false);
      expect(shouldUseClosestCenterFallback('gallery')).toBe(false);
      expect(shouldUseClosestCenterFallback('studioChild')).toBe(true);
    });
  });
});
