import type { Tag } from '@/lib/types/tag';
import { buildReparentedTagPaths } from '@/lib/utils/tagHierarchy';
import { buildCanonicalTagPaths } from '@/lib/utils/tagHierarchy';

export type TagHierarchyMutation =
  | { kind: 'rename'; tagId: string; name: string }
  | { kind: 'reparent'; tagId: string; newParentId?: string }
  | { kind: 'remove'; tagId: string; promoteChildren: true }
  | { kind: 'merge'; tagId: string; targetTagId: string }
  | { kind: 'cleanup'; tagId: string; reparentByTagId: Record<string, string | undefined>; removeTagIds: string[] };

function normalizeName(name: string): string {
  const value = name.trim();
  if (!value) throw new Error('Tag name is required');
  return value;
}

function assertUniqueName(tags: Tag[], tagId: string, name: string, parentId: string | undefined, dimension: Tag['dimension']) {
  const normalized = name.toLocaleLowerCase();
  const duplicate = tags.some((tag) => {
    if (tag.docId === tagId || tag.name.trim().toLocaleLowerCase() !== normalized) return false;
    if (parentId) return tag.parentId === parentId;
    return !tag.parentId && tag.dimension === dimension;
  });
  if (duplicate) throw new Error('Tag with this name already exists');
}

export function buildMutatedTagCatalog(tags: Tag[], mutation: TagHierarchyMutation): Tag[] {
  if (mutation.kind === 'cleanup') {
    const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
    const removeIds = new Set(mutation.removeTagIds);
    for (const tagId of removeIds) if (!byId.has(tagId)) throw new Error(`Cleanup tag ${tagId} not found`);
    for (const [tagId, parentId] of Object.entries(mutation.reparentByTagId)) {
      const tag = byId.get(tagId);
      const parent = parentId ? byId.get(parentId) : undefined;
      if (!tag) throw new Error(`Cleanup reparent tag ${tagId} not found`);
      if (parentId && (!parent || removeIds.has(parentId))) throw new Error(`Cleanup parent ${parentId} is unavailable`);
      if (parent && parent.dimension !== tag.dimension) throw new Error('Cannot move a tag beneath a different dimension');
    }
    const nearestSurvivingParent = (parentId: string | undefined): string | undefined => {
      let current = parentId;
      const visited = new Set<string>();
      while (current && removeIds.has(current)) {
        if (visited.has(current)) throw new Error('Cycle detected while promoting cleanup children');
        visited.add(current);
        current = byId.get(current)?.parentId;
      }
      return current;
    };
    const cleaned = tags.filter((tag) => tag.docId && !removeIds.has(tag.docId)).map((tag) => ({
      ...tag,
      parentId: Object.prototype.hasOwnProperty.call(mutation.reparentByTagId, tag.docId!)
        ? mutation.reparentByTagId[tag.docId!]
        : nearestSurvivingParent(tag.parentId),
    }));
    const paths = buildCanonicalTagPaths(cleaned);
    return cleaned.map((tag) => ({ ...tag, path: paths.get(tag.docId!) ?? [] }));
  }
  const current = tags.find((tag) => tag.docId === mutation.tagId);
  if (!current) throw new Error(`Tag with ID ${mutation.tagId} not found`);

  if (mutation.kind === 'rename') {
    const name = normalizeName(mutation.name);
    assertUniqueName(tags, mutation.tagId, name, current.parentId, current.dimension);
    return tags.map((tag) => tag.docId === mutation.tagId ? { ...tag, name } : tag);
  }

  if (mutation.kind === 'remove') {
    const withoutRemoved = tags
      .filter((tag) => tag.docId !== mutation.tagId)
      .map((tag) => tag.parentId === mutation.tagId ? { ...tag, parentId: current.parentId } : { ...tag });
    const paths = buildCanonicalTagPaths(withoutRemoved);
    return withoutRemoved.map((tag) => ({
      ...tag,
      path: tag.docId ? paths.get(tag.docId) ?? [] : tag.path,
    }));
  }

  if (mutation.kind === 'merge') {
    if (mutation.targetTagId === mutation.tagId) throw new Error('Cannot merge a tag into itself');
    const target = tags.find((tag) => tag.docId === mutation.targetTagId);
    if (!target) throw new Error('Merge target tag not found');
    if (target.dimension !== current.dimension) throw new Error('Cannot merge tags across dimensions');
    if ((target.path ?? []).includes(mutation.tagId)) {
      throw new Error('Cannot merge a tag into one of its descendants');
    }
    const merged = tags
      .filter((tag) => tag.docId !== mutation.tagId)
      .map((tag) => tag.parentId === mutation.tagId ? { ...tag, parentId: mutation.targetTagId } : { ...tag });
    const paths = buildCanonicalTagPaths(merged);
    return merged.map((tag) => ({ ...tag, path: tag.docId ? paths.get(tag.docId) ?? [] : tag.path }));
  }

  const parent = mutation.newParentId
    ? tags.find((tag) => tag.docId === mutation.newParentId)
    : undefined;
  if (mutation.newParentId && !parent) throw new Error('Parent tag not found');
  if (parent && parent.dimension !== current.dimension) {
    throw new Error('Cannot move a tag beneath a different dimension');
  }
  const paths = buildReparentedTagPaths(tags, mutation.tagId, mutation.newParentId);
  return tags.map((tag) => ({
    ...tag,
    ...(tag.docId === mutation.tagId ? { parentId: mutation.newParentId } : {}),
    path: tag.docId ? paths.get(tag.docId) ?? [] : tag.path,
  }));
}
