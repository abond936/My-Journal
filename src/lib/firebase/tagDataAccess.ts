import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag, OrganizedTags } from '@/lib/types/tag';
import { FieldValue } from 'firebase-admin/firestore';

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

/**
 * Centralized function to calculate all derived tag data for a card.
 * This consolidates the duplicate logic currently scattered across cardService.ts.
 * 
 * @param directTagIds - The tag IDs directly assigned to the card
 * @returns Promise resolving to all derived tag data
 */
export async function calculateDerivedTagData(directTagIds: string[]): Promise<{
  filterTags: Record<string, boolean>;
  dimensionalTags: OrganizedTags;
}> {
  if (!directTagIds || directTagIds.length === 0) {
    return {
      filterTags: {},
      dimensionalTags: { who: [], what: [], when: [], where: [], reflection: [] }
    };
  }

  try {
    // Get ancestor tags
    const ancestorTags = await getTagAncestors(directTagIds);

    // Combine direct tags with ancestors for filterTags
    const inheritedTags = [...new Set([...directTagIds, ...ancestorTags])];

    // Create filterTags map for efficient queries
    const filterTags = inheritedTags.reduce((acc, tagId) => {
      acc[tagId] = true;
      return acc;
    }, {} as Record<string, boolean>);

    // Organize both direct and inherited tags by dimension
    const dimensionalTags = await organizeTagsByDimension(inheritedTags);

    return {
      filterTags,
      dimensionalTags
    };
  } catch (error) {
    console.error('Error calculating derived tag data:', error);
    throw new Error(`Failed to calculate derived tag data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Finds all cards that use a specific tag (directly or via inheritance).
 * Used when a tag's dimension or hierarchy changes.
 * 
 * @param tagId - The tag ID to search for
 * @returns Promise resolving to array of card IDs that use this tag
 */
export async function findCardsUsingTag(tagId: string): Promise<string[]> {
  try {
    // Query cards that have this tag in their filterTags
    const snapshot = await firestore.collection('cards')
      .where(`filterTags.${tagId}`, '==', true)
      .get();

    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error(`Error finding cards using tag ${tagId}:`, error);
    return [];
  }
}

/**
 * Updates all cards when a tag's dimension or hierarchy changes.
 * This ensures data consistency across the entire system.
 * 
 * @param tagId - The tag ID that changed
 * @returns Promise resolving when all updates are complete
 */
export async function updateCardsForTagChange(tagId: string): Promise<void> {
  try {
    console.log(`🔄 Updating cards for tag change: ${tagId}`);
    
    // Find all cards that use this tag
    const affectedCardIds = await findCardsUsingTag(tagId);
    
    if (affectedCardIds.length === 0) {
      console.log(`✅ No cards found using tag ${tagId}`);
      return;
    }

    console.log(`📝 Found ${affectedCardIds.length} cards to update`);

    // Process cards in batches to avoid memory issues
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < affectedCardIds.length; i += batchSize) {
      batches.push(affectedCardIds.slice(i, i + batchSize));
    }

    let updatedCount = 0;

    for (const batch of batches) {
      const batchPromises = batch.map(async (cardId) => {
        try {
          // Get the card's current direct tags
          const cardDoc = await firestore.collection('cards').doc(cardId).get();
          if (!cardDoc.exists) {
            console.warn(`⚠️ Card ${cardId} not found, skipping`);
            return;
          }

          const cardData = cardDoc.data();
          const directTags = cardData?.tags || [];

          // Recalculate derived data using the centralized function
          const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags);

          // Update the card
          await firestore.collection('cards').doc(cardId).update({
            filterTags,
            who: dimensionalTags.who,
            what: dimensionalTags.what,
            when: dimensionalTags.when,
            where: dimensionalTags.where,
            reflection: dimensionalTags.reflection,
            updatedAt: Date.now()
          });

          updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating card ${cardId}:`, error);
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`✅ Successfully updated ${updatedCount} cards for tag ${tagId}`);
  } catch (error) {
    console.error(`❌ Error updating cards for tag ${tagId}:`, error);
    throw error;
  }
}

/**
 * Creates a new tag, inheriting dimension from parent if applicable.
 * @param tagData The tag data to create
 * @returns Promise resolving to the created tag
 */
export async function createTag(tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'path'>): Promise<Tag> {
  try {
    const newPath: string[] = [];
    
    // If tag has a parent, build its path and inherit its dimension.
    if (tagData.parentId) {
      const parentDoc = await firestore.collection(TAGS_COLLECTION).doc(tagData.parentId).get();
      if (parentDoc.exists) {
        const parentData = parentDoc.data() as Tag;
        // Inherit dimension if not specified
        if (!tagData.dimension && parentData.dimension) {
          tagData.dimension = parentData.dimension;
        }
        // Build the new path from the parent's path
        if (parentData.path) {
          newPath.push(...parentData.path);
        }
        newPath.push(parentData.id); // Add the parent itself to the path
      }
    }

    // Create the tag
    const tagRef = firestore.collection(TAGS_COLLECTION).doc();
    const now = new Date();
    
    const newTag: Omit<Tag, 'id'> & { id: string } = {
      id: tagRef.id,
      ...tagData,
      path: newPath, // Save the calculated path
      cardCount: 0, // Ensure new tags start with a count of 0
      createdAt: now,
      updatedAt: now
    };

    await tagRef.set(newTag);
    return newTag as Tag;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw new Error(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Atomically updates the card counts for a given set of tags and all their ancestors.
 * This function is designed to be run inside a transaction.
 * @param tagIds The IDs of the tags whose counts need to be adjusted.
 * @param direction The direction of the adjustment: 'increment' or 'decrement'.
 * @param transaction The Firestore transaction to perform the updates in.
 */
export async function updateTagCounts(tagIds: string[], direction: 'increment' | 'decrement', transaction: FirebaseFirestore.Transaction) {
  if (!tagIds || tagIds.length === 0) {
    return;
  }

  // Use the transaction to get the tag documents.
  const tagRefs = tagIds.map(id => firestore.collection('tags').doc(id));
  const tagDocs = await transaction.getAll(...tagRefs);
  
  const allAncestorIds = new Set<string>();

  for (const doc of tagDocs) {
    if (doc.exists) {
      const tag = doc.data() as Tag;
      // Use the pre-calculated path to find all ancestors.
      if (tag.path) {
        tag.path.forEach(ancestorId => allAncestorIds.add(ancestorId));
      }
    }
  }

  // Combine the direct tags and all their unique ancestors into one list.
  const allIdsToUpdate = [...new Set([...tagIds, ...Array.from(allAncestorIds)])];
  const amount = direction === 'increment' ? 1 : -1;

  // Perform atomic updates for every affected tag.
  for (const tagId of allIdsToUpdate) {
    const tagRef = firestore.collection('tags').doc(tagId);
    transaction.update(tagRef, { cardCount: FieldValue.increment(amount) });
  }
}

/**
 * Calculates and updates the cardCount for a specific tag.
 * cardCount = direct assignments + sum of immediate children's cardCounts
 * 
 * @param tagId - The ID of the tag to update
 * @returns Promise resolving to the new count
 */
export async function updateTagCardCount(tagId: string): Promise<number> {
  try {
    // Get direct assignments using the tags array
    const directSnapshot = await firestore.collection('cards')
      .where('tags', 'array-contains', tagId)
      .where('status', '==', 'published')
      .count()
      .get();
    
    const directCount = directSnapshot.data().count;

    // Get immediate children's existing cardCounts
    const childrenSnapshot = await firestore.collection('tags')
      .where('parentId', '==', tagId)
      .get();
    
    // Sum children's cardCounts
    const childrenTotal = childrenSnapshot.docs.reduce((sum, childDoc) => {
      const childCount = childDoc.data().cardCount || 0;
      return sum + childCount;
    }, 0);

    // Total = direct + children
    const totalCount = directCount + childrenTotal;

    // Update the tag
    await firestore.collection('tags').doc(tagId).update({
      cardCount: totalCount,
      updatedAt: new Date()
    });

    return totalCount;
  } catch (error) {
    console.error(`Error updating card count for tag ${tagId}:`, error);
    throw error;
  }
}

/**
 * Updates card counts for all tags in the system.
 * Processes bottom-up to ensure children's counts are accurate before calculating parent counts.
 * 
 * @returns Promise resolving to the number of tags updated
 */
export async function updateAllTagCardCounts(): Promise<number> {
  try {
    const tagsSnapshot = await firestore.collection('tags').get();
    const allTags = tagsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      parentId: doc.data().parentId,
    }));

    // Group tags by their level in the tree
    const tagsByParent = new Map<string | undefined, string[]>();
    allTags.forEach(tag => {
      const parentId = tag.parentId;
      if (!tagsByParent.has(parentId)) {
        tagsByParent.set(parentId, []);
      }
      tagsByParent.get(parentId)!.push(tag.id);
    });

    let processedCount = 0;

    // Process one level at a time, starting with leaf nodes
    const processLevel = async (parentId: string | undefined) => {
      const tagIds = tagsByParent.get(parentId) || [];
      
      // First, process all children of tags at this level
      for (const tagId of tagIds) {
        if (tagsByParent.has(tagId)) {
          await processLevel(tagId);
        }
      }

      // Then process the tags at this level
      await Promise.all(tagIds.map(async (tagId) => {
        try {
          await updateTagCardCount(tagId);
          processedCount++;
        } catch (error) {
          console.error(`Failed to update count for tag ${tagId}:`, error);
        }
      }));
    };

    // Start from root level (undefined parentId)
    await processLevel(undefined);
    return processedCount;
  } catch (error) {
    console.error('Error updating all tag card counts:', error);
    throw error;
  }
}

/**
 * Recursively updates the path for a tag and all of its descendants.
 * This is called when a tag is moved to a new parent.
 * @param tagId The ID of the tag that was moved.
 * @param newParentId The ID of the new parent tag (or undefined for root).
 * @param transaction The Firestore transaction to perform the updates in.
 */
export async function updateTagAndDescendantPaths(tagId: string, newParentId: string | undefined, transaction: FirebaseFirestore.Transaction) {
  const tagsCollection = firestore.collection('tags');
  
  // 1. Get the new parent's data to determine the base of the new path.
  let newBasePath: string[] = [];
  if (newParentId) {
    const parentRef = tagsCollection.doc(newParentId);
    const parentDoc = await transaction.get(parentRef);
    if (!parentDoc.exists) {
      throw new Error(`Cannot move tag to non-existent parent: ${newParentId}`);
    }
    const parentData = parentDoc.data() as Tag;
    newBasePath = [...(parentData.path || []), parentDoc.id];
  }

  // 2. Define a recursive function to update a tag and its children.
  async function updateRecursively(currentTagId: string, parentPath: string[]) {
    const currentTagRef = tagsCollection.doc(currentTagId);
    const newPath = [...parentPath, currentTagId];

    // Update the current tag's path.
    transaction.update(currentTagRef, { path: newPath, parentId: newParentId });

    // Find all direct children of the current tag.
    const childrenQuery = tagsCollection.where('parentId', '==', currentTagId);
    const childrenSnapshot = await transaction.get(childrenQuery);

    if (childrenSnapshot.empty) {
      return; // Base case: no children to update.
    }

    // Recursively call the function for each child.
    for (const childDoc of childrenSnapshot.docs) {
      await updateRecursively(childDoc.id, newPath);
    }
  }

  // 3. Start the recursive update process from the moved tag.
  const movedTagRef = tagsCollection.doc(tagId);
  const initialNewPath = [...newBasePath];
  transaction.update(movedTagRef, { path: initialNewPath, parentId: newParentId });

  // Now, recursively update all descendants
  const childrenQuery = tagsCollection.where('parentId', '==', tagId);
  const childrenSnapshot = await transaction.get(childrenQuery);
  for (const childDoc of childrenSnapshot.docs) {
      await updateRecursively(childDoc.id, initialNewPath);
  }
} 