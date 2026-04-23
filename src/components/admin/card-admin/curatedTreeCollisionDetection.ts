import type { Collision, CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';

/**
 * Prefer pointer targets over distance. When the pointer is inside multiple droppables,
 * prioritize shell zones first (`unparented`, `tree-root`) so side-panel drops are not stolen
 * by lingering tree row droppables, then prefer `parent:*` (nest on title) over
 * `insertBefore:*` (sibling order) so reparenting to an ancestor is not stolen by insert
 * bands along the path. Falls back to closestCenter when the pointer is not inside any droppable.
 *
 * Note: Studio shares one DndContext across multiple panes; this ordering keeps intent stable
 * when several droppable rects overlap during cross-pane drags.
 */
const SHELL_DROP_IDS = new Set(['unparented', 'tree-root']);

function prioritizeCardHits(hits: Collision[]): Collision[] {
  if (hits.length === 0) return hits;
  const shellHits = hits.filter((c) => {
    const id = String(c.id);
    return SHELL_DROP_IDS.has(id) || id.startsWith('unparented-row:');
  });
  if (shellHits.length > 0) return shellHits;

  const parentHits = hits.filter((c) => String(c.id).startsWith('parent:'));
  const studioParentHits = hits.filter((c) => String(c.id).startsWith('studio-parent:'));
  if (studioParentHits.length > 0) return studioParentHits;
  if (parentHits.length > 0) return parentHits;

  const insertHits = hits.filter((c) => String(c.id).startsWith('insertBefore:'));
  if (insertHits.length > 0) return insertHits;

  return hits;
}

function dragDomain(activeId: string): 'card' | 'source' | 'gallery' | 'studioChild' | 'other' {
  if (activeId.startsWith('card:')) return 'card';
  if (activeId.startsWith('source:')) return 'source';
  if (activeId.startsWith('gallery:')) return 'gallery';
  if (activeId.startsWith('studioChild:')) return 'studioChild';
  return 'other';
}

function filterByDomain(hits: Collision[], domain: ReturnType<typeof dragDomain>): Collision[] {
  switch (domain) {
    case 'card':
      return hits.filter((c) => {
        const id = String(c.id);
        return id === 'unparented' || id.startsWith('unparented-row:') || id === 'tree-root' || id.startsWith('parent:') || id.startsWith('studio-parent:') || id.startsWith('insertBefore:');
      });
    case 'source':
      return hits.filter((c) => {
        const id = String(c.id);
        return id === 'drop:cover' || id === 'drop:gallery' || id === 'drop:body';
      });
    case 'gallery':
      return hits.filter((c) => {
        const id = String(c.id);
        return id === 'drop:cover' || id.startsWith('gallery:');
      });
    case 'studioChild':
      return hits.filter((c) => {
        const id = String(c.id);
        return id.startsWith('studioChild:') || id.startsWith('studioChildAfter:');
      });
    default:
      return hits;
  }
}

/**
 * Prefer pointer targets over distance. When the pointer is inside multiple droppables,
 * prefer `parent:*` (nest on title) over `insertBefore:*` (sibling order) so reparenting to an
 * ancestor is not stolen by insert bands along the path.
 */
export const curatedTreeCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active?.id != null ? String(args.active.id) : '';
  const domain = dragDomain(activeId);
  const pointerHits = filterByDomain(pointerWithin(args), domain);
  if (pointerHits.length > 0) {
    if (domain === 'card') return prioritizeCardHits(pointerHits);
    return pointerHits;
  }
  const rectHits = filterByDomain(rectIntersection(args), domain);
  if (rectHits.length > 0) {
    if (domain === 'card') return prioritizeCardHits(rectHits);
    return rectHits;
  }
  if (domain === 'card') {
    // Avoid guessing to a tree row when no concrete card-domain target is actually hit.
    return [];
  }
  return filterByDomain(closestCenter(args), domain);
};
