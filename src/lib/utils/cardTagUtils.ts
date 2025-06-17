import { Tag } from '@/lib/types/tag';
import { getTags } from '@/lib/services/tagService';

/**
 * Organizes a flat list of card tag IDs into categories based on their dimension.
 * @param cardTagIds - An array of tag IDs associated with a card.
 * @returns A promise that resolves to an object with tags categorized by dimension.
 */
export async function organizeCardTags(cardTagIds: string[]): Promise<{ [key: string]: string[] }> {
  if (!cardTagIds || cardTagIds.length === 0) {
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

    for (const tagId of cardTagIds) {
      const tag = tagMap.get(tagId);
      if (tag && tag.dimension) {
        if (organizedTags.hasOwnProperty(tag.dimension)) {
          organizedTags[tag.dimension].push(tag.id);
        }
      }
    }

    return organizedTags;
  } catch (error) {
    console.error("Error organizing card tags:", error);
    // Return empty object on error to prevent form crashing
    return {};
  }
} 