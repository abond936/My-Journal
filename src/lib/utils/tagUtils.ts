import { Tag } from '@/lib/types/tag';
import { getTags } from '@/lib/services/tagService';
import { TagWithChildren } from "@/components/providers/TagProvider";

/**
 * Organizes a flat list of entry tag IDs into categories based on their dimension.
 * @param entryTagIds - An array of tag IDs associated with an entry.
 * @returns A promise that resolves to an object with tags categorized by dimension.
 */
export async function organizeEntryTags(entryTagIds: string[]): Promise<{ [key: string]: string[] }> {
  if (!entryTagIds || entryTagIds.length === 0) {
    return {};
  }

  try {
    const allTags: Tag[] = await getTags();
    const organizedTags: { [key: string]: string[] } = {
        who: [],
        what: [],
        when: [],
        where: [],
        reflection: []
    };

    const tagMap = new Map(allTags.map(tag => [tag.id, tag]));

    for (const tagId of entryTagIds) {
      const tag = tagMap.get(tagId);
      if (tag && tag.dimension) {
        if (organizedTags.hasOwnProperty(tag.dimension)) {
          organizedTags[tag.dimension].push(tag.id);
        }
      }
    }

    return organizedTags;
  } catch (error) {
    console.error("Error organizing entry tags:", error);
    // Return empty object on error to prevent form crashing
    return {};
  }
}

/**
 * Builds a hierarchical tree of tags from a flat list.
 * This is the foundational function for all other tree-building utilities.
 * @param tags - A flat array of all tags.
 * @returns An array of root-level tags, each with a `children` array.
 */
export const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>();
  const rootTags: TagWithChildren[] = [];

  if (!tags) return [];
  
  const tagsCopy = JSON.parse(JSON.stringify(tags));

  tagsCopy.forEach((tag: Tag) => {
    tagMap.set(tag.id, { ...tag, children: [] });
  });

  tagsCopy.forEach((tag: Tag) => {
    const tagNode = tagMap.get(tag.id);
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
    tagNodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
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
const groupTreeByDimension = (tree: TagWithChildren[]): Record<string, TagWithChildren[]> => {
  const dimensionMap: Record<string, TagWithChildren[]> = {
    who: [], what: [], when: [], where: [], reflection: [],
  };

  tree.forEach(rootNode => {
    const dimension = rootNode.dimension;
    if (dimension && dimensionMap.hasOwnProperty(dimension)) {
      dimensionMap[dimension].push(rootNode);
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
    who: { id: 'dim-who', name: 'Who', children: dimensionalMap.who, dimension: 'who' },
    what: { id: 'dim-what', name: 'What', children: dimensionalMap.what, dimension: 'what' },
    when: { id: 'dim-when', name: 'When', children: dimensionalMap.when, dimension: 'when' },
    where: { id: 'dim-where', name: 'Where', children: dimensionalMap.where, dimension: 'where' },
    reflection: { id: 'dim-reflection', name: 'Reflection', children: dimensionalMap.reflection, dimension: 'reflection' },
  };
  
  return Object.values(dimensions);
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
  allTags.forEach(tag => tagMap.set(tag.id, tag));

  const includedTags = new Map<string, Tag>();

  // Add all selected tags and their ancestors to the `includedTags` map
  selectedTagIds.forEach(id => {
    let currentTag = tagMap.get(id);
    while (currentTag) {
      if (includedTags.has(currentTag.id)) break; // Stop if we've already processed this branch
      includedTags.set(currentTag.id, currentTag);
      currentTag = currentTag.parentId ? tagMap.get(currentTag.parentId) : undefined;
    }
  });

  // Now, build a tree from only the included tags
  return buildTagTree(Array.from(includedTags.values()));
}; 