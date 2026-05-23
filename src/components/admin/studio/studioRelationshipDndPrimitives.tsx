'use client';

import React, { useEffect, type MutableRefObject } from 'react';
import { arrayMove, useSortable } from '@dnd-kit/sortable';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCuratedTreeDropHighlight } from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type { StudioSelectedDetail } from '@/components/admin/studio/studioCardTypes';
import styles from './StudioWorkspace.module.css';

export type { StudioSelectedDetail } from '@/components/admin/studio/studioCardTypes';

export function StudioGallerySortableRow({
  id,
  galleryFocusMediaId,
  children,
}: {
  id: string;
  galleryFocusMediaId: string;
  children: React.ReactNode;
}) {
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
      className={[styles.gallerySortableRow, isDragging ? styles.sortableRowDragging : ''].join(' ').trim()}
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
  /** When true, the droppable stays enabled even with no active drag—avoids scroll/hit quirks on long-lived targets like TipTap body. */
  alwaysRegister = false,
  /** Shown only while a matching drag is active (`accepts` includes the drag kind). */
  eligibleHint,
  onEligibleDragPointerUpdate,
  children,
}: {
  id: string;
  accepts: Array<'source' | 'gallery'>;
  ariaLabel: string;
  /** Merged with base drop-zone classes (e.g. min-height for body target). */
  className?: string;
  alwaysRegister?: boolean;
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
  const { setNodeRef, isOver } = useDroppable({ id, disabled: alwaysRegister ? false : !isEligible });
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
      {isEligible && eligibleHint ? <p className={styles.dropZoneEligibleHint}>{eligibleHint}</p> : null}
      {children}
    </div>
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
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const highlightId = useCuratedTreeDropHighlight();
  const parentDropId = `studio-parent:${parentId}`;
  const { setNodeRef } = useDroppable({
    id: parentDropId,
    disabled: !reparentFromCard,
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
    disabled: !enabled,
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
  event: { active: { id: unknown }; over: { id: unknown } | null },
  ctx: {
    actionBusy: boolean;
    selectedCardDetail: StudioSelectedDetail | null;
    selectedCardId: string | null;
    patchSelectedCard: (payload: Partial<Card>, msg?: string) => Promise<void>;
    resolveBankMediaById: (id: string) => Media | undefined;
    bodyMediaInsertRef: MutableRefObject<((media: Media, dropPoint?: { left: number; top: number } | null) => void) | null>;
    showToast: (input: { title?: string; message: string; tone?: 'success' | 'error' | 'warning' | 'info'; durationMs?: number; persistent?: boolean }) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string, persistent?: boolean) => void;
  }
): Promise<boolean> {
  const { active, over } = event;
  if (ctx.actionBusy || !ctx.selectedCardDetail || !ctx.selectedCardId) return false;
  if (!over || active.id === over.id) return false;

  const activeId = String(active.id);
  const overId = String(over.id);

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

  if (activeId.startsWith('gallery:') && overId === 'drop:cover') {
    const mediaId = activeId.split(':')[1];
    if (!mediaId) return true;
    await ctx.patchSelectedCard({ coverImageId: mediaId });
    return true;
  }

  if (activeId.startsWith('source:')) {
    const mediaId = activeId.slice('source:'.length);
    if (!mediaId) return true;

    if (overId === 'drop:cover') {
      await ctx.patchSelectedCard({ coverImageId: mediaId });
      ctx.showSuccess('Cover image updated.', 'Cover updated');
      return true;
    }

    if (overId === 'drop:gallery') {
      const gallery = ctx.selectedCardDetail.galleryMedia || [];
      const exists = gallery.some((g) => g.mediaId === mediaId);
      if (exists) {
        ctx.showToast({
          title: 'No change',
          message: 'Media is already in gallery.',
          tone: 'info',
          durationMs: 2500,
        });
        return true;
      }
      const nextOrder = gallery.length;
      await ctx.patchSelectedCard(
        { galleryMedia: [...gallery, { mediaId, order: nextOrder }] }
      );
      ctx.showSuccess('Media added to gallery.', 'Gallery updated');
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
