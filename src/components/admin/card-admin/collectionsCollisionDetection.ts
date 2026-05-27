import { studioShellCollisionDetection } from '@/lib/dnd/studioShellDragRouter';

/**
 * Back-compat wrapper while the Studio shell migrates toward explicit domain ownership.
 * Structural drags and right-column relationship drags are routed by
 * `studioShellCollisionDetection`.
 */
export const collectionsCollisionDetection = studioShellCollisionDetection;
