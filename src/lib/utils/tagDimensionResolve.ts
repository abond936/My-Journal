import type { OrganizedTags, Tag } from '@/lib/types/tag';
import { normalizeTagDimensionKey } from '@/lib/utils/tagUtils';
import type { TagDimension } from '@/lib/utils/tagDisplay';

export function buildTagByIdMap(tags: Tag[]): Map<string, Tag> {
  const m = new Map<string, Tag>();
  for (const t of tags) {
    if (t.docId) m.set(t.docId, t);
  }
  return m;
}

/**
 * Resolves a tag's card dimension by walking ancestors until a node declares who/what/when/where.
 */
export function resolveTagDimension(
  tagId: string,
  tagById: Map<string, Tag>
): TagDimension | undefined {
  const visited = new Set<string>();
  let current = tagById.get(tagId);
  while (current?.docId && !visited.has(current.docId)) {
    visited.add(current.docId);
    const dim = normalizeTagDimensionKey(current.dimension as string | undefined);
    if (dim) return dim;
    if (!current.parentId) break;
    current = tagById.get(current.parentId);
  }
  return undefined;
}

/** Map every tag id to its resolved dimension (undefined if no dimension in ancestry). */
export function buildResolvedTagDimensionMap(allTags: Tag[]): Map<string, TagDimension | undefined> {
  const tagById = buildTagByIdMap(allTags);
  const map = new Map<string, TagDimension | undefined>();
  for (const t of allTags) {
    if (!t.docId) continue;
    map.set(t.docId, resolveTagDimension(t.docId, tagById));
  }
  return map;
}

/** Path display: "Parent / … / Leaf" using tag names from `path` + self. */
export function getTagPathDisplay(tag: Tag, tagById: Map<string, Tag>): string {
  if (!tag.docId) return tag.name;
  const ids = [...(tag.path || []), tag.docId];
  const names = ids
    .map((id) => tagById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length ? names.join(' / ') : tag.name;
}

/**
 * Direct dimensional assignments derived only from `tags[]` and each tag's resolved dimension
 * (walk ancestors). Use when UI mutates `tags` without yet refreshing denormalized `who`/`what`/etc.
 */
export function getCoreTagsByDimensionFromTagIds(
  tagIds: string[] | undefined,
  resolved: Map<string, TagDimension | undefined>
): OrganizedTags {
  const out: OrganizedTags = { who: [], what: [], when: [], where: [] };
  for (const id of tagIds || []) {
    const d = resolved.get(id);
    if (d === 'who') out.who.push(id);
    else if (d === 'what') out.what.push(id);
    else if (d === 'when') out.when.push(id);
    else if (d === 'where') out.where.push(id);
  }
  return out;
}
