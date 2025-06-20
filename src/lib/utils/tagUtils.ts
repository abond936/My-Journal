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
 * Builds a hierarchical tag tree and then groups the top-level tags by their 'dimension'.
 * @param tags - A flat array of all tags from the database.
 * @returns An array of "dimension" tags (Who, What, When, etc.), each containing its respective tag tree.
 */
export const buildDimensionalTagTree = (tags: Tag[]): TagWithChildren[] => {
  if (!tags || tags.length === 0) return [];

  // First, build the standard hierarchical tree from the flat list
  const masterTagTree = buildTagTree(tags);
  
  // Define the dimension containers
  const dimensions: Record<string, TagWithChildren> = {
    who: { id: 'dim-who', name: 'Who', children: [], dimension: 'who' },
    what: { id: 'dim-what', name: 'What', children: [], dimension: 'what' },
    when: { id: 'dim-when', name: 'When', children: [], dimension: 'when' },
    where: { id: 'dim-where', name: 'Where', children: [], dimension: 'where' },
    reflection: { id: 'dim-reflection', name: 'Reflection', children: [], dimension: 'reflection' },
  };
  const uncategorized: TagWithChildren = { id: 'dim-uncategorized', name: 'Uncategorized', children: [] };

  //- Distribute the top-level tags from the master tree into the dimension containers
  masterTagTree.forEach(rootNode => {
    if (rootNode.dimension && dimensions[rootNode.dimension]) {
      dimensions[rootNode.dimension].children.push(rootNode);
    } else {
      uncategorized.children.push(rootNode);
    }
  });

  const result = Object.values(dimensions);
  if (uncategorized.children.length > 0) {
    result.push(uncategorized);
  }
  
  return result;
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