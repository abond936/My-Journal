'use client';

import React from 'react';
import { arrayMove, useSortable } from '@dnd-kit/sortable';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCuratedTreeDropHighlight } from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import type { Card } from '@/lib/types/card';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';
import styles from './StudioWorkspace.module.css';

export type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';

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
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={rowStyle} className={styles.gallerySortableRow}>
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
  children,
}: {
  id: string;
  accepts: Array<'source' | 'gallery'>;
  ariaLabel: string;
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
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isEligible });
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={ariaLabel}
      className={[styles.dropZone, isEligible ? styles.dropZoneEligible : '', isEligible && isOver ? styles.dropZoneActive : '']
        .join(' ')
        .trim()}
    >
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
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={rowStyle} className={styles.childSortableRow}>
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
    selectedCard: StudioCardContext | null;
    selectedCardId: string | null;
    patchSelectedCard: (payload: Partial<Card>, msg?: string) => Promise<void>;
    setActionInfo: (s: string | null) => void;
  }
): Promise<boolean> {
  const { active, over } = event;
  if (ctx.actionBusy || !ctx.selectedCard || !ctx.selectedCardId) return false;
  if (!over || active.id === over.id) return false;

  const activeId = String(active.id);
  const overId = String(over.id);

  const afterId = ctx.selectedCardId ? `studioChildAfter:${ctx.selectedCardId}` : null;
  if (activeId.startsWith('studioChild:') && afterId && overId === afterId) {
    const ids = [...(ctx.selectedCard.childrenIds || [])];
    const childId = activeId.slice('studioChild:'.length);
    const oldIndex = ids.indexOf(childId);
    if (oldIndex < 0) return true;
    if (oldIndex === ids.length - 1) return true;
    const reordered = arrayMove(ids, oldIndex, ids.length - 1);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('studioChild:') && overId.startsWith('studioChild:')) {
    const ids = ctx.selectedCard.childrenIds || [];
    const itemIds = ids.map((cid) => `studioChild:${cid}`);
    const oldIndex = itemIds.indexOf(activeId);
    const newIndex = itemIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;
    const reordered = arrayMove(ids, oldIndex, newIndex);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId.startsWith('gallery:')) {
    const items = ctx.selectedCard.galleryMedia || [];
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
    await ctx.patchSelectedCard({ coverImageId: mediaId }, 'Cover assigned from gallery by drag/drop.');
    return true;
  }

  if (activeId.startsWith('source:')) {
    const mediaId = activeId.slice('source:'.length);
    if (!mediaId) return true;

    if (overId === 'drop:cover') {
      await ctx.patchSelectedCard({ coverImageId: mediaId }, 'Cover assigned by drag/drop.');
      return true;
    }

    if (overId === 'drop:gallery') {
      const gallery = ctx.selectedCard.galleryMedia || [];
      const exists = gallery.some((g) => g.mediaId === mediaId);
      if (exists) {
        ctx.setActionInfo('Media is already in gallery.');
        return true;
      }
      const nextOrder = gallery.length;
      await ctx.patchSelectedCard(
        { galleryMedia: [...gallery, { mediaId, order: nextOrder }] },
        'Media added to gallery by drag/drop.'
      );
      return true;
    }
  }

  return false;
}
