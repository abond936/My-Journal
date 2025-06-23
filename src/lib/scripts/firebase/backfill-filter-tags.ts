import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';
const TAGS_COLLECTION = 'tags';

/**
 * This script iterates through all cards in Firestore and recalculates the
 * `inheritedTags`, `filterTags`, and `tagPathsMap` fields based on the
 * card's existing `tags` array. This is necessary to fix stale data
 * after changes to the tag hierarchy logic.
 */
async function backfillTags() {
  console.log('Starting tag hierarchy backfill process...');

  try {
    // 1. Fetch all tags and create a lookup map for efficient access.
    console.log('Fetching all tags...');
    const tagsSnapshot = await firestore.collection(TAGS_COLLECTION).get();
    const allTags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Tag);
    const tagMap = new Map(allTags.map(tag => [tag.id, tag]));
    console.log(`Found ${allTags.length} tags.`);

    // --- Helper functions using the in-memory tagMap ---

    const getAncestorsFromMap = (tagId: string): string[] => {
      const ancestors = new Set<string>();
      const findParents = (currentTagId: string) => {
        const tag = tagMap.get(currentTagId);
        if (tag?.parentId) {
          ancestors.add(tag.parentId);
          findParents(tag.parentId);
        }
      };
      findParents(tagId);
      return Array.from(ancestors);
    };

    const getPathsMapFromMap = (tagIds: string[]): Record<string, boolean> => {
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
                pathsMap[pathArray.join('_')] = true;
            }
        }
        return pathsMap;
    };


    // 2. Fetch all cards
    console.log('Fetching all cards...');
    const cardsSnapshot = await firestore.collection(CARDS_COLLECTION).get();
    const allCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
    console.log(`Found ${allCards.length} cards to process.`);

    // 3. Process cards in batches
    let totalUpdatedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < allCards.length; i += batchSize) {
      const batch = firestore.batch();
      const chunk = allCards.slice(i, i + batchSize);
      let updatesInBatch = 0;
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allCards.length / batchSize)}...`);

      for (const card of chunk) {
        const directTags = card.tags || [];

        // Recalculate hierarchy from direct tags
        const ancestors = new Set<string>();
        directTags.forEach(tagId => {
            getAncestorsFromMap(tagId).forEach(ancestorId => ancestors.add(ancestorId));
        });

        const newInheritedTags = [...new Set([...directTags, ...Array.from(ancestors)])];
        const newFilterTags = newInheritedTags.reduce((acc, tagId) => {
          acc[tagId] = true;
          return acc;
        }, {} as Record<string, boolean>);
        const newTagPathsMap = getPathsMapFromMap(directTags);

        // Check if an update is actually needed by comparing sorted arrays
        const oldInheritedSorted = [...(card.inheritedTags || [])].sort();
        const newInheritedSorted = [...newInheritedTags].sort();

        if (JSON.stringify(oldInheritedSorted) !== JSON.stringify(newInheritedSorted)) {
            const cardRef = firestore.collection(CARDS_COLLECTION).doc(card.id);
            batch.update(cardRef, {
                inheritedTags: newInheritedTags,
                filterTags: newFilterTags,
                tagPathsMap: newTagPathsMap,
            });
            updatesInBatch++;
        }
      }
      
      if (updatesInBatch > 0) {
          await batch.commit();
          console.log(`Batch committed with ${updatesInBatch} updates.`);
          totalUpdatedCount += updatesInBatch;
      } else {
          console.log(`No updates needed for this batch.`);
      }
    }

    console.log('-----------------------------------------');
    console.log('Backfill process completed successfully!');
    console.log(`A total of ${totalUpdatedCount} cards were updated.`);
    console.log('-----------------------------------------');

  } catch (error) {
    console.error('An error occurred during the backfill process:', error);
    process.exit(1);
  }
}

backfillTags(); 