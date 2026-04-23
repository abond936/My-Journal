'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS as DndCss } from '@dnd-kit/utilities';
import MediaAdminRow, { type MediaAdminRowBaseProps, type MediaAdminRowStudioDragBind } from './MediaAdminRow';

/**
 * Same row as {@link MediaAdminRow}, registered as `source:{mediaId}` for Admin Studio cover/gallery drops.
 * Must render only under an active `DndContext` (e.g. Studio embedded Collections column).
 */
export function MediaAdminRowStudioSource(props: MediaAdminRowBaseProps) {
  const mid = props.media.docId;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: mid ? `source:${mid}` : 'source:invalid',
    disabled: !mid,
    data: { mediaId: mid, studioBankMedia: props.media },
  });

  const studioDragBind: MediaAdminRowStudioDragBind = {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    style: {
      opacity: isDragging ? 0.6 : 1,
      transform: DndCss.Translate.toString(transform),
    },
  };

  return <MediaAdminRow {...props} studioDragBind={studioDragBind} />;
}
