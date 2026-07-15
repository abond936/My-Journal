export type TagTreeNode = {
  docId?: string;
  parentId?: string | null;
};

const ROOT_PARENT_KEY = '__root__';

function parentKey(parentId: string | null | undefined): string {
  return parentId || ROOT_PARENT_KEY;
}

export function isRootParent(parentId: string | null | undefined): boolean {
  return !parentId;
}

export function buildTagChildrenByParent<T extends TagTreeNode>(tags: T[]): Map<string, string[]> {
  const childrenByParent = new Map<string, string[]>();

  for (const tag of tags) {
    if (!tag.docId) continue;
    const key = parentKey(tag.parentId);
    const children = childrenByParent.get(key) ?? [];
    children.push(tag.docId);
    childrenByParent.set(key, children);
  }

  return childrenByParent;
}

export function getTagPostOrder<T extends TagTreeNode>(tags: T[]): string[] {
  const childrenByParent = buildTagChildrenByParent(tags);
  const knownIds = new Set(tags.map((tag) => tag.docId).filter((id): id is string => Boolean(id)));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  const visit = (tagId: string) => {
    if (visited.has(tagId)) return;
    if (visiting.has(tagId)) {
      throw new Error(`Cycle detected in tag tree at tag ${tagId}`);
    }
    visiting.add(tagId);
    for (const childId of childrenByParent.get(tagId) ?? []) {
      visit(childId);
    }
    visiting.delete(tagId);
    visited.add(tagId);
    order.push(tagId);
  };

  for (const rootId of childrenByParent.get(ROOT_PARENT_KEY) ?? []) {
    visit(rootId);
  }

  // Guard against malformed records whose parent points at a missing tag.
  for (const tagId of knownIds) {
    visit(tagId);
  }

  return order;
}

export function assertCompleteTagTraversal<T extends TagTreeNode>(tags: T[], order: string[]): void {
  const expected = tags.filter((tag) => Boolean(tag.docId)).length;
  if (order.length !== expected) {
    throw new Error(`Tag traversal mismatch: processed ${order.length} of ${expected} tags`);
  }
}

export function computeHierarchicalUniqueIds<T extends TagTreeNode>(
  tags: T[],
  assignments: Array<{ objectId: string; tagIds: string[] }>
): Map<string, Set<string>> {
  const direct = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    for (const tagId of new Set(assignment.tagIds.filter(Boolean))) {
      const ids = direct.get(tagId) ?? new Set<string>();
      ids.add(assignment.objectId);
      direct.set(tagId, ids);
    }
  }
  const children = buildTagChildrenByParent(tags);
  const result = new Map<string, Set<string>>();
  for (const tagId of getTagPostOrder(tags)) {
    const ids = new Set(direct.get(tagId) ?? []);
    for (const childId of children.get(tagId) ?? []) {
      for (const objectId of result.get(childId) ?? []) ids.add(objectId);
    }
    result.set(tagId, ids);
  }
  return result;
}
