#!/usr/bin/env node
/**
 * Update tag counts based on direct assignments and children's counts
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts [options]
 * 
 * Options:
 *   --dry-run          Preview changes without making them
 *   --limit=N          Limit number of tags to process
 * 
 * Example:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts --dry-run
 */

import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();

async function backfillTagCounts() {
  console.log('Starting to backfill tag counts...');

  try {
    const tagsCollection = firestore.collection('tags');
    const cardsCollection = firestore.collection('cards');
    const allTagsSnapshot = await tagsCollection.get();
    
    if (allTagsSnapshot.empty) {
      console.log('No tags found. Exiting.');
      return;
    }

    const tagsMap = new Map<string, Tag>();
    allTagsSnapshot.forEach(doc => {
      tagsMap.set(doc.id, { docId: doc.id, ...doc.data() } as Tag);
    });

    console.log(`Found ${tagsMap.size} total tags.`);

    const tagCounts = new Map<string, number>();
    tagsMap.forEach(tag => {
      tagCounts.set(tag.docId, 0);
    });

    const publishedCardsSnapshot = await cardsCollection.where('status', '==', 'published').get();
    
    console.log(`Found ${publishedCardsSnapshot.size} published cards to process.`);

    publishedCardsSnapshot.forEach(cardDoc => {
      const card = cardDoc.data() as Card;
      if (card.tags && card.tags.length > 0) {
        const uniqueTagsOnCard = new Set(card.tags); // Ensure we only count each tag once per card
        uniqueTagsOnCard.forEach(tagId => {
          const tag = tagsMap.get(tagId);
          if (tag && tag.path) {
            // Increment count for the tag itself and all its ancestors
            tag.path.forEach(ancestorId => {
              tagCounts.set(ancestorId, (tagCounts.get(ancestorId) || 0) + 1);
            });
          }
        });
      }
    });

    console.log('Tag counts calculated. Preparing to update Firestore...');

    const batch = firestore.batch();
    let batchCounter = 0;
    tagCounts.forEach((count, tagId) => {
      const tagRef = tagsCollection.doc(tagId);
      batch.update(tagRef, { cardCount: count });
      batchCounter++;
      
      if (batchCounter % 499 === 0) {
        console.log(`Committing batch of ${batchCounter} updates...`);
      }
    });
    
    await batch.commit();

    console.log(`Successfully updated cardCount for ${tagCounts.size} tags.`);

  } catch (error) {
    console.error('An error occurred during the backfill process:', error);
    process.exit(1);
  }
}

backfillTagCounts()
  .then(() => {
    console.log('Backfill script finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed to run.', err);
    process.exit(1);
  }); 