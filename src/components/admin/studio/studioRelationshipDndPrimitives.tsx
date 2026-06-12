'use client';

import React, { useEffect, type MutableRefObject } from 'react';
import { arrayMove, useSortable } from '@dnd-kit/sortable';
import { useDndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCuratedTreeDropHighlight } from '@/components/admin/studio/cards/curatedTreeDropHighlightContext';
import type { Card } from '@/lib/types/card';
import type { CollectionsCardDragData } from '@/lib/dnd/collectionsDragContract';
import { isCollectionsCardDragData, parseCollectionsCardDragId } from '@/lib/dnd/collectionsDragContract';
import type { Media } from '@/lib/types/photo';
import type { StudioSelectedDetail } from '@/components/admin/studio/studioCardTypes';
import styles from './StudioWorkspace.module.css';

function activeSourceMediaIds(activeId: string, activeData: unknown): string[] {
  const draggedMediaId = activeId.startsWith('source:') ? activeId.slice('source:'.length) : '';
  if (!draggedMediaId) return [];

  const maybeSelected =
    activeData && typeof activeData === 'object' && Array.isArray((activeData as { selectedMediaIds?: unknown[] }).selectedMediaIds)
      ? (activeData as { selectedMediaIds: unknown[] }).selectedMediaIds
      : null;

  if (!maybeSelected) return [draggedMediaId];

  const normalized = maybeSelected.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  if (!normalized.includes(draggedMediaId)) return [draggedMediaId];
  return Array.from(new Set(normalized));
}

function promoteMediaToGalleryFront<
  T extends {
    mediaId?: string | null;
    order?: number | null;
  },
>(items: T[], mediaId: string): Array<T | { mediaId: string; order: number }> {
  const existingIndex = items.findIndex((item) => item.mediaId === mediaId);
  const next =
    existingIndex < 0
      ? [{ mediaId, order: 0 }, ...items]
      : arrayMove(items, existingIndex, 0);
  return next.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export type { StudioSelectedDetail } from '@/components/admin/studio/studioCardTypes';

function parseSortableOrder(id: string, prefix: 'gallery:' | 'studioChild:'): number | null {
  if (!id.startsWith(prefix)) return null;
  const match = id.match(/:(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function StudioGallerySortableRow({
  id,
  galleryFocusMediaId,
  children,
}: {
  id: string;
  galleryFocusMediaId: string;
  children: React.ReactNode;
}) {
  const { active, over } = useDndContext();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const activeId = active?.id != null ? String(active.id) : '';
  const overId = over?.id != null ? String(over.id) : '';
  const activeOrder = parseSortableOrder(activeId, 'gallery:');
  const overOrder = parseSortableOrder(overId, 'gallery:');
  const showInsertBefore =
    activeId.startsWith('gallery:') &&
    overId === id &&
    activeId !== id &&
    activeOrder !== null &&
    overOrder !== null &&
    activeOrder > overOrder;
  const showInsertAfter =
    activeId.startsWith('gallery:') &&
    overId === id &&
    activeId !== id &&
    activeOrder !== null &&
    overOrder !== null &&
    activeOrder < overOrder;
  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      className={[
        styles.gallerySortableRow,
        isDragging ? styles.sortableRowDragging : '',
        showInsertBefore ? styles.gallerySortableRowInsertBefore : '',
        showInsertAfter ? styles.gallerySortableRowInsertAfter : '',
      ]
        .join(' ')
        .trim()}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label="Drag to reorder gallery item. Space to pick up, arrows to move, Space to drop."
        title="Drag to reorder. Keyboard: Space to pick up, arrows to move, Space to drop."
        data-studio-dnd-return-focus={id}
        data-studio-gallery-focus={galleryFocusMediaId}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className={styles.gallerySortableContent}>{children}</div>
    </div>
  );
}

export function StudioDropZone({
  id,
  accepts,
  ariaLabel,
  className,
  onEligibleDragPointerUpdate,
  children,
}: {
  id: string;
  accepts: Array<'source' | 'gallery'>;
  ariaLabel: string;
  /** Merged with base drop-zone classes (e.g. min-height for body target). */
  className?: string;
  /** Legacy no-op: targets now stay registered all the time for stability. */
  alwaysRegister?: boolean;
  /** Legacy no-op: visual hint text was removed in favor of quieter line/outline cues. */
  eligibleHint?: string;
  onEligibleDragPointerUpdate?: (point: { left: number; top: number } | null) => void;
  children: React.ReactNode;
}) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const activeDragKind = activeStr.startsWith('source:')
    ? 'source'
    : activeStr.startsWith('gallery:')
      ? 'gallery'
      : null;
  const isEligible = activeDragKind !== null && accepts.includes(activeDragKind);
  const { setNodeRef, isOver } = useDroppable({ id });
  useEffect(() => {
    if (!onEligibleDragPointerUpdate) return;
    if (!isEligible || !isOver) {
      onEligibleDragPointerUpdate(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      onEligibleDragPointerUpdate({
        left: event.clientX,
        top: event.clientY,
      });
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      onEligibleDragPointerUpdate(null);
    };
  }, [isEligible, isOver, onEligibleDragPointerUpdate]);
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={ariaLabel}
      data-drop-zone-id={id}
      data-drop-zone-active={isEligible && isOver ? 'true' : 'false'}
      data-drop-zone-eligible={isEligible ? 'true' : 'false'}
      className={[
        styles.dropZone,
        isEligible ? styles.dropZoneEligible : '',
        isEligible && isOver ? styles.dropZoneActive : '',
        isEligible ? styles.dropZoneEligiblePad : '',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}

/** Drop target after the last gallery item so reorder can move an item to the end of the grid. */
export function StudioGalleryEndDropZone() {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const enabled = activeStr.startsWith('gallery:');
  const { setNodeRef, isOver } = useDroppable({
    id: 'gallery:end',
  });
  return (
    <div
      ref={setNodeRef}
      className={[styles.galleryEndDropZone, enabled && isOver ? styles.galleryEndDropZoneActive : ''].join(' ').trim()}
      aria-hidden={!enabled}
    />
  );
}

export function StudioChildSortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      className={[styles.childSortableRow, isDragging ? styles.sortableRowDragging : ''].join(' ').trim()}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label="Drag to reorder child card. Space to pick up, arrows to move, Space to drop."
        title="Drag to reorder. Keyboard: Space to pick up, arrows to move, Space to drop."
        data-studio-dnd-return-focus={id}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className={styles.childSortableMain}>{children}</div>
    </div>
  );
}

/** Studio-only parent attach zone for tree card drags. */
export function StudioParentAttachZone({ parentId, children }: { parentId: string; children: React.ReactNode }) {
  const highlightId = useCuratedTreeDropHighlight();
  const parentDropId = `studio-parent:${parentId}`;
  const { setNodeRef } = useDroppable({
    id: parentDropId,
  });
  const nestActive = highlightId === parentDropId;
  return (
    <div
      ref={setNodeRef}
      className={[styles.parentAttachZone, nestActive ? styles.parentAttachZoneNestActive : ''].join(' ').trim()}
    >
      {children}
    </div>
  );
}

/** Drop target below last child so reorder can move an item to the end of the list. */
export function StudioChildrenEndDropZone({ parentId }: { parentId: string }) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const enabled = activeStr.startsWith('studioChild:');
  const highlightId = useCuratedTreeDropHighlight();
  const endId = `studioChildAfter:${parentId}`;
  const { setNodeRef, isOver } = useDroppable({
    id: endId,
  });
  const showLine = highlightId === endId || isOver;
  return (
    <div
      ref={setNodeRef}
      className={[styles.studioChildAfterZone, showLine ? styles.studioChildAfterZoneActive : ''].join(' ').trim()}
      aria-hidden={!enabled}
    />
  );
}

export async function handleStudioRelationshipDragEnd(
  event: DragEndEvent,
  resolvedOverId: string | null | undefined,
  ctx: {
    actionBusy: boolean;
    selectedCardDetail: StudioSelectedDetail | null;
    selectedCardId: string | null;
    patchSelectedCard: (payload: Partial<Card>, msg?: string) => Promise<void>;
    bridgeCollectionsCardToSelectedParent: (input: {
      childId: string;
      parentId: string;
      dragData: CollectionsCardDragData | null;
    }) => Promise<boolean>;
    resolveBankMediaById: (id: string) => Media | undefined;
    bodyMediaInsertRef: MutableRefObject<((media: Media) => void) | null>;
    showToast: (input: { title?: string; message: string; tone?: 'success' | 'error' | 'warning' | 'info'; durationMs?: number; persistent?: boolean }) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string, persistent?: boolean) => void;
  }
): Promise<boolean> {
  const { active, over } = event;
  if (ctx.actionBusy || !ctx.selectedCardDetail || !ctx.selectedCardId) return false;
  const fallbackOverId =
    resolvedOverId != null && resolvedOverId !== '' ? resolvedOverId : over?.id != null ? String(over.id) : null;
  if (!fallbackOverId) return false;
  if (String(active.id) === fallbackOverId) return false;

  const activeId = String(active.id);
  const overId = fallbackOverId;
  const activeData = active.data?.current;

  if (activeId.startsWith('card:') && overId.startsWith('studio-parent:')) {
    const childId = parseCollectionsCardDragId(activeId);
    const parentId = overId.slice('studio-parent:'.length);
    if (!childId || !parentId) return false;
    return ctx.bridgeCollectionsCardToSelectedParent({
      childId,
      parentId,
      dragData: isCollectionsCardDragData(activeData) ? activeData : null,
    });
  }

  const afterId = ctx.selectedCardId ? `studioChildAfter:${ctx.selectedCardId}` : null;
  if (activeId.startsWith('studioChild:') && afterId && overId === afterId) {
    const ids = [...(ctx.selectedCardDetail.childrenIds || [])];
    const childId = activeId.slice('studioChild:'.length);
    const oldIndex = ids.indexOf(childId);
    if (oldIndex < 0) return true;
    if (oldIndex === ids.length - 1) return true;
    const reordered = arrayMove(ids, oldIndex, ids.length - 1);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('studioChild:') && overId.startsWith('studioChild:')) {
    const ids = ctx.selectedCardDetail.childrenIds || [];
    const itemIds = ids.map((cid) => `studioChild:${cid}`);
    const oldIndex = itemIds.indexOf(activeId);
    const newIndex = itemIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;
    const reordered = arrayMove(ids, oldIndex, newIndex);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId.startsWith('gallery:')) {
    const items = ctx.selectedCardDetail.galleryMedia || [];
    const itemIds = items.map((item) => `gallery:${item.mediaId}:${item.order}`);
    const oldIndex = itemIds.indexOf(activeId);
    const newIndex = itemIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index,
    }));
    await ctx.patchSelectedCard({ galleryMedia: reordered }, 'Gallery order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId === 'gallery:end') {
    const items = ctx.selectedCardDetail.galleryMedia || [];
    const itemIds = items.map((item) => `gallery:${item.mediaId}:${item.order}`);
    const oldIndex = itemIds.indexOf(activeId);
    if (oldIndex < 0) return true;
    if (oldIndex === items.length - 1) return true;
    const reordered = arrayMove(items, oldIndex, items.length - 1).map((item, index) => ({
      ...item,
      order: index,
    }));
    await ctx.patchSelectedCard({ galleryMedia: reordered }, 'Gallery order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId === 'drop:gallery') {
    const items = ctx.selectedCardDetail.galleryMedia || [];
    const itemIds = items.map((item) => `gallery:${item.mediaId}:${item.order}`);
    const oldIndex = itemIds.indexOf(activeId);
    if (oldIndex < 0) return true;
    if (oldIndex === items.length - 1) return true;
    const reordered = arrayMove(items, oldIndex, items.length - 1).map((item, index) => ({
      ...item,
      order: index,
    }));
    await ctx.patchSelectedCard({ galleryMedia: reordered }, 'Gallery order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId === 'drop:cover') {
    const mediaId = activeId.split(':')[1];
    if (!mediaId) return true;
    const gallery = ctx.selectedCardDetail.galleryMedia || [];
    await ctx.patchSelectedCard({
      coverImageId: mediaId,
      galleryMedia: promoteMediaToGalleryFront(gallery, mediaId),
    });
    return true;
  }

  if (activeId.startsWith('source:')) {
    const mediaId = activeId.slice('source:'.length);
    const draggedMediaIds = activeSourceMediaIds(activeId, activeData);
    if (!mediaId) return true;

    if (overId === 'drop:cover') {
      const gallery = ctx.selectedCardDetail.galleryMedia || [];
      await ctx.patchSelectedCard({
        coverImageId: mediaId,
        galleryMedia: promoteMediaToGalleryFront(gallery, mediaId),
      });
      ctx.showSuccess('Cover image updated.', 'Cover updated');
      return true;
    }

    if (overId === 'drop:gallery') {
      const gallery = ctx.selectedCardDetail.galleryMedia || [];
      const existingIds = new Set(gallery.map((item) => item.mediaId));
      const mediaIdsToAppend = draggedMediaIds.filter((id) => !existingIds.has(id));
      if (mediaIdsToAppend.length === 0) {
        ctx.showToast({
          title: 'No change',
          message:
            draggedMediaIds.length > 1
              ? 'Selected media is already in gallery.'
              : 'Media is already in gallery.',
          tone: 'info',
          durationMs: 2500,
        });
        return true;
      }
      const appendedItems = mediaIdsToAppend.map((id, index) => ({
        mediaId: id,
        order: gallery.length + index,
      }));
      await ctx.patchSelectedCard({ galleryMedia: [...gallery, ...appendedItems] });
      ctx.showSuccess(
        mediaIdsToAppend.length > 1 ? `${mediaIdsToAppend.length} media added to gallery.` : 'Media added to gallery.',
        'Gallery updated'
      );
      return true;
    }

    if (overId === 'drop:body') {
      const media = ctx.resolveBankMediaById(mediaId);
      if (!media?.docId) {
        ctx.showError(
          'That media is not on the current bank page. Adjust filters or use Next/Previous, then try again.',
          'Could not insert image',
          false
        );
        return true;
      }
      const insert = ctx.bodyMediaInsertRef.current;
      if (!insert) {
        ctx.showError('Body editor is not ready. Select a card in Compose and try again.', 'Could not insert image', false);
        return true;
      }
      insert(media);
      ctx.showSuccess('Image inserted in body.', 'Inserted');
      return true;
    }
  }

  return false;
}
