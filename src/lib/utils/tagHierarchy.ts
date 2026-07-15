export type TagHierarchyNode = {
  docId?: string;
  parentId?: string | null;
};

export type TagPathMismatch = {
  tagId: string;
  actual: string[];
  expected: string[];
};

/** Canonical paths contain ancestors only, ordered root to direct parent. */
export function buildCanonicalTagPaths(tags: TagHierarchyNode[]): Map<string, string[]> {
  const byId = new Map<string, TagHierarchyNode>();
  for (const tag of tags) {
    if (!tag.docId) throw new Error('Tag hierarchy contains a tag without docId');
    if (byId.has(tag.docId)) throw new Error(`Duplicate tag id in hierarchy: ${tag.docId}`);
    byId.set(tag.docId, tag);
  }

  const paths = new Map<string, string[]>();
  const visiting = new Set<string>();
  const resolve = (tagId: string): string[] => {
    const cached = paths.get(tagId);
    if (cached) return cached;
    if (visiting.has(tagId)) throw new Error(`Cycle detected in tag hierarchy at ${tagId}`);
    const tag = byId.get(tagId);
    if (!tag) throw new Error(`Missing tag in hierarchy: ${tagId}`);
    visiting.add(tagId);
    let path: string[] = [];
    if (tag.parentId) {
      if (!byId.has(tag.parentId)) {
        throw new Error(`Tag ${tagId} references missing parent ${tag.parentId}`);
      }
      path = [...resolve(tag.parentId), tag.parentId];
    }
    visiting.delete(tagId);
    paths.set(tagId, path);
    return path;
  };

  for (const tagId of byId.keys()) resolve(tagId);
  return paths;
}

export function auditCanonicalTagPaths(
  tags: Array<TagHierarchyNode & { path?: string[] }>
): TagPathMismatch[] {
  const expectedPaths = buildCanonicalTagPaths(tags);
  return tags.flatMap((tag) => {
    const tagId = tag.docId!;
    const actual = Array.isArray(tag.path) ? tag.path : [];
    const expected = expectedPaths.get(tagId) ?? [];
    const matches = actual.length === expected.length && actual.every((id, i) => id === expected[i]);
    return matches ? [] : [{ tagId, actual, expected }];
  });
}

export function buildReparentedTagPaths(
  tags: TagHierarchyNode[],
  tagId: string,
  newParentId?: string
): Map<string, string[]> {
  if (!tags.some((tag) => tag.docId === tagId)) {
    throw new Error(`Cannot reparent missing tag ${tagId}`);
  }
  if (newParentId && !tags.some((tag) => tag.docId === newParentId)) {
    throw new Error(`Cannot reparent beneath missing tag ${newParentId}`);
  }
  return buildCanonicalTagPaths(
    tags.map((tag) => (tag.docId === tagId ? { ...tag, parentId: newParentId } : tag))
  );
}
