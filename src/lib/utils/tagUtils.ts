import { Tag } from '@/lib/types/tag';
import { TagWithChildren } from "@/components/providers/TagProvider";

/**
 * Builds a hierarchical tree of tags from a flat list.
 * This is the foundational function for all other tree-building utilities.
 * @param tags - A flat array of all tags.
 * @returns An array of root-level tags, each with a `children` array.
 */
export const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>();
  const rootTags: TagWithChildren[] = [];

  if (!Array.isArray(tags) || tags.length === 0) return [];

  const tagsCopy = JSON.parse(JSON.stringify(tags)) as Tag[];

  tagsCopy.forEach((tag: Tag) => {
    tagMap.set(tag.docId!, { ...tag, children: [] });
  });

  tagsCopy.forEach((tag: Tag) => {
    const tagNode = tagMap.get(tag.docId!);
    if (tagNode) {
      if (tag.parentId && tagMap.has(tag.parentId)) {
        const parentNode = tagMap.get(tag.parentId);
        parentNode?.children.push(tagNode);
      } else {
        rootTags.push(tagNode);
      }
    }
  });

  const sortTags = (tagNodes: TagWithChildren[]) => {
    tagNodes.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || (a.docId || '').localeCompare(b.docId || '')
    );
    tagNodes.forEach(t => sortTags(t.children));
  };

  sortTags(rootTags);
  return rootTags;
};

/**
 * [Core Utility] Groups a pre-built tag tree by dimension.
 * @param tree - A hierarchical array of `TagWithChildren`.
 * @returns A record where keys are dimensions and values are the corresponding tag trees.
 */
/** Maps legacy `reflection` and unknown dims to the four card dimensions used in UI trees. */
export function normalizeTagDimensionKey(
  dimension: string | undefined
): 'who' | 'what' | 'when' | 'where' | undefined {
  if (!dimension) return undefined;
  const d = String(dimension);
  if (d === 'reflection') return 'what';
  if (d === 'who' || d === 'what' || d === 'when' || d === 'where') return d;
  return undefined;
}

const groupTreeByDimension = (tree: TagWithChildren[]): Record<string, TagWithChildren[]> => {
  const dimensionMap: Record<string, TagWithChildren[]> = {
    who: [],
    what: [],
    when: [],
    where: [],
  };

  tree.forEach(rootNode => {
    const normalized = normalizeTagDimensionKey(rootNode.dimension as string | undefined);
    if (normalized) {
      dimensionMap[normalized].push(rootNode);
    }
  });

  return dimensionMap;
};

/**
 * [For UI Selectors] Builds a map of tags grouped by dimension.
 * Useful for creating separate dropdowns for 'who', 'what', etc.
 * @param tags - A flat array of all tags.
 * @returns An object where keys are dimensions and values are the corresponding tag trees.
 */
export const buildDimensionTree = (tags: Tag[]): Record<string, TagWithChildren[]> => {
  const tree = buildTagTree(tags || []);
  return groupTreeByDimension(tree);
};

/**
 * [For UI Tree View] Builds a hierarchical tag tree where top-level nodes are the dimensions themselves.
 * Useful for rendering a single, comprehensive tree view with dimensions as roots.
 * @param tags - A flat array of all tags from the database.
 * @returns An array of "dimension" tags (Who, What, etc.), each containing its respective tag tree.
 */
export const createUITreeFromDimensions = (tags: Tag[]): TagWithChildren[] => {
  if (!tags || tags.length === 0) return [];

  const dimensionalMap = buildDimensionTree(tags);
  
  const dimensions: Record<string, TagWithChildren> = {
    who: { docId: 'dim-who', name: 'Who', children: dimensionalMap.who, dimension: 'who' },
    what: { docId: 'dim-what', name: 'What', children: dimensionalMap.what, dimension: 'what' },
    when: { docId: 'dim-when', name: 'When', children: dimensionalMap.when, dimension: 'when' },
    where: { docId: 'dim-where', name: 'Where', children: dimensionalMap.where, dimension: 'where' },
  };
  
  return Object.values(dimensions);
};

/**
 * Gets the set of tag IDs that should be expanded by default.
 * A tag is expanded if it has children and defaultExpanded !== false.
 * @param tree - The tag tree
 * @returns Set of tag IDs to expand initially
 */
export const getAllExpandableTagIds = (tree: TagWithChildren[]): Set<string> => {
  const expanded = new Set<string>();
  const traverse = (nodes: TagWithChildren[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        expanded.add(node.docId!);
        traverse(node.children);
      }
    });
  };
  traverse(tree);
  return expanded;
};

export const getDefaultExpandedTagIds = (tree: TagWithChildren[]): Set<string> => {
  const expanded = new Set<string>();
  const traverse = (nodes: TagWithChildren[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        if (node.defaultExpanded !== false) {
          expanded.add(node.docId!);
          traverse(node.children);
        }
      }
    });
  };
  traverse(tree);
  return expanded;
};

/**
 * Filters a tag tree by search term. Keeps nodes that match or have matching descendants.
 * @param node - A tag node with children
 * @param search - Search string (case-insensitive match on tag name)
 * @returns Filtered node or null if no match in this branch
 */
export const filterTreeBySearch = (
  node: TagWithChildren,
  search: string
): TagWithChildren | null => {
  const searchLower = search?.trim().toLowerCase() ?? '';
  const selfMatches =
    !searchLower || (node.name?.toLowerCase().includes(searchLower) ?? false);
  // When this node matches, keep the full subtree so descendants (e.g. Bond under Ancestry) stay visible.
  if (selfMatches) {
    return { ...node, children: node.children };
  }
  const childResults = node.children
    .map((c) => filterTreeBySearch(c, search))
    .filter((r): r is TagWithChildren => r !== null);
  if (childResults.length > 0) {
    return { ...node, children: childResults };
  }
  return null;
};

/**
 * Filters an array of tag trees by search term.
 */
export const filterTreesBySearch = (
  trees: TagWithChildren[],
  search: string
): TagWithChildren[] => {
  const searchTrimmed = search?.trim() ?? '';
  if (!searchTrimmed) return trees;
  return trees
    .map((root) => filterTreeBySearch(root, searchTrimmed))
    .filter((r): r is TagWithChildren => r !== null);
};

/**
 * Builds a partial tag tree containing only the specified tags and their direct parents.
 * @param allTags - A flat array of all tags.
 * @param selectedTagIds - An array of IDs for the tags that should be included in the tree.
 * @returns An array of `TagWithChildren` representing the root nodes of the sparse tree.
 */
export const buildSparseTagTree = (allTags: Tag[], selectedTagIds: string[]): TagWithChildren[] => {
  if (!allTags || !selectedTagIds || selectedTagIds.length === 0) {
    return [];
  }

  const tagMap = new Map<string, Tag>();
  allTags.forEach(tag => tagMap.set(tag.docId!, tag));

  const includedTags = new Map<string, Tag>();

  // Add all selected tags and their ancestors to the `includedTags` map
  selectedTagIds.forEach(id => {
    let currentTag = tagMap.get(id);
    while (currentTag) {
      if (includedTags.has(currentTag.docId!)) break; // Stop if we've already processed this branch
      includedTags.set(currentTag.docId!, currentTag);
      currentTag = currentTag.parentId ? tagMap.get(currentTag.parentId) : undefined;
    }
  });

  // Now, build a tree from only the included tags
  return buildTagTree(Array.from(includedTags.values()));
};

export const DIMENSION_KEYS = ['who', 'what', 'when', 'where'] as const;

export type DimensionalTagIdMap = Partial<Record<(typeof DIMENSION_KEYS)[number], string[]>>;

const EMPTY_DIMENSIONAL_MAP: DimensionalTagIdMap = {};

/**
 * Maps sidebar / global selected tag ids into per-dimension id lists (same grouping as CardProvider → /api/cards).
 * Tags without a known dimension are ignored. Returns a stable empty singleton when nothing applies.
 */
export function groupSelectedTagIdsByDimension(
  selectedTagIds: string[],
  allTags: Tag[]
): DimensionalTagIdMap {
  if (!selectedTagIds.length) return EMPTY_DIMENSIONAL_MAP;

  const out: DimensionalTagIdMap = {};
  const dimSet = new Set<string>(DIMENSION_KEYS);

  for (const tagId of selectedTagIds) {
    const tag = allTags.find((t) => t.docId === tagId);
    if (!tag?.docId || !tag.dimension) continue;
    const normalized =
      String(tag.dimension) === 'reflection' ? 'what' : tag.dimension;
    if (dimSet.has(normalized)) {
      const d = normalized as (typeof DIMENSION_KEYS)[number];
      if (!out[d]) out[d] = [];
      out[d]!.push(tag.docId);
    }
  }

  return Object.keys(out).length > 0 ? out : EMPTY_DIMENSIONAL_MAP;
}

/** Append who/what/when/where query params (comma-separated ids) when non-empty. */
export function appendDimensionalTagQueryParams(
  dimensional: DimensionalTagIdMap,
  params: URLSearchParams
): void {
  for (const key of DIMENSION_KEYS) {
    const ids = dimensional[key];
    if (ids?.length) params.set(key, ids.join(','));
  }
}

/** Union tag ids per dimension (OR within dimension). Combine with API semantics: AND across dimensions. */
export function mergeDimensionalTagMaps(
  ...maps: DimensionalTagIdMap[]
): DimensionalTagIdMap {
  const out: DimensionalTagIdMap = {};
  for (const key of DIMENSION_KEYS) {
    const set = new Set<string>();
    for (const m of maps) {
      for (const id of m[key] ?? []) set.add(id);
    }
    if (set.size) out[key] = [...set];
  }
  return Object.keys(out).length > 0 ? out : EMPTY_DIMENSIONAL_MAP;
}

/** Parse dimensional tag filters from request search params (same shape as GET /api/cards). */
export function parseDimensionalTagParamsFromSearchParams(
  searchParams: URLSearchParams
): DimensionalTagIdMap {
  const out: DimensionalTagIdMap = {};
  for (const key of DIMENSION_KEYS) {
    const raw = searchParams.get(key);
    const ids = raw?.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids?.length) out[key] = ids;
  }
  return Object.keys(out).length > 0 ? out : EMPTY_DIMENSIONAL_MAP;
}

export function dimensionalTagMapHasFilters(map: DimensionalTagIdMap): boolean {
  return DIMENSION_KEYS.some((k) => (map[k]?.length ?? 0) > 0);
}

/** Flatten a dimensional map to tag id list (for MacroTagSelector / UI round-trip). */
export function flattenDimensionalTagMapToTagIds(m: DimensionalTagIdMap): string[] {
  const ids: string[] = [];
  for (const k of DIMENSION_KEYS) {
    for (const id of m[k] ?? []) {
      if (id) ids.push(id);
    }
  }
  return ids;
} 
