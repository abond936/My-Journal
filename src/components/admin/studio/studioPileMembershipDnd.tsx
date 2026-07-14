'use client';

import React from 'react';
import { useDndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { activeSourceMediaIds } from '@/components/admin/studio/studioRelationshipDndPrimitives';
import { isStoryPileDropId, parseStoryPileDropId } from '@/lib/dnd/studioPileDragContract';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';

type ApiErrorResponse = {
  message?: string;
  code?: string;
};

export function StoryPileHeaderDropZone({
  id,
  ariaLabel,
  className,
  children,
}: {
  id: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const isEligible = activeStr.startsWith('source:');
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isEligible,
  });

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={ariaLabel}
      data-drop-zone-id={id}
      data-drop-zone-active={isEligible && isOver ? 'true' : 'false'}
      data-drop-zone-eligible={isEligible ? 'true' : 'false'}
      className={[className ?? '', isEligible && isOver ? 'story-pile-header-drop-active' : '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}

export async function postStoryPileMembershipMove(opts: {
  mediaIds: string[];
  targetClusterId: string | null;
}): Promise<void> {
  const response = await fetch('/api/admin/media/review/membership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      mediaIds: opts.mediaIds,
      targetClusterId: opts.targetClusterId,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
  throwIfJsonApiFailed(response, payload, 'Failed to update pile membership.');
}

export async function handleStudioPileMembershipDragEnd(
  event: DragEndEvent,
  resolvedOverId: string | null | undefined,
  ctx: {
    onMembershipChanged: (() => void | Promise<void>) | null;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string, persistent?: boolean) => void;
    showToast: (input: {
      title?: string;
      message: string;
      tone?: 'success' | 'error' | 'warning' | 'info';
      durationMs?: number;
      persistent?: boolean;
    }) => void;
  }
): Promise<boolean> {
  const fallbackOverId =
    resolvedOverId != null && resolvedOverId !== ''
      ? resolvedOverId
      : event.over?.id != null
        ? String(event.over.id)
        : null;
  if (!fallbackOverId || !isStoryPileDropId(fallbackOverId)) return false;

  const activeId = String(event.active.id);
  if (!activeId.startsWith('source:')) return false;

  const targetClusterId = parseStoryPileDropId(fallbackOverId);
  if (targetClusterId === undefined) return false;

  const mediaIds = activeSourceMediaIds(activeId, event.active.data?.current);
  if (mediaIds.length === 0) return true;

  try {
    await postStoryPileMembershipMove({ mediaIds, targetClusterId });
    await ctx.onMembershipChanged?.();
    if (targetClusterId === null) {
      ctx.showSuccess(
        mediaIds.length > 1
          ? `${mediaIds.length} photos moved to Unsorted.`
          : 'Photo moved to Unsorted.',
        'Moved'
      );
    } else {
      ctx.showSuccess(
        mediaIds.length > 1 ? `${mediaIds.length} photos moved to pile.` : 'Photo moved to pile.',
        'Moved'
      );
    }
  } catch (error) {
    ctx.showError(
      error instanceof Error ? error.message : 'Failed to move photos between piles.',
      'Move failed'
    );
  }

  return true;
}
