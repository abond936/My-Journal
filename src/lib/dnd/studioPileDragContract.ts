export const STORY_PILE_UNSORTED_DROP_ID = 'pile:unsorted' as const;

export function storyPileDropId(clusterId: string): string {
  return `pile:${clusterId}`;
}

export function isStoryPileDropId(dropId: string): boolean {
  return dropId === STORY_PILE_UNSORTED_DROP_ID || dropId.startsWith('pile:');
}

/**
 * Returns target cluster id, or `null` when dropping on Unsorted (remove from all piles).
 */
export function parseStoryPileDropId(dropId: string): string | null | undefined {
  if (dropId === STORY_PILE_UNSORTED_DROP_ID) return null;
  if (!dropId.startsWith('pile:')) return undefined;
  const clusterId = dropId.slice('pile:'.length).trim();
  if (!clusterId || clusterId === 'unsorted') return undefined;
  return clusterId;
}
