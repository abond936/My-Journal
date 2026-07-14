import type { Media } from '@/lib/types/photo';
import type { MediaStack } from '@/lib/types/mediaStack';

export type MediaStackDisplayMeta = {
  stack: MediaStack;
  memberCount: number;
  isHero: boolean;
  expanded: boolean;
};

export function buildStackByIdMap(stacks: MediaStack[]): Map<string, MediaStack> {
  return new Map(stacks.filter((stack) => stack.docId).map((stack) => [stack.docId!, stack]));
}

export function stackForMedia(
  media: Pick<Media, 'stackId'>,
  stackById: Map<string, MediaStack>
): MediaStack | null {
  if (!media.stackId) return null;
  return stackById.get(media.stackId) ?? null;
}

/**
 * Collapsed: one visible row per stack (hero only). Expanded stack ids show all members.
 * Show all: every media row visible.
 */
export function filterMediaForStackDisplay(
  mediaItems: Media[],
  stackById: Map<string, MediaStack>,
  showAllStacks: boolean,
  expandedStackIds: Set<string>
): Media[] {
  if (showAllStacks) return mediaItems;

  const visible: Media[] = [];
  const emittedExpandedStacks = new Set<string>();

  for (const item of mediaItems) {
    const stackId = item.stackId;
    if (!stackId) {
      visible.push(item);
      continue;
    }

    const stack = stackById.get(stackId);
    if (!stack) {
      visible.push(item);
      continue;
    }

    if (expandedStackIds.has(stackId)) {
      if (!emittedExpandedStacks.has(stackId)) {
        emittedExpandedStacks.add(stackId);
        for (const memberId of stack.memberMediaIds) {
          const member = mediaItems.find((entry) => entry.docId === memberId);
          if (member) visible.push(member);
        }
      }
      continue;
    }

    if (item.docId === stack.heroMediaId) {
      visible.push(item);
    }
  }

  return visible;
}

export function getStackDisplayMeta(
  media: Media,
  stackById: Map<string, MediaStack>,
  expandedStackIds: Set<string>
): MediaStackDisplayMeta | null {
  const stack = stackForMedia(media, stackById);
  if (!stack?.docId) return null;
  return {
    stack,
    memberCount: stack.memberMediaIds.length,
    isHero: media.docId === stack.heroMediaId,
    expanded: expandedStackIds.has(stack.docId),
  };
}

export function selectionEligibleForCreateStack(
  selectedIds: string[],
  mediaById: Map<string, Media>
): { ok: true; mediaIds: string[] } | { ok: false; reason: string } {
  const unique = [...new Set(selectedIds.filter(Boolean))];
  if (unique.length < 2) {
    return { ok: false, reason: 'Select at least two media items to create a stack.' };
  }
  const stacked = unique.filter((id) => mediaById.get(id)?.stackId);
  if (stacked.length > 0) {
    return { ok: false, reason: 'Unstack selected media before creating a new stack.' };
  }
  return { ok: true, mediaIds: unique };
}

export function resolveGalleryEntriesFromSelection(
  selectedIds: string[],
  mediaById: Map<string, Media>,
  stackById: Map<string, MediaStack>
): { mediaId: string; order: number; stackId?: string }[] {
  const seenStacks = new Set<string>();
  const entries: { mediaId: string; order: number; stackId?: string }[] = [];

  for (const mediaId of selectedIds) {
    const item = mediaById.get(mediaId);
    if (!item) continue;

    const stack = item.stackId ? stackById.get(item.stackId) : null;
    if (stack?.docId && stack.heroMediaId) {
      if (seenStacks.has(stack.docId)) continue;
      seenStacks.add(stack.docId);
      entries.push({
        mediaId: stack.heroMediaId,
        order: entries.length,
        stackId: stack.docId,
      });
      continue;
    }

    entries.push({ mediaId, order: entries.length });
  }

  return entries;
}
