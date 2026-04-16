import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag, OrganizedTags } from '@/lib/types/tag';
import type { Media } from '@/lib/types/photo';
import { FieldValue, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';

function normalizeTagNameForUniqueness(name: string): string {
  return name.trim().toLowerCase();
}

type CanonicalDimension = 'who' | 'what' | 'when' | 'where';

function normalizeDimension(value: unknown): CanonicalDimension | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'who' || raw === 'what' || raw === 'when' || raw === 'where') return raw;
  return undefined;
}

/**
 * True if another tag already uses this display name in the same tree slot:
 * - **Roots** (no parent): same `dimension` + same name (case-insensitive) — e.g. four roots all named `zNA`, one per dimension.
 * - **Children**: same `parentId` + same name among siblings (case-insensitive).
 */
function isTagNameTakenBySiblingOrRootDimension(
  allTags: Tag[],
  opts: { name: string; parentId?: string | null; dimension?: Tag['dimension'] },
  excludeDocId?: string
): boolean {
  const norm = normalizeTagNameForUniqueness(opts.name);
  const wantParent = (opts.parentId ?? '').toString().trim();

  return allTags.some((t) => {
    if (excludeDocId && t.docId === excludeDocId) return false;
    if (normalizeTagNameForUniqueness(t.name || '') !== norm) return false;

    const tParent = (t.parentId ?? '').toString().trim();
    if (!wantParent) {
      const dim = opts.dimension;
      if (!dim) return false;
      return !tParent && t.dimension === dim;
    }
    return tParent === wantParent;
  });
}

/**
 * Derives filterTags + dimensional arrays from **card-assigned tags only**.
 * Media tags are separate and do not roll onto the card (see docs/02-Application.md → Tag Management / media tagging behavior).
 */
export async function mergeDerivedTagsForCardRecord(
  cardData: DocumentData | undefined,
  _transaction?: Transaction
): Promise<{ filterTags: Record<string, boolean>; dimensionalTags: OrganizedTags }> {
  const directTags = (cardData?.tags as string[] | undefined) || [];
  return calculateDerivedTagData(directTags);
}

/**
 * Fetches all tags directly from Firestore.
 * This is a server-side function.
 * @returns A promise that resolves to an array of all tags.
 */
export async function getAllTags(): Promise<Tag[]> {
  const snapshot = await firestore.collection(TAGS_COLLECTION).orderBy('name', 'asc').get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => {
    const data = doc.data() as Partial<Tag>;

    return {
      docId: doc.id,
      ...data,
    } as Tag;
  });
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
    };
  }

  try {
    const allTags = await getAllTags();
    
    const tagMap = new Map(allTags.map(tag => [tag.docId!, tag]));

    const organizedTags: OrganizedTags = {
      who: [],
      what: [],
      when: [],
      where: [],
    };

    // Helper to resolve a tag's dimension. If the tag itself doesn't have a dimension,
    // walk up its ancestors until we find one that does.
    const resolveDimension = (tagId: string): keyof OrganizedTags | null => {
      let current = tagMap.get(tagId);
      while (current) {
        if (current.dimension) {
          const raw = current.dimension.toLowerCase();
          const dim = (raw === 'reflection' ? 'what' : raw) as keyof OrganizedTags;
          if (organizedTags.hasOwnProperty(dim)) {
            return dim;
          }
        }
        if (!current.parentId) break;
        current = tagMap.get(current.parentId);
      }
      return null;
    };

    for (const tagId of tagIds) {
      const dim = resolveDimension(tagId);
      if (dim) {
        organizedTags[dim].push(tagId);
      }
    }

    return organizedTags;
  } catch (error) {
    console.error("[organizeTagsByDimension] Error organizing tags by dimension:", error);
    // Return empty organized tags on error to prevent crashes
    return {
      who: [],
      what: [],
      when: [],
      where: [],
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
  const tagMap = new Map(allTags.map(tag => [tag.docId!, tag]));
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
      dimensionalTags: { who: [], what: [], when: [], where: [] }
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

    const result = {
      filterTags,
      dimensionalTags
    };
    
    return result;
  } catch (error) {
    console.error('[calculateDerivedTagData] Error calculating derived tag data:', error);
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

    const allTagsForJournal = await getAllTags();
    const journalTagMap = buildTagMap(allTagsForJournal);

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

          const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(cardData);
          const journal = computeJournalWhenSortKeys(dimensionalTags.when || [], journalTagMap);

          // Update the card
          await firestore.collection('cards').doc(cardId).update({
            filterTags,
            who: dimensionalTags.who,
            what: dimensionalTags.what,
            when: dimensionalTags.when,
            where: dimensionalTags.where,
            journalWhenSortAsc: journal.journalWhenSortAsc,
            journalWhenSortDesc: journal.journalWhenSortDesc,
            updatedAt: FieldValue.serverTimestamp()
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
 * Fetches a single tag by its docId.
 * @param docId The document ID of the tag to fetch
 * @returns Promise resolving to the tag or null if not found
 */
export async function getTagById(docId: string): Promise<Tag | null> {
  try {
    const doc = await firestore.collection(TAGS_COLLECTION).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as Partial<Tag>;
    return {
      docId: doc.id,
      ...data,
    } as Tag;
  } catch (error) {
    console.error(`Error fetching tag ${docId}:`, error);
    throw new Error(`Failed to fetch tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing tag.
 * @param docId The document ID of the tag to update
 * @param tagData The data to update
 * @returns Promise resolving to the updated tag
 */
export async function updateTag(docId: string, tagData: Partial<Omit<Tag, 'docId' | 'createdAt'>>): Promise<Tag> {
  try {
    const tagRef = firestore.collection(TAGS_COLLECTION).doc(docId);
    
    // Check if tag exists
    const doc = await tagRef.get();
    if (!doc.exists) {
      throw new Error(`Tag with ID ${docId} not found`);
    }

    const existing = doc.data() as Tag;

    const nextName = tagData.name !== undefined ? tagData.name : existing.name;
    const nextParentId = tagData.parentId !== undefined ? tagData.parentId : existing.parentId;
    let nextDimension = normalizeDimension(
      tagData.dimension !== undefined ? tagData.dimension : existing.dimension
    );

    if (nextParentId) {
      const parentDoc = await firestore.collection(TAGS_COLLECTION).doc(nextParentId).get();
      if (!parentDoc.exists) {
        throw new Error('Parent tag not found');
      }
      const parentData = parentDoc.data() as Tag;
      const parentDimension = normalizeDimension(parentData.dimension);
      if (!parentDimension) {
        throw new Error('Parent tag must have a valid dimension');
      }
      if (nextDimension && nextDimension !== parentDimension) {
        throw new Error('Child tag dimension must match parent dimension');
      }
      nextDimension = parentDimension;
    } else if (!nextDimension) {
      throw new Error('Root tags require a dimension');
    }

    if (
      tagData.name !== undefined ||
      tagData.parentId !== undefined ||
      tagData.dimension !== undefined
    ) {
      if (!nextName || typeof nextName !== 'string') {
        throw new Error('Tag name is required');
      }
      const allTags = await getAllTags();
      if (
        isTagNameTakenBySiblingOrRootDimension(
          allTags,
          { name: nextName, parentId: nextParentId, dimension: nextDimension },
          docId
        )
      ) {
        throw new Error('Tag with this name already exists');
      }
    }

    // Prepare update data
    const updateData = {
      ...tagData,
      dimension: nextDimension,
      updatedAt: FieldValue.serverTimestamp()
    };

    await tagRef.update(updateData);
    
    // Fetch and return the updated tag
    const updatedDoc = await tagRef.get();
    const data = updatedDoc.data() as Partial<Tag>;
    return {
      docId: updatedDoc.id,
      ...data,
    } as Tag;
  } catch (error) {
    console.error(`Error updating tag ${docId}:`, error);
    throw new Error(`Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a tag and all its descendants.
 * @param docId The document ID of the tag to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteTag(docId: string): Promise<void> {
  try {
    // First, find all descendants of this tag
    const allTags = await getAllTags();
    const tagMap = new Map(allTags.map(tag => [tag.docId!, tag]));
    const descendants = new Set<string>();
    
    const findDescendants = (tagId: string) => {
      descendants.add(tagId);
      // Find all children of this tag
      allTags.forEach(tag => {
        if (tag.parentId === tagId) {
          findDescendants(tag.docId!);
        }
      });
    };
    
    findDescendants(docId);
    const tagsToDelete = Array.from(descendants);
    
    console.log(`Deleting tag ${docId} and ${tagsToDelete.length - 1} descendants`);
    
    // Find all cards that use any of the tags being deleted
    const affectedCardIds = new Set<string>();
    for (const tagId of tagsToDelete) {
      const cardIds = await findCardsUsingTag(tagId);
      cardIds.forEach(id => affectedCardIds.add(id));
    }
    
    console.log(`Found ${affectedCardIds.size} cards affected by tag deletion`);

    const affectedMediaIds = new Set<string>();
    for (const tagId of tagsToDelete) {
      const mediaSnap = await firestore.collection('media').where('tags', 'array-contains', tagId).get();
      mediaSnap.docs.forEach((d) => affectedMediaIds.add(d.id));
    }
    console.log(`Found ${affectedMediaIds.size} media items affected by tag deletion`);

    const tagsToDeleteSet = new Set(tagsToDelete);

    await firestore.runTransaction(async (transaction) => {
      // Firestore: all transaction reads before any writes.
      const cardRefList = [...affectedCardIds].map((id) => firestore.collection('cards').doc(id));
      const mediaRefList = [...affectedMediaIds].map((id) => firestore.collection('media').doc(id));
      const cardSnaps = await Promise.all(cardRefList.map((ref) => transaction.get(ref)));
      const mediaSnaps = await Promise.all(mediaRefList.map((ref) => transaction.get(ref)));

      const cardCountDeltaMap: Record<string, number> = {};
      const mediaCountDeltaMap: Record<string, number> = {};

      type CardWrite = {
        ref: FirebaseFirestore.DocumentReference;
        payload: Record<string, unknown>;
      };
      type MediaWrite = {
        ref: FirebaseFirestore.DocumentReference;
        payload: Record<string, unknown>;
      };
      const cardWrites: CardWrite[] = [];
      const mediaWrites: MediaWrite[] = [];

      const mergeAssignmentDelta = (
        oldTags: string[] | undefined,
        newTags: string[] | undefined,
        into: Record<string, number>
      ) => {
        const oldSet = new Set(oldTags || []);
        const newSet = new Set(newTags || []);
        for (const tagId of newSet) {
          if (!oldSet.has(tagId)) into[tagId] = (into[tagId] || 0) + 1;
        }
        for (const tagId of oldSet) {
          if (!newSet.has(tagId)) into[tagId] = (into[tagId] || 0) - 1;
        }
      };

      for (let i = 0; i < cardSnaps.length; i++) {
        const cardDoc = cardSnaps[i]!;
        const cardRef = cardRefList[i]!;
        if (!cardDoc.exists) continue;
        const cardData = cardDoc.data();
        const currentTags = cardData?.tags || [];
        const updatedTags = currentTags.filter((tagId: string) => !tagsToDelete.includes(tagId));
        if (updatedTags.length === currentTags.length) continue;

        const removedTags = currentTags.filter((tagId: string) => tagsToDelete.includes(tagId));
        for (const tid of removedTags) {
          cardCountDeltaMap[tid] = (cardCountDeltaMap[tid] || 0) - 1;
        }

        const mergedCardPayload = { ...cardData, tags: updatedTags };
        const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(mergedCardPayload, transaction);
        const journal = computeJournalWhenSortKeys(dimensionalTags.when || [], tagMap);

        cardWrites.push({
          ref: cardRef,
          payload: {
            tags: updatedTags,
            filterTags,
            who: dimensionalTags.who,
            what: dimensionalTags.what,
            when: dimensionalTags.when,
            where: dimensionalTags.where,
            journalWhenSortAsc: journal.journalWhenSortAsc,
            journalWhenSortDesc: journal.journalWhenSortDesc,
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      }

      for (let i = 0; i < mediaSnaps.length; i++) {
        const mediaDoc = mediaSnaps[i]!;
        const mediaRef = mediaRefList[i]!;
        if (!mediaDoc.exists) continue;
        const mediaData = mediaDoc.data() as Media;
        const currentTags = mediaData.tags || [];
        const updatedTags = currentTags.filter((tid: string) => !tagsToDelete.includes(tid));
        if (updatedTags.length === currentTags.length) continue;

        mergeAssignmentDelta(currentTags, updatedTags, mediaCountDeltaMap);
        const { filterTags, dimensionalTags } = await calculateDerivedTagData(updatedTags);
        mediaWrites.push({
          ref: mediaRef,
          payload: {
            tags: updatedTags,
            filterTags,
            who: dimensionalTags.who ?? [],
            what: dimensionalTags.what ?? [],
            when: dimensionalTags.when ?? [],
            where: dimensionalTags.where ?? [],
            hasTags: updatedTags.length > 0,
            hasWho: (dimensionalTags.who ?? []).length > 0,
            hasWhat: (dimensionalTags.what ?? []).length > 0,
            hasWhen: (dimensionalTags.when ?? []).length > 0,
            hasWhere: (dimensionalTags.where ?? []).length > 0,
            updatedAt: Date.now(),
          },
        });
      }

      await applyTagCountDeltas(cardCountDeltaMap, transaction, 'cardCount', tagMap, tagsToDeleteSet);
      await applyTagCountDeltas(mediaCountDeltaMap, transaction, 'mediaCount', tagMap, tagsToDeleteSet);

      for (const { ref, payload } of cardWrites) {
        transaction.update(ref, payload as DocumentData);
      }
      for (const { ref, payload } of mediaWrites) {
        transaction.update(ref, payload as DocumentData);
      }

      for (const tagId of tagsToDelete) {
        transaction.delete(firestore.collection(TAGS_COLLECTION).doc(tagId));
      }
    });
    
    console.log(`Successfully deleted ${tagsToDelete.length} tags and updated ${affectedCardIds.size} cards, ${affectedMediaIds.size} media`);
  } catch (error) {
    console.error(`Error deleting tag ${docId}:`, error);
    throw new Error(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a new tag, inheriting dimension from parent if applicable.
 * @param tagData The tag data to create
 * @returns Promise resolving to the created tag
 */
export async function createTag(tagData: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt' | 'path'>): Promise<Tag> {
  try {
    const newPath: string[] = [];

    if (tagData.parentId) {
      const parentDoc = await firestore.collection(TAGS_COLLECTION).doc(tagData.parentId).get();
      if (!parentDoc.exists) {
        throw new Error('Parent tag not found');
      }
      const parentData = parentDoc.data() as Tag;
      const parentDimension = normalizeDimension(parentData.dimension);
      if (!parentDimension) {
        throw new Error('Parent tag must have a valid dimension');
      }
      const requestedDimension = normalizeDimension(tagData.dimension);
      if (requestedDimension && requestedDimension !== parentDimension) {
        throw new Error('Child tag dimension must match parent dimension');
      }
      tagData.dimension = parentDimension;
      if (parentData.path) {
        newPath.push(...parentData.path);
      }
      newPath.push(parentDoc.id);
    } else if (!normalizeDimension(tagData.dimension)) {
      throw new Error('Root tags require a dimension');
    }

    const allTags = await getAllTags();

    if (
      isTagNameTakenBySiblingOrRootDimension(allTags, {
        name: tagData.name,
        parentId: tagData.parentId,
        dimension: tagData.dimension,
      })
    ) {
      throw new Error('Tag with this name already exists');
    }

    // Append after existing siblings (avoids new tags sorting to the top when order ties at 0)
    const wantParentId = tagData.parentId || '';
    const siblings = allTags.filter(t => {
      const p = t.parentId || '';
      if (p !== wantParentId) return false;
      if (!tagData.parentId) {
        return t.dimension === tagData.dimension;
      }
      return true;
    });
    const maxOrder = siblings.reduce((m, t) => Math.max(m, t.order ?? 0), 0);
    tagData.order = maxOrder + 1;

    // Create the tag
    const tagRef = firestore.collection(TAGS_COLLECTION).doc();
    
    const newTagData = {
      ...tagData,
      path: newPath, // Save the calculated path
      cardCount: 0, // Ensure new tags start with a count of 0
      mediaCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await tagRef.set(newTagData);
    
    // Fetch the created document to get the resolved timestamps
    const createdDoc = await tagRef.get();
    const createdData = createdDoc.data();
    
    const newTag: Tag = {
      docId: tagRef.id,
      ...createdData,
    } as Tag;
    
    return newTag;
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
export async function updateTagCounts(
  tagIds: string[],
  direction: 'increment' | 'decrement',
  transaction: FirebaseFirestore.Transaction,
  /** When set, use paths from this map instead of transaction reads (required after any write in the same txn). */
  tagPathLookup?: Map<string, Tag>
) {
  if (!tagIds || tagIds.length === 0) {
    return;
  }

  const allAncestorIds = new Set<string>();

  if (tagPathLookup) {
    for (const id of tagIds) {
      const tag = tagPathLookup.get(id);
      if (tag?.path) {
        tag.path.forEach((ancestorId) => allAncestorIds.add(ancestorId));
      }
    }
  } else {
    const tagRefs = tagIds.map((id) => firestore.collection('tags').doc(id));
    const tagDocs = await transaction.getAll(...tagRefs);

    for (const doc of tagDocs) {
      if (doc.exists) {
        const tag = doc.data() as Tag;
        if (tag.path) {
          tag.path.forEach((ancestorId) => allAncestorIds.add(ancestorId));
        }
      }
    }
  }

  const allIdsToUpdate = [...new Set([...tagIds, ...Array.from(allAncestorIds)])];
  const amount = direction === 'increment' ? 1 : -1;

  for (const tagId of allIdsToUpdate) {
    const tagRef = firestore.collection('tags').doc(tagId);
    transaction.update(tagRef, { cardCount: FieldValue.increment(amount) });
  }
}

/**
 * Media tag assignments: increment/decrement `mediaCount` on the tag and its ancestors (same shape as card deltas).
 */
export async function updateTagCountsForMedia(
  oldTags: string[] | undefined,
  newTags: string[] | undefined,
  transaction: FirebaseFirestore.Transaction,
  tagPathLookup?: Map<string, Tag>
): Promise<void> {
  const oldSet = new Set(oldTags || []);
  const newSet = new Set(newTags || []);
  const deltaMap: Record<string, number> = {};

  for (const tagId of newSet) {
    if (!oldSet.has(tagId)) {
      deltaMap[tagId] = (deltaMap[tagId] || 0) + 1;
    }
  }
  for (const tagId of oldSet) {
    if (!newSet.has(tagId)) {
      deltaMap[tagId] = (deltaMap[tagId] || 0) - 1;
    }
  }

  await applyTagCountDeltas(deltaMap, transaction, 'mediaCount', tagPathLookup);
}

/**
 * Centralized function to handle all tag count scenarios for cards.
 * This consolidates the tag counting logic from createCard, updateCard, and bulkUpdateTags.
 * 
 * @param oldCard - The card before changes (null for new cards)
 * @param newCard - The card after changes
 * @param transaction - The Firestore transaction to perform updates in
 */
export async function updateTagCountsForCard(
  oldCard: { tags?: string[]; status?: string } | null,
  newCard: { tags?: string[]; status?: string },
  transaction: FirebaseFirestore.Transaction,
  tagPathLookup?: Map<string, Tag>
): Promise<void> {
  const oldTags = new Set(oldCard?.tags || []);
  const newTags = new Set(newCard.tags || []);
  const wasPublished = (oldCard?.status ?? 'draft') === 'published';
  const isPublished = (newCard.status ?? 'draft') === 'published';
  
  // Only count published cards
  if (!isPublished && !wasPublished) return;
  
  const deltaMap: Record<string, number> = {};
  
  if (wasPublished && isPublished) {
    // Card remains published - only count tag changes
    const tagsAdded = [...newTags].filter(t => !oldTags.has(t));
    const tagsRemoved = [...oldTags].filter(t => !newTags.has(t));
    tagsAdded.forEach(tagId => deltaMap[tagId] = (deltaMap[tagId] || 0) + 1);
    tagsRemoved.forEach(tagId => deltaMap[tagId] = (deltaMap[tagId] || 0) - 1);
  } else if (!wasPublished && isPublished) {
    // Card becomes published - count all new tags
    newTags.forEach(tagId => deltaMap[tagId] = (deltaMap[tagId] || 0) + 1);
  } else if (wasPublished && !isPublished) {
    // Card becomes draft - decrement all old tags
    oldTags.forEach(tagId => deltaMap[tagId] = (deltaMap[tagId] || 0) - 1);
  }
  
  // Apply deltas with ancestor inclusion
  await applyTagCountDeltas(deltaMap, transaction, 'cardCount', tagPathLookup);
}

/**
 * Helper function to apply tag count deltas including ancestors.
 * 
 * @param deltaMap - Map of tag ID to count delta
 * @param transaction - The Firestore transaction to perform updates in
 */
async function applyTagCountDeltas(
  deltaMap: Record<string, number>,
  transaction: FirebaseFirestore.Transaction,
  countField: 'cardCount' | 'mediaCount' = 'cardCount',
  tagPathLookup?: Map<string, Tag>,
  /** Do not update these tag docs (e.g. about to be deleted in the same transaction). */
  skipTagIds?: Set<string>
): Promise<void> {
  const candidateIds = Object.keys(deltaMap);
  if (candidateIds.length === 0) return;

  if (tagPathLookup) {
    for (const tagId of candidateIds) {
      const delta = deltaMap[tagId] || 0;
      if (delta === 0) continue;
      const tagData = tagPathLookup.get(tagId);
      if (tagData?.path && Array.isArray(tagData.path)) {
        for (const ancestorId of tagData.path) {
          deltaMap[ancestorId] = (deltaMap[ancestorId] || 0) + delta;
        }
      }
    }
  } else {
    const tagRefs = candidateIds.map((id) => firestore.collection('tags').doc(id));
    const tagDocs = await transaction.getAll(...tagRefs);

    for (const docSnap of tagDocs) {
      if (!docSnap.exists) continue;
      const tagData = docSnap.data() as Tag;
      const tagId = docSnap.id;
      const delta = deltaMap[tagId] || 0;
      if (delta === 0) continue;

      if (Array.isArray(tagData.path)) {
        for (const ancestorId of tagData.path) {
          deltaMap[ancestorId] = (deltaMap[ancestorId] || 0) + delta;
        }
      }
    }
  }

  for (const [tagId, delta] of Object.entries(deltaMap)) {
    if (delta === 0) continue;
    if (skipTagIds?.has(tagId)) continue;
    const ref = firestore.collection('tags').doc(tagId);
    transaction.update(ref, { [countField]: FieldValue.increment(delta) });
  }
}

/**
 * Calculates and updates the cardCount for a specific tag.
 * cardCount = unique cards that use this tag directly OR any of its descendants
 * 
 * @param tagId - The ID of the tag to update
 * @returns Promise resolving to the new count
 */
export async function updateTagCardCount(tagId: string): Promise<number> {
  try {
    // Get direct card assignments using the tags array
    const directSnapshot = await firestore.collection('cards')
      .where('tags', 'array-contains', tagId)
      .where('status', '==', 'published')
      .get();
    
    const directCardIds = new Set(directSnapshot.docs.map(doc => doc.id));

    // Get immediate children's unique card IDs (already processed)
    const childrenSnapshot = await firestore.collection('tags')
      .where('parentId', '==', tagId)
      .get();
    
    // Collect unique card IDs from all children
    const allUniqueCardIds = new Set(directCardIds);
    for (const childDoc of childrenSnapshot.docs) {
      const childCardIds = childDoc.data().uniqueCardIds || [];
      childCardIds.forEach(cardId => allUniqueCardIds.add(cardId));
    }

    const totalCount = allUniqueCardIds.size;

    // Update the tag with both count and card IDs for efficiency
    await firestore.collection('tags').doc(tagId).update({
      cardCount: totalCount,
      uniqueCardIds: Array.from(allUniqueCardIds),
      updatedAt: FieldValue.serverTimestamp()
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
      docId: doc.id, 
      parentId: doc.data().parentId,
    }));

    // Group tags by their level in the tree
    const tagsByParent = new Map<string | undefined, string[]>();
    allTags.forEach(tag => {
      const parentId = tag.parentId;
      if (!tagsByParent.has(parentId)) {
        tagsByParent.set(parentId, []);
      }
      tagsByParent.get(parentId)!.push(tag.docId);
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

    // Start from root level (null parentId)
    await processLevel(null);
    return processedCount;
  } catch (error) {
    console.error('Error updating all tag card counts:', error);
    throw error;
  }
}

/**
 * Like `updateTagCardCount`, but for **media** `tags[]` (unique media per subtree).
 */
export async function updateTagMediaCount(tagId: string): Promise<number> {
  try {
    const directSnapshot = await firestore
      .collection('media')
      .where('tags', 'array-contains', tagId)
      .get();

    const directMediaIds = new Set(directSnapshot.docs.map((doc) => doc.id));

    const childrenSnapshot = await firestore.collection('tags').where('parentId', '==', tagId).get();

    const allUniqueMediaIds = new Set(directMediaIds);
    for (const childDoc of childrenSnapshot.docs) {
      const childMediaIds = childDoc.data().uniqueMediaIds || [];
      childMediaIds.forEach((mediaId: string) => allUniqueMediaIds.add(mediaId));
    }

    const totalCount = allUniqueMediaIds.size;

    await firestore.collection('tags').doc(tagId).update({
      mediaCount: totalCount,
      uniqueMediaIds: Array.from(allUniqueMediaIds),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return totalCount;
  } catch (error) {
    console.error(`Error updating media count for tag ${tagId}:`, error);
    throw error;
  }
}

/**
 * Recomputes `mediaCount` / `uniqueMediaIds` for all tags (bottom-up).
 */
export async function updateAllTagMediaCounts(): Promise<number> {
  try {
    const tagsSnapshot = await firestore.collection('tags').get();
    const allTags = tagsSnapshot.docs.map((doc) => ({
      docId: doc.id,
      parentId: doc.data().parentId,
    }));

    const tagsByParent = new Map<string | undefined, string[]>();
    allTags.forEach((tag) => {
      const parentId = tag.parentId;
      if (!tagsByParent.has(parentId)) {
        tagsByParent.set(parentId, []);
      }
      tagsByParent.get(parentId)!.push(tag.docId);
    });

    let processedCount = 0;

    const processLevel = async (parentId: string | undefined) => {
      const tagIds = tagsByParent.get(parentId) || [];

      for (const tagId of tagIds) {
        if (tagsByParent.has(tagId)) {
          await processLevel(tagId);
        }
      }

      await Promise.all(
        tagIds.map(async (tagId) => {
          try {
            await updateTagMediaCount(tagId);
            processedCount++;
          } catch (error) {
            console.error(`Failed to update media count for tag ${tagId}:`, error);
          }
        })
      );
    };

    await processLevel(null);
    return processedCount;
  } catch (error) {
    console.error('Error updating all tag media counts:', error);
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
  
  // PHASE 1: ALL READS FIRST
  
  // 1. Get the moved tag's current data
  const movedTagRef = tagsCollection.doc(tagId);
  const movedTagDoc = await transaction.get(movedTagRef);
  if (!movedTagDoc.exists) {
    throw new Error(`Cannot move non-existent tag: ${tagId}`);
  }
  const movedTagData = movedTagDoc.data() as Tag;
  const oldParentId = movedTagData.parentId;
  
  // 2. Get the new parent's data (if reparenting to a parent)
  let newBasePath: string[] = [];
  if (newParentId) {
    const newParentRef = tagsCollection.doc(newParentId);
    const newParentDoc = await transaction.get(newParentRef);
    if (!newParentDoc.exists) {
      throw new Error(`Cannot move tag to non-existent parent: ${newParentId}`);
    }
    const newParentData = newParentDoc.data() as Tag;
    newBasePath = [...(newParentData.path || []), newParentDoc.id];
  }
  
  // 3. Get all tags to find descendants
  const allTags = await getAllTags();
  const tagMap = new Map(allTags.map(tag => [tag.docId!, tag]));
  const descendants = new Set<string>();
  
  const findDescendants = (tagId: string) => {
    descendants.add(tagId);
    allTags.forEach(tag => {
      if (tag.parentId === tagId) {
        findDescendants(tag.docId!);
      }
    });
  };
  
  findDescendants(tagId);
  const tagsBeingMoved = Array.from(descendants);
  
  // 4. Find all cards that use any of the tags being moved
  const affectedCardIds = new Set<string>();
  for (const tagId of tagsBeingMoved) {
    const cardIds = await findCardsUsingTag(tagId);
    cardIds.forEach(id => affectedCardIds.add(id));
  }
  
  // 5. Get all affected cards data
  const affectedCards = [];
  for (const cardId of affectedCardIds) {
    const cardRef = firestore.collection('cards').doc(cardId);
    const cardDoc = await transaction.get(cardRef);
    if (cardDoc.exists) {
      affectedCards.push({
        id: cardId,
        data: cardDoc.data(),
        ref: cardRef
      });
    }
  }
  
  // 6. Get old parent hierarchy data (for count updates)
  let oldHierarchyIds: string[] = [];
  if (oldParentId) {
    const oldParentRef = tagsCollection.doc(oldParentId);
    const oldParentDoc = await transaction.get(oldParentRef);
    if (oldParentDoc.exists) {
      const oldParentData = oldParentDoc.data() as Tag;
      const oldAncestorIds = oldParentData.path || [];
      oldHierarchyIds = [oldParentId, ...oldAncestorIds];
    }
  }
  
  // 7. Get new parent hierarchy data (for count updates)
  let newHierarchyIds: string[] = [];
  if (newParentId) {
    const newParentRef = tagsCollection.doc(newParentId);
    const newParentDoc = await transaction.get(newParentRef);
    if (newParentDoc.exists) {
      const newParentData = newParentDoc.data() as Tag;
      const newAncestorIds = newParentData.path || [];
      newHierarchyIds = [newParentId, ...newAncestorIds];
    }
  }
  
  // 8. Build the complete tree structure for all descendants
  const buildUpdatePlan = (currentTagId: string, parentPath: string[], isRootTag: boolean = false): Array<{tagId: string, path: string[], parentId: string | undefined}> => {
    const updates = [];
    const newPath = [...parentPath, currentTagId];
    
    // Get the current tag's data to preserve its parent relationship
    const currentTag = allTags.find(t => t.docId === currentTagId);
    
    // Add this tag to the update plan
    updates.push({
      tagId: currentTagId,
      path: newPath,
      // Only change parentId for the root tag being moved, preserve existing parentId for descendants
      parentId: isRootTag ? newParentId : currentTag?.parentId
    });
    
    // Find all direct children and add them to the plan
    allTags.forEach(tag => {
      if (tag.parentId === currentTagId) {
        updates.push(...buildUpdatePlan(tag.docId!, newPath, false)); // false = not the root tag
      }
    });
    
    return updates;
  };
  
  const updatePlan = buildUpdatePlan(tagId, newBasePath, true); // true = this is the root tag being moved
  
  // 9. Get all children data BEFORE any writes (to comply with Firestore transaction rules)
  // First, determine which tags need count updates
  const tagsToUpdate = new Set<string>();
  
  // Add old hierarchy tags
  oldHierarchyIds.forEach(id => tagsToUpdate.add(id));
  
  // Add new hierarchy tags  
  newHierarchyIds.forEach(id => tagsToUpdate.add(id));
  
  // Add moved tags themselves
  tagsBeingMoved.forEach(id => tagsToUpdate.add(id));
  
  // Now get all children data for these tags
  const childrenData = new Map<string, { uniqueCardIds: string[] }>();
  for (const tagId of tagsToUpdate) {
    const childrenSnapshot = await transaction.get(
      firestore.collection('tags').where('parentId', '==', tagId)
    );
    
    const children = childrenSnapshot.docs.map(doc => ({
      uniqueCardIds: doc.data().uniqueCardIds || []
    }));
    childrenData.set(tagId, { uniqueCardIds: children.flatMap(c => c.uniqueCardIds) });
  }
  

  
  // PHASE 2: ALL WRITES NOW
  
  // 10. Update all tags in the move plan
  for (const update of updatePlan) {
    const tagRef = tagsCollection.doc(update.tagId);
    transaction.update(tagRef, { 
      path: update.path, 
      parentId: update.parentId 
    });
  }
  
  // 11. Update all affected cards with recalculated derived data
  for (const card of affectedCards) {
    const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(card.data, transaction);
    const journal = computeJournalWhenSortKeys(dimensionalTags.when || [], tagMap);

    transaction.update(card.ref, {
      filterTags,
      who: dimensionalTags.who,
      what: dimensionalTags.what,
      when: dimensionalTags.when,
      where: dimensionalTags.where,
      journalWhenSortAsc: journal.journalWhenSortAsc,
      journalWhenSortDesc: journal.journalWhenSortDesc,
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  
  // 12. Recalculate tag counts for affected hierarchies using unique card counting
  // Update each affected tag's count using the new unique card counting logic
  for (const tagId of tagsToUpdate) {
    // Get direct card assignments for this tag
    const directCardIds = new Set<string>();
    for (const card of affectedCards) {
      if (card.data?.tags?.includes(tagId)) {
        directCardIds.add(card.id);
      }
    }
    
    // Get children's unique card IDs from pre-fetched data
    const childrenInfo = childrenData.get(tagId) || { uniqueCardIds: [] };
    
    const allUniqueCardIds = new Set(directCardIds);
    childrenInfo.uniqueCardIds.forEach(cardId => allUniqueCardIds.add(cardId));
    
    // Update the tag with new count and card IDs
    const tagRef = tagsCollection.doc(tagId);
    transaction.update(tagRef, {
      cardCount: allUniqueCardIds.size,
      uniqueCardIds: Array.from(allUniqueCardIds),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  

} 