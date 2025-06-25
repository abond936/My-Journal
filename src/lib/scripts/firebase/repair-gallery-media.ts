import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

// This script is designed to run once to fix a data integrity issue.
// It finds cards where 'galleryMedia' is an array of full media objects
// and converts them to the correct MediaReference format.

// Correctly infer the MediaReference type from the canonical card schema.
type GalleryMediaReference = z.infer<typeof cardSchema.shape.galleryMedia._def.innerType.element>;

// A type guard to safely check if an item is an old-format media object.
function isOldFormatMediaObject(item: any): item is { id: string; [key: string]: any } {
  // The old format is an object that definitely has an 'id' and 'storagePath'.
  return item && typeof item === 'object' && typeof item.id === 'string' && typeof item.storagePath === 'string';
}

async function repairGalleryMedia() {
  console.log('Starting gallery media repair script...');
  getAdminApp(); // Ensure Firebase is initialized
  const firestore = admin.firestore();
  const cardsCollection = firestore.collection('cards');

  let processedCount = 0;
  let repairedCount = 0;

  try {
    const snapshot = await cardsCollection.get();
    if (snapshot.empty) {
      console.log('No cards found in the collection.');
      return;
    }

    console.log(`Found ${snapshot.docs.length} total cards. Checking each...`);

    for (const doc of snapshot.docs) {
      processedCount++;
      const card = doc.data() as Card;

      // We only care about cards that have a galleryMedia array to process.
      if (!card.galleryMedia || card.galleryMedia.length === 0) {
        continue;
      }

      // Check if the first element is in the old format. If so, process the whole array.
      if (isOldFormatMediaObject(card.galleryMedia[0])) {
        console.log(`\nFound invalid galleryMedia in card ID: ${doc.id}. Converting...`);
        
        const newGalleryMedia: GalleryMediaReference[] = card.galleryMedia
          .map((oldItem: any, index: number) => {
            // Based on our diagnosis, the old object has an 'id' but no 'order'.
            // We will use the array index for the order.
            return {
              mediaId: oldItem.id,
              order: index, // Use the index for the order.
            };
          });

        // Final check to ensure the new array is valid before updating.
        const validation = cardSchema.shape.galleryMedia.safeParse(newGalleryMedia);
        if (validation.success) {
          await cardsCollection.doc(doc.id).update({ galleryMedia: newGalleryMedia });
          console.log(`  ✅ Successfully repaired card ID: ${doc.id}`);
          repairedCount++;
        } else {
          // This should not happen with our new logic, but it's a critical safeguard.
          console.error(`  ❌ Validation FAILED for card ID: ${doc.id} after conversion.`);
          console.error('  Converted Data:', JSON.stringify(newGalleryMedia, null, 2));
          console.error('  Validation Errors:', validation.error.errors);
        }
      }
    }

    console.log(`\n----------------------------------------`);
    console.log(`Script finished.`);
    console.log(`Total cards processed: ${processedCount}`);
    console.log(`Total cards repaired: ${repairedCount}`);
    console.log(`----------------------------------------`);

  } catch (error) {
    console.error('\n❌ A critical error occurred during the script execution:', error);
    process.exit(1);
  }
}

// Execute the script
repairGalleryMedia().then(() => {
  console.log('Operation complete.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
}); 