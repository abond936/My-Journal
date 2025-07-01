import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag, OrganizedTags } from '@/lib/types/tag';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';

/**
 * Fetches all tags directly from Firestore.
 * This is a server-side function.
 * @returns A promise that resolves to an array of all tags.
 */
async function getAllTags(): Promise<Tag[]> {
  const snapshot = await firestore.collection(TAGS_COLLECTION).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => doc.data() as Tag);
}

/**
 * Organizes a list of tag IDs by their dimensions using server-side data.
 * This function uses Firebase Admin SDK directly and should be used for server-side operations.
 * @param tagIds The list of tag IDs to organize by dimension.
 * @returns A promise that resolves to an object with tags categorized by dimension.
 */
export async function organizeTagsByDimension(tagIds: string[]): Promise<OrganizedTags> {
  if (!tagIds || tagIds.length === 0) {
    return {
      who: [],
      what: [],
      when: [],
      where: [],
      reflection: []
    };
  }

  try {
    const allTags = await getAllTags();
    const organizedTags: OrganizedTags = {
      who: [],
      what: [],
      when: [],
      where: [],
      reflection: []
    };

    const tagMap = new Map(allTags.map(tag => [tag.id, tag]));

    for (const tagId of tagIds) {
      const tag = tagMap.get(tagId);
      if (tag && tag.dimension) {
        if (organizedTags.hasOwnProperty(tag.dimension)) {
          organizedTags[tag.dimension].push(tag.id);
        }
      }
    }

    return organizedTags;
  } catch (error) {
    console.error("Error organizing tags by dimension:", error);
    // Return empty organized tags on error to prevent crashes
    return {
      who: [],
      what: [],
      when: [],
      where: [],
      reflection: []
    };
  }
}

/**
 * Calculates all ancestor tags for a given list of tag IDs using server-side data.
 * @param tagIds The list of tag IDs to find ancestors for.
 * @returns A promise that resolves to an array of unique ancestor tag IDs.
 */
export async function getTagAncestors(tagIds: string[]): Promise<string[]> {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  const allTags = await getAllTags();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag]));
  const ancestors = new Set<string>();

  const findAncestors = (tagId: string) => {
    const tag = tagMap.get(tagId);
    if (tag?.parentId) {
      ancestors.add(tag.parentId);
      findAncestors(tag.parentId);
    }
  };

  for (const tagId of tagIds) {
    findAncestors(tagId);
  }

  return Array.from(ancestors);
}

/**
 * Calculates all ancestor paths for a given list of tag IDs and returns them as a map.
 * @param tagIds The list of tag IDs to find paths for.
 * @returns A promise that resolves to a map where keys are concatenated path strings.
 */
export async function getTagPathsMap(tagIds: string[]): Promise<Record<string, boolean>> {
  if (!tagIds || tagIds.length === 0) {
    return {};
  }

  const allTags = await getAllTags();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag]));
  const pathsMap: Record<string, boolean> = {};

  const findPath = (tagId: string): string[] => {
    const path: string[] = [];
    let currentTag = tagMap.get(tagId);
    while (currentTag) {
      path.unshift(currentTag.id);
      currentTag = currentTag.parentId ? tagMap.get(currentTag.parentId) : undefined;
    }
    return path;
  };

  for (const tagId of tagIds) {
    const pathArray = findPath(tagId);
    if (pathArray.length > 0) {
      const pathString = pathArray.join('_');
      pathsMap[pathString] = true;
    }
  }

  return pathsMap;
} 