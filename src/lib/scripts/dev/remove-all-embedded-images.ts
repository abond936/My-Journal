/**
 * @file remove-all-embedded-images.ts
 * @description A one-time utility script to iterate through all cards and remove any
 * legacy embedded <figure> or <img> tags from the `content` field. This is used
 * to achieve a "clean slate" for the new image management system.
 *
 * @execution
 * npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/dev/remove-all-embedded-images.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// 1. Load Environment Variables
console.log('Loading environment variables...');
const result = dotenv.config({ path: resolve(process.cwd(), '.env') });
if (result.error) {
  console.error('FATAL: Error loading .env file. Please ensure it exists in the root directory.', result.error);
  process.exit(1);
}
console.log('Environment variables loaded.');

// 2. Validate Required Environment Variables
const requiredEnv = [
  'FIREBASE_SERVICE_ACCOUNT_PROJECT_ID',
  'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL',
];
const missingEnv = requiredEnv.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}
console.log('Required environment variables are present.');

// 3. Initialize Firebase Admin SDK (AFTER dotenv)
import { getAdminApp } from '@/lib/config/firebase/admin';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';

console.log('Firebase Admin SDK initialized successfully.');

/**
 * Main script logic
 */
async function main() {
  console.log('\nStarting script to remove all embedded images from card content...');

  const cardsCollection = firestore.collection(CARDS_COLLECTION);
  const snapshot = await cardsCollection.get();

  if (snapshot.empty) {
    console.log('No cards found in the collection. Exiting.');
    return;
  }

  console.log(`Found ${snapshot.size} total cards. Analyzing content...`);

  let batch = firestore.batch();
  let modifiedCount = 0;
  const modifiedCardIds: string[] = [];

  // This regex finds all <figure>...</figure> blocks (non-greedily) and all standalone <img> tags.
  const imageRegex = /<figure.*?>.*?<\/figure>|<img.*?>/g;

  for (const doc of snapshot.docs) {
    const card = doc.data();
    // Ensure content is a string and not empty
    const originalContent = card.content;
    if (typeof originalContent !== 'string' || originalContent.length === 0) {
      continue;
    }

    // Check if there are any images to remove
    if (imageRegex.test(originalContent)) {
      const newContent = originalContent.replace(imageRegex, '');
      
      // Only add to batch if content actually changed
      if (newContent !== originalContent) {
        batch.update(doc.ref, { content: newContent, updatedAt: Date.now() });
        modifiedCount++;
        modifiedCardIds.push(doc.id);

        // Firestore batches are limited to 500 operations.
        // If we hit the limit, commit the batch and start a new one.
        if (modifiedCount % 499 === 0) {
            console.log(`Committing batch of ${modifiedCount} updates...`);
            await batch.commit();
            // Start a new batch for the next set of updates
            batch = firestore.batch();
            modifiedCount = 0; // Reset counter for the new batch
        }
      }
    }
  }

  // Commit any remaining operations in the final batch
  if (modifiedCount > 0) {
    console.log(`\nCommitting final batch of ${modifiedCount} updates...`);
    await batch.commit();
  }

  // Final summary
  console.log('\n-----------------------------------------');
  if (modifiedCardIds.length > 0) {
    console.log(`✅ Script finished. Successfully modified ${modifiedCardIds.length} cards.`);
    console.log('Modified Card IDs:');
    modifiedCardIds.forEach(id => console.log(`- ${id}`));
  } else {
    console.log('✅ Script finished. No cards contained embedded images that needed modification.');
  }
  console.log('-----------------------------------------');
}

main().catch(error => {
  console.error('\n❌ An unexpected error occurred during script execution:');
  console.error(error);
  process.exit(1);
}); 