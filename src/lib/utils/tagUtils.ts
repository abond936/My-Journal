import { Tag } from '@/lib/types/tag';
import { getTags } from '@/lib/services/tagService';

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