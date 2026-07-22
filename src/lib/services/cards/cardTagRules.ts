import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

export function computeDimensionSortKeys(
  directTagIds: string[] | undefined,
  allTags: Tag[]
): Pick<Card, 'whoSortKey' | 'whatSortKey' | 'whereSortKey'> {
  const byId = new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));
  const buckets: Record<'who' | 'what' | 'where', string[]> = {
    who: [],
    what: [],
    where: [],
  };

  for (const tagId of directTagIds ?? []) {
    const tag = byId.get(tagId);
    if (!tag?.name || !tag.dimension) continue;
    const dimension = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
    if (dimension === 'who' || dimension === 'what' || dimension === 'where') {
      buckets[dimension].push(tag.name.trim().toLowerCase());
    }
  }

  const pick = (values: string[]) =>
    values.filter(Boolean).sort((a, b) => a.localeCompare(b))[0] || '\uffff';
  return {
    whoSortKey: pick(buckets.who),
    whatSortKey: pick(buckets.what),
    whereSortKey: pick(buckets.where),
  };
}
