import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

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
 * Calculates all ancestor paths for a given list of tag IDs using server-side data.
 * @param tagIds The list of tag IDs to find paths for.
 * @returns A promise that resolves to an array of string arrays, where each inner array is an ordered path.
 */
export async function getTagPaths(tagIds: string[]): Promise<string[][]> {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  const allTags = await getAllTags();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag]));
  const paths: string[][] = [];

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
    paths.push(findPath(tagId));
  }

  return paths;
} 