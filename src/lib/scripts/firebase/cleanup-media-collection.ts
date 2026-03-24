import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import { Card } from '@/lib/types/card';
// Helper function to extract media IDs from HTML content
function extractMediaFromContent(html: string | null | undefined): string[] {
  if (!html || typeof html !== 'string') return [];

  const ids = new Set<string>();
  const regex = /<figure[^>]*data-media-id=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

const MEDIA_COLLECTION = 'media';
const CARDS_COLLECTION = 'cards';

/** Firestore batch limit is 500 operations per commit. */
const FIRESTORE_BATCH_LIMIT = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface CleanupReport {
  totalMediaDocs: number;
  mediaResetToTemporary: number;
  totalCardsProcessed: number;
  validMediaFound: number;
  invalidMediaRemoved: number;
  mediaActivated: number;
  storageValidationErrors: number;
  errors: string[];
}

export async function cleanupMediaCollection(dryRun: boolean = false): Promise<CleanupReport> {
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();
  const storage = adminApp.storage();
  const bucket = storage.bucket();

  const report: CleanupReport = {
    totalMediaDocs: 0,
    mediaResetToTemporary: 0,
    totalCardsProcessed: 0,
    validMediaFound: 0,
    invalidMediaRemoved: 0,
    mediaActivated: 0,
    storageValidationErrors: 0,
    errors: []
  };

  console.log('🚀 Starting media collection cleanup...');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be written to the database or storage.');
  }

  try {
    // Step 1: Reset all media docs to temporary status
    console.log('📋 Step 1: Resetting all media docs to temporary status...');
    const mediaSnapshot = await firestore.collection(MEDIA_COLLECTION).get();
    report.totalMediaDocs = mediaSnapshot.size;
    
    if (!dryRun) {
      const docChunks = chunk(mediaSnapshot.docs, FIRESTORE_BATCH_LIMIT);
      for (let i = 0; i < docChunks.length; i++) {
        const mediaBatch = firestore.batch();
        docChunks[i].forEach(doc => {
          mediaBatch.update(doc.ref, { status: 'temporary', updatedAt: Date.now() });
        });
        await mediaBatch.commit();
        console.log(`   Batch ${i + 1}/${docChunks.length}: reset ${docChunks[i].length} media docs`);
      }
      report.mediaResetToTemporary = mediaSnapshot.size;
      console.log(`✅ Reset ${mediaSnapshot.size} media docs to temporary status`);
    } else {
      console.log(`[DRY RUN] Would reset ${mediaSnapshot.size} media docs to temporary status`);
    }

    // Step 2: Process all cards and validate their media references
    console.log('📋 Step 2: Processing cards and validating media references...');
    const cardsSnapshot = await firestore.collection(CARDS_COLLECTION).get();
    report.totalCardsProcessed = cardsSnapshot.size;
    
    const mediaToActivate = new Set<string>();
    const cardUpdates: { cardId: string; updates: Partial<Card> }[] = [];

    for (const cardDoc of cardsSnapshot.docs) {
      const cardData = { docId: cardDoc.id, ...cardDoc.data() } as Card;
      const cardId = cardDoc.id;
      let cardNeedsUpdate = false;
      const updates: Partial<Card> = {};

      // Check cover image
      if (cardData.coverImageId) {
        const isValid = await validateMediaReference(cardData.coverImageId, firestore, bucket, report);
        if (isValid) {
          mediaToActivate.add(cardData.coverImageId);
          report.validMediaFound++;
        } else {
          console.log(`[DRY RUN] Would remove invalid cover image for card "${cardData.title}" (${cardId}): ${cardData.coverImageId}`);
          updates.coverImageId = null;
          cardNeedsUpdate = true;
          report.invalidMediaRemoved++;
        }
      }

      // Check gallery media
      if (cardData.galleryMedia && cardData.galleryMedia.length > 0) {
        const validGalleryMedia = [];
        for (const item of cardData.galleryMedia) {
          if (item.mediaId) {
            const isValid = await validateMediaReference(item.mediaId, firestore, bucket, report);
            if (isValid) {
              mediaToActivate.add(item.mediaId);
              validGalleryMedia.push(item);
              report.validMediaFound++;
            } else {
              console.log(`[DRY RUN] Would remove invalid gallery media for card "${cardData.title}" (${cardId}): ${item.mediaId}`);
              report.invalidMediaRemoved++;
            }
          }
        }
        
        if (validGalleryMedia.length !== cardData.galleryMedia.length) {
          updates.galleryMedia = validGalleryMedia;
          cardNeedsUpdate = true;
        }
      }

      // Check content media - extract from HTML content
      const contentMediaIds = extractMediaFromContent(cardData.content);
      if (contentMediaIds.length > 0) {
        const validContentMediaIds = [];
        for (const mediaId of contentMediaIds) {
          const isValid = await validateMediaReference(mediaId, firestore, bucket, report);
          if (isValid) {
            mediaToActivate.add(mediaId);
            validContentMediaIds.push(mediaId);
            report.validMediaFound++;
          } else {
            console.log(`[DRY RUN] Would remove invalid content media for card "${cardData.title}" (${cardId}): ${mediaId}`);
            report.invalidMediaRemoved++;
          }
        }
        
        // If we found invalid content media, we need to clean the HTML content
        if (validContentMediaIds.length !== contentMediaIds.length) {
          // For now, we'll just update the contentMedia array if it exists
          // In a future version, we could clean the HTML content itself
          if (cardData.contentMedia) {
            updates.contentMedia = validContentMediaIds;
            cardNeedsUpdate = true;
          }
        }
      }

      if (cardNeedsUpdate) {
        cardUpdates.push({ cardId, updates });
      }
    }

    console.log(`\n📊 Validation Results:`);
    console.log(`- Valid media references found: ${report.validMediaFound}`);
    console.log(`- Invalid media references removed: ${report.invalidMediaRemoved}`);
    console.log(`- Cards needing updates: ${cardUpdates.length}`);

    // Step 3: Activate valid media
    console.log('📋 Step 3: Activating valid media...');
    if (!dryRun && mediaToActivate.size > 0) {
      const mediaIds = Array.from(mediaToActivate);
      const idChunks = chunk(mediaIds, FIRESTORE_BATCH_LIMIT);
      for (let i = 0; i < idChunks.length; i++) {
        const activateBatch = firestore.batch();
        for (const mediaId of idChunks[i]) {
          const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
          activateBatch.update(mediaRef, { status: 'active', updatedAt: Date.now() });
        }
        await activateBatch.commit();
        console.log(`   Batch ${i + 1}/${idChunks.length}: activated ${idChunks[i].length} media docs`);
      }
      report.mediaActivated = mediaToActivate.size;
      console.log(`✅ Activated ${mediaToActivate.size} media docs`);
    } else {
      console.log(`[DRY RUN] Would activate ${mediaToActivate.size} media docs`);
    }

    // Step 4: Update cards with cleaned media references
    console.log('📋 Step 4: Updating cards with cleaned media references...');
    if (!dryRun && cardUpdates.length > 0) {
      const updateChunks = chunk(cardUpdates, FIRESTORE_BATCH_LIMIT);
      for (let i = 0; i < updateChunks.length; i++) {
        const cardBatch = firestore.batch();
        for (const { cardId, updates } of updateChunks[i]) {
          const cardRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
          cardBatch.update(cardRef, { ...updates, updatedAt: Date.now() });
        }
        await cardBatch.commit();
        console.log(`   Batch ${i + 1}/${updateChunks.length}: updated ${updateChunks[i].length} cards`);
      }
      console.log(`✅ Updated ${cardUpdates.length} cards`);
    } else {
      console.log(`[DRY RUN] Would update ${cardUpdates.length} cards`);
    }

    // Step 5: Generate final report
    const remainingTemporaryMedia = await firestore
      .collection(MEDIA_COLLECTION)
      .where('status', '==', 'temporary')
      .get();

    console.log('📋 Final Report:');
    console.log(`- Total media docs processed: ${report.totalMediaDocs}`);
    console.log(`- Media reset to temporary: ${report.mediaResetToTemporary}`);
    console.log(`- Cards processed: ${report.totalCardsProcessed}`);
    console.log(`- Valid media references found: ${report.validMediaFound}`);
    console.log(`- Invalid media references removed: ${report.invalidMediaRemoved}`);
    console.log(`- Media activated: ${report.mediaActivated}`);
    console.log(`- Remaining temporary media (can be deleted): ${remainingTemporaryMedia.size}`);
    console.log(`- Storage validation errors: ${report.storageValidationErrors}`);

    if (report.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      report.errors.forEach(error => console.log(`- ${error}`));
    }

    return report;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cleanup failed:', errorMessage);
    report.errors.push(errorMessage);
    throw error;
  }
}

async function validateMediaReference(mediaId: string, firestore: any, bucket: any, report: CleanupReport): Promise<boolean> {
  try {
    // Check if media doc exists
    const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
    const mediaDoc = await mediaRef.get();
    
    if (!mediaDoc.exists) {
      return false;
    }

    const mediaData = mediaDoc.data() as Media;
    
    // Validate required fields
    if (!mediaData.storagePath) {
      console.warn(`Media ${mediaId} missing storagePath field`);
      report.storageValidationErrors++;
      return false;
    }

    // Check if storage file exists
    const file = bucket.file(mediaData.storagePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.warn(`Storage file not found for media ${mediaId}: ${mediaData.storagePath}`);
      report.storageValidationErrors++;
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error validating media ${mediaId}:`, error);
    report.storageValidationErrors++;
    return false;
  }
}

// Main execution wrapper
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔧 Media Collection Cleanup Script');
  console.log('==================================');
  console.log('');

  console.log('📋 Configuration:');
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database or storage');
    console.log('');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be made to the database and storage');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const result = await cleanupMediaCollection(dryRun);
    
    console.log('');
    console.log('🎯 Final Result:');
    console.log(`   Success: ${result.errors.length === 0 ? 'YES' : 'NO'}`);
    console.log(`   Total media docs: ${result.totalMediaDocs}`);
    console.log(`   Media reset to temporary: ${result.mediaResetToTemporary}`);
    console.log(`   Cards processed: ${result.totalCardsProcessed}`);
    console.log(`   Valid media found: ${result.validMediaFound}`);
    console.log(`   Invalid media removed: ${result.invalidMediaRemoved}`);
    console.log(`   Media activated: ${result.mediaActivated}`);
    console.log(`   Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors occurred during processing. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Media collection cleanup completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
} 