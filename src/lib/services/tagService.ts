// This file is now a CLIENT-SIDE service.
// It is responsible for making fetch requests to the API routes.
// It should NEVER import 'firebase-admin' or other server-side code.

import { Tag } from '@/lib/types/tag';

/**
 * Fetches all tags from the API.
 * @returns {Promise<Tag[]>} A promise that resolves to an array of tags.
 */
export async function getTags(): Promise<Tag[]> {
  const response = await fetch('/api/tags');
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  const tags = await response.json();
  // Convert date strings back to Date objects
  return tags.map((tag: any) => ({
    ...tag,
    createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined,
    updatedAt: tag.updatedAt ? new Date(tag.updatedAt) : undefined,
  }));
}

/**
 * Fetches a single tag by its ID from the API.
 * @param {string} id - The ID of the tag to fetch.
 * @returns {Promise<Tag | null>} A promise that resolves to the tag or null if not found.
 */
export async function getTagById(id: string): Promise<Tag | null> {
  if (!id) return null;
  const response = await fetch(`/api/tags/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch tag ${id}`);
  }
  const tag = await response.json();
  return {
    ...tag,
    createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined,
    updatedAt: tag.updatedAt ? new Date(tag.updatedAt) : undefined,
  };
}

/**
 * Creates a new tag via the API.
 * @param {Omit<Tag, 'id'>} tagData - The data for the new tag.
 * @returns {Promise<Tag>} A promise that resolves to the newly created tag.
 */
export async function createTag(tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
  const response = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tagData),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create tag: ${errorBody}`);
  }
  return response.json();
}

/**
 * Updates an existing tag via the API.
 * @param {string} id - The ID of the tag to update.
 * @param {Partial<Tag>} tagData - The data to update.
 * @returns {Promise<Tag>} A promise that resolves to the updated tag.
 */
export async function updateTag(id: string, tagData: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<Tag> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tagData),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update tag ${id}: ${errorBody}`);
  }
  return response.json();
}

/**
 * Deletes a tag via the API.
 * @param {string} id - The ID of the tag to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete tag ${id}: ${errorBody}`);
  }
}

// These functions below don't make sense as client-side service functions
// as they require fetching all tags first. This logic should live in components
// that already have the tags or be handled by a more specific API endpoint if needed.
// I'm commenting them out to complete the refactor.

// export async function getTagsByDimension(): Promise<Record<Tag['dimension'], Tag[]>> {
//   const tags = await getTags();
//   const tagsByDimension: Record<Tag['dimension'], Tag[]> = {
//     who: [],
//     what: [],
//     when: [],
//     where: [],
//     reflection: []
//   };

//   tags.forEach(tag => {
//     if (tag.dimension in tagsByDimension) {
//       tagsByDimension[tag.dimension].push(tag);
//     }
//   });

//   return tagsByDimension;
// }

// export async function organizeEntryTags(entryTags: string[]): Promise<{
//   who: string[];
//   what: string[];
//   when: string[];
//   where: string[];
//   reflection: string[];
// }> {
//   const tags = await getTags();
//   const organizedTags = {
//     who: [] as string[],
//     what: [] as string[],
//     when: [] as string[],
//     where: [] as string[],
//     reflection: [] as string[]
//   };

//   entryTags.forEach(tagId => {
//     const tag = tags.find(t => t.id === tagId);
//     if (tag && tag.dimension in organizedTags) {
//       organizedTags[tag.dimension].push(tagId);
//     }
//   });

//   return organizedTags;
// } 