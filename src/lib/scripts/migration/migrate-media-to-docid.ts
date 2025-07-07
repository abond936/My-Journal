import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
import { FieldValue } from 'firebase-admin/firestore';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

interface MediaIdMapping {
  oldId: string;
  docId: string;
  filename: string;
}

interface MigrationReport {
  mediaDocumentsProcessed: number;
  mediaDocumentsWithId: number;
  mediaDocumentsSkipped: number;
  cardsProcessed: number;
  cardsUpdated: number;
  orphanedReferences: {
    coverImageId: string[];
    galleryMediaId: string[];
    contentMediaId: string[];
  };
  errors: string[];
}

/**
 * Migration script to update all card references from media 'id' to 'docId'
 * This script:
 * 1. Reads all media documents to create a mapping from old id to docId
 * 2. Updates all card references to use docId instead of id
 * 3. Handles corrupted/missing IDs and orphaned references
 * 4. Runs in batches to avoid timeout issues
 */
async function migrateMediaToDocId(options: {
  removeOrphanedReferences?: boolean;
  dryRun?: boolean;
} = {}): Promise<MigrationReport> {
  const { removeOrphanedReferences = false, dryRun = false } = options;
  
  console.log('Starting media to docId migration...');
  if (dryRun) console.log('DRY RUN MODE - No changes will be made');
  if (removeOrphanedReferences) console.log('Will remove orphaned references');
  
  const report: MigrationReport = {
    mediaDocumentsProcessed: 0,
    mediaDocumentsWithId: 0,
    mediaDocumentsSkipped: 0,
    cardsProcessed: 0,
    cardsUpdated: 0,
    orphanedReferences: {
      coverImageId: [],
      galleryMediaId: [],
      contentMediaId: []
    },
    errors: []
  };
  
  try {
    // Step 1: Get all media documents and create id mapping
    console.log('Step 1: Creating media ID mapping...');
    const mediaSnapshot = await firestore.collection(MEDIA_COLLECTION).get();
    
    if (mediaSnapshot.empty) {
      console.log('No media documents found. Migration complete.');
      return report;
    }
    
    const mediaIdMapping = new Map<string, MediaIdMapping>();
    const mediaDocIds = new Set<string>(); // Track all existing media docIds
    
    mediaSnapshot.forEach(doc => {
      report.mediaDocumentsProcessed++;
      const mediaData = doc.data() as Media & { id?: string };
      const docId = doc.id;
      mediaDocIds.add(docId);
      
      // Check if this media document has both id and docId fields
      if (mediaData.id && mediaData.id !== docId) {
        // Validate the id field
        if (typeof mediaData.id === 'string' && mediaData.id.trim().length > 0) {
          mediaIdMapping.set(mediaData.id, {
            oldId: mediaData.id,
            docId: docId,
            filename: mediaData.filename
          });
          report.mediaDocumentsWithId++;
        } else {
          console.warn(`Media document ${docId} has invalid id field: "${mediaData.id}"`);
          report.errors.push(`Invalid id field in media ${docId}: "${mediaData.id}"`);
        }
      } else if (!mediaData.id) {
        // Media document doesn't have id field, might already be migrated
        report.mediaDocumentsSkipped++;
      } else if (mediaData.id === docId) {
        // Media document already uses docId as id
        report.mediaDocumentsSkipped++;
        console.log(`Media document ${docId} already uses docId as id`);
      }
    });
    
    console.log(`Found ${mediaIdMapping.size} media documents with id field to migrate`);
    console.log(`Skipped ${report.mediaDocumentsSkipped} media documents (no id field or already migrated)`);
    
    if (mediaIdMapping.size === 0) {
      console.log('No media documents need migration. Migration complete.');
      return report;
    }
    
    // Step 2: Get all cards that reference media
    console.log('Step 2: Finding cards with media references...');
    const cardsSnapshot = await firestore.collection(CARDS_COLLECTION).get();
    
    if (cardsSnapshot.empty) {
      console.log('No cards found. Migration complete.');
      return report;
    }
    
    const cardsToUpdate: { docId: string; card: Card; updates: any }[] = [];
    const orphanedCoverImageIds = new Set<string>();
    const orphanedGalleryMediaIds = new Set<string>();
    const orphanedContentMediaIds = new Set<string>();
    
    cardsSnapshot.forEach(doc => {
      report.cardsProcessed++;
      const cardData = doc.data() as Card;
      const cardDocId = doc.id;
      const updates: any = {};
      let hasUpdates = false;
      
      // Check coverImageId
      if (cardData.coverImageId) {
        if (mediaIdMapping.has(cardData.coverImageId)) {
          const mapping = mediaIdMapping.get(cardData.coverImageId)!;
          updates.coverImageId = mapping.docId;
          hasUpdates = true;
          console.log(`Card ${cardDocId}: coverImageId ${cardData.coverImageId} -> ${mapping.docId} (${mapping.filename})`);
        } else if (!mediaDocIds.has(cardData.coverImageId)) {
          // This is an orphaned reference
          orphanedCoverImageIds.add(cardData.coverImageId);
          console.warn(`Card ${cardDocId}: orphaned coverImageId ${cardData.coverImageId}`);
          if (removeOrphanedReferences) {
            updates.coverImageId = null;
            hasUpdates = true;
            console.log(`Card ${cardDocId}: removing orphaned coverImageId ${cardData.coverImageId}`);
          }
        }
      }
      
      // Check galleryMedia
      if (cardData.galleryMedia && cardData.galleryMedia.length > 0) {
        const updatedGalleryMedia = cardData.galleryMedia.map(item => {
          if (item.mediaId) {
            if (mediaIdMapping.has(item.mediaId)) {
              const mapping = mediaIdMapping.get(item.mediaId)!;
              console.log(`Card ${cardDocId}: gallery mediaId ${item.mediaId} -> ${mapping.docId} (${mapping.filename})`);
              return { ...item, mediaId: mapping.docId };
            } else if (!mediaDocIds.has(item.mediaId)) {
              // This is an orphaned reference
              orphanedGalleryMediaIds.add(item.mediaId);
              console.warn(`Card ${cardDocId}: orphaned gallery mediaId ${item.mediaId}`);
              if (removeOrphanedReferences) {
                console.log(`Card ${cardDocId}: removing orphaned gallery mediaId ${item.mediaId}`);
                return null; // Will be filtered out
              }
            }
          }
          return item;
        }).filter(Boolean); // Remove null entries if removing orphaned references
        
        if (JSON.stringify(updatedGalleryMedia) !== JSON.stringify(cardData.galleryMedia)) {
          updates.galleryMedia = updatedGalleryMedia;
          hasUpdates = true;
        }
      }
      
      // Check contentMedia
      if (cardData.contentMedia && cardData.contentMedia.length > 0) {
        const updatedContentMedia = cardData.contentMedia.map(mediaId => {
          if (mediaIdMapping.has(mediaId)) {
            const mapping = mediaIdMapping.get(mediaId)!;
            console.log(`Card ${cardDocId}: content mediaId ${mediaId} -> ${mapping.docId} (${mapping.filename})`);
            return mapping.docId;
          } else if (!mediaDocIds.has(mediaId)) {
            // This is an orphaned reference
            orphanedContentMediaIds.add(mediaId);
            console.warn(`Card ${cardDocId}: orphaned content mediaId ${mediaId}`);
            if (removeOrphanedReferences) {
              console.log(`Card ${cardDocId}: removing orphaned content mediaId ${mediaId}`);
              return null; // Will be filtered out
            }
          }
          return mediaId;
        }).filter(Boolean); // Remove null entries if removing orphaned references
        
        if (JSON.stringify(updatedContentMedia) !== JSON.stringify(cardData.contentMedia)) {
          updates.contentMedia = updatedContentMedia;
          hasUpdates = true;
        }
      }
      
      if (hasUpdates) {
        cardsToUpdate.push({
          docId: cardDocId,
          card: cardData,
          updates
        });
      }
    });
    
    // Update report with orphaned references
    report.orphanedReferences.coverImageId = Array.from(orphanedCoverImageIds);
    report.orphanedReferences.galleryMediaId = Array.from(orphanedGalleryMediaIds);
    report.orphanedReferences.contentMediaId = Array.from(orphanedContentMediaIds);
    
    console.log(`Found ${cardsToUpdate.length} cards that need updates`);
    console.log(`Found ${report.orphanedReferences.coverImageId.length} orphaned coverImageId references`);
    console.log(`Found ${report.orphanedReferences.galleryMediaId.length} orphaned gallery mediaId references`);
    console.log(`Found ${report.orphanedReferences.contentMediaId.length} orphaned content mediaId references`);
    
    if (cardsToUpdate.length === 0) {
      console.log('No cards need updates. Migration complete.');
      return report;
    }
    
    if (dryRun) {
      console.log('DRY RUN: Would update the following cards:');
      cardsToUpdate.forEach(({ docId, updates }) => {
        console.log(`  Card ${docId}:`, updates);
      });
      return report;
    }
    
    // Step 3: Update cards in batches
    console.log('Step 3: Updating cards...');
    const batchSize = 500; // Firestore batch limit
    
    for (let i = 0; i < cardsToUpdate.length; i += batchSize) {
      const batch = firestore.batch();
      const batchCards = cardsToUpdate.slice(i, i + batchSize);
      
      batchCards.forEach(({ docId, updates }) => {
        const cardRef = firestore.collection(CARDS_COLLECTION).doc(docId);
        batch.update(cardRef, {
          ...updates,
          updatedAt: Date.now()
        });
      });
      
      await batch.commit();
      report.cardsUpdated += batchCards.length;
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}: ${batchCards.length} cards (${report.cardsUpdated}/${cardsToUpdate.length} total)`);
    }
    
    console.log(`Migration complete! Updated ${report.cardsUpdated} cards.`);
    
    // Step 4: Optional - Remove id field from media documents
    console.log('Step 4: Removing id field from media documents...');
    const mediaToClean = Array.from(mediaIdMapping.values());
    let cleanedCount = 0;
    
    for (let i = 0; i < mediaToClean.length; i += batchSize) {
      const batch = firestore.batch();
      const batchMedia = mediaToClean.slice(i, i + batchSize);
      
      batchMedia.forEach(({ docId }) => {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(docId);
        batch.update(mediaRef, {
          id: FieldValue.delete(),
          updatedAt: Date.now()
        });
      });
      
      await batch.commit();
      cleanedCount += batchMedia.length;
      console.log(`Cleaned batch ${Math.floor(i / batchSize) + 1}: ${batchMedia.length} media documents (${cleanedCount}/${mediaToClean.length} total)`);
    }
    
    console.log(`Media cleanup complete! Removed id field from ${cleanedCount} media documents.`);
    
    // Print final report
    console.log('\n=== MIGRATION REPORT ===');
    console.log(`Media documents processed: ${report.mediaDocumentsProcessed}`);
    console.log(`Media documents with id field: ${report.mediaDocumentsWithId}`);
    console.log(`Media documents skipped: ${report.mediaDocumentsSkipped}`);
    console.log(`Cards processed: ${report.cardsProcessed}`);
    console.log(`Cards updated: ${report.cardsUpdated}`);
    console.log(`Orphaned coverImageId references: ${report.orphanedReferences.coverImageId.length}`);
    console.log(`Orphaned gallery mediaId references: ${report.orphanedReferences.galleryMediaId.length}`);
    console.log(`Orphaned content mediaId references: ${report.orphanedReferences.contentMediaId.length}`);
    console.log(`Errors: ${report.errors.length}`);
    
    if (report.errors.length > 0) {
      console.log('\nErrors encountered:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return report;
    
  } catch (error) {
    console.error('Migration failed:', error);
    report.errors.push(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Execute the migration
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    removeOrphanedReferences: args.includes('--remove-orphaned'),
    dryRun: args.includes('--dry-run')
  };
  
  migrateMediaToDocId(options)
    .then((report) => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateMediaToDocId }; 