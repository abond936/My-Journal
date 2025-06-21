import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { WriteBatch } from 'firebase-admin/firestore';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firestore = getAdminApp().firestore();
const BATCH_SIZE = 400;

async function backfillFilterTags() {
  console.log('Starting backfill script for filterTags...');

  try {
    // 1. Fetch all tags and create a map for efficient lookup
    console.log('Fetching all tags...');
    const tagsSnapshot = await firestore.collection('tags').get();
    const tagMap = new Map<string, Tag>();
    tagsSnapshot.docs.forEach(doc => {
      const tag = { id: doc.id, ...doc.data() } as Tag;
      tagMap.set(tag.id, tag);
    });
    console.log(`Loaded ${tagMap.size} tags into memory.`);

    // 2. Fetch all cards
    console.log('Fetching all cards...');
    const cardsSnapshot = await firestore.collection('cards').get();
    const cards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
    console.log(`Found ${cards.length} cards to process.`);

    let batch: WriteBatch = firestore.batch();
    let cardsProcessed = 0;
    let batchesCommitted = 0;

    // 3. Process each card
    for (const card of cards) {
      // Check if filterTags already exists and has keys
      if (card.filterTags && Object.keys(card.filterTags).length > 0) {
        console.log(`Skipping card ${card.id} - filterTags already exists.`);
        continue;
      }

      const directTags = card.tags || [];
      const ancestors = new Set<string>();
      
      const findAncestors = (tagId: string) => {
        const tag = tagMap.get(tagId);
        if (tag?.parentId) {
          ancestors.add(tag.parentId);
          findAncestors(tag.parentId);
        }
      };

      directTags.forEach(tagId => findAncestors(tagId));
      
      const allTagIds = [...new Set([...directTags, ...Array.from(ancestors)])];

      const filterTags: Record<string, boolean> = {};
      allTagIds.forEach(tagId => {
        filterTags[tagId] = true;
      });

      const cardRef = firestore.collection('cards').doc(card.id);
      batch.update(cardRef, { filterTags });

      cardsProcessed++;

      // 4. Commit batch when full
      if (cardsProcessed % BATCH_SIZE === 0) {
        await batch.commit();
        batchesCommitted++;
        console.log(`Committed batch #${batchesCommitted} (${BATCH_SIZE} cards).`);
        batch = firestore.batch(); // Start a new batch
      }
    }

    // 5. Commit the final batch
    if (cardsProcessed % BATCH_SIZE !== 0) {
      await batch.commit();
      batchesCommitted++;
      console.log(`Committed final batch (${cardsProcessed % BATCH_SIZE} cards).`);
    }

    console.log('\nBackfill complete!');
    console.log(`Total cards processed: ${cardsProcessed}`);
    console.log(`Total batches committed: ${batchesCommitted}`);

  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }
}

backfillFilterTags()
  .then(() => {
    console.log('Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 