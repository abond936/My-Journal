import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';

const MEDIA_COLLECTION = 'media';

interface BackfillReport {
  totalMediaDocs: number;
  processedMediaDocs: number;
  updatedMediaDocs: number;
  skippedMediaDocs: number;
  errors: string[];
  processingTime: number;
}

async function backfillMediaMetadata(dryRun: boolean = false): Promise<BackfillReport> {
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();
  const storage = adminApp.storage();
  const bucket = storage.bucket();

  const report: BackfillReport = {
    totalMediaDocs: 0,
    processedMediaDocs: 0,
    updatedMediaDocs: 0,
    skippedMediaDocs: 0,
    errors: [],
    processingTime: 0
  };

  const startTime = Date.now();

  console.log('🚀 Starting media metadata backfill...');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be written to the database.');
  }

  try {
    // Get all media documents
    console.log('📋 Fetching all media documents...');
    const mediaSnapshot = await firestore.collection(MEDIA_COLLECTION).get();
    report.totalMediaDocs = mediaSnapshot.size;
    
    console.log(`📊 Found ${report.totalMediaDocs} media documents to process`);

    if (report.totalMediaDocs === 0) {
      console.log('✅ No media documents found. Nothing to do.');
      return report;
    }

    // Process media documents in batches
    const batchSize = 50; // Process in smaller batches to avoid timeouts
    const batches = [];
    for (let i = 0; i < mediaSnapshot.docs.length; i += batchSize) {
      batches.push(mediaSnapshot.docs.slice(i, i + batchSize));
    }

    console.log(`🔄 Processing ${batches.length} batches of up to ${batchSize} media documents each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} media documents)`);

      const batchPromises = batch.map(async (doc) => {
        try {
          report.processedMediaDocs++;
          const mediaData = { docId: doc.id, ...doc.data() } as Media;

          // Skip if already has size and contentType
          if (mediaData.size && mediaData.contentType) {
            report.skippedMediaDocs++;
            return { mediaId: mediaData.docId, status: 'skipped', reason: 'Already has size and contentType' };
          }

          // Check if storage file exists
          if (!mediaData.storagePath) {
            const errorMsg = `Media ${mediaData.docId} missing storagePath`;
            report.errors.push(errorMsg);
            return { mediaId: mediaData.docId, status: 'error', reason: errorMsg };
          }

          const file = bucket.file(mediaData.storagePath);
          const [exists] = await file.exists();
          
          if (!exists) {
            const errorMsg = `Storage file not found for media ${mediaData.docId}: ${mediaData.storagePath}`;
            report.errors.push(errorMsg);
            return { mediaId: mediaData.docId, status: 'error', reason: errorMsg };
          }

          // Get file metadata
          const [metadata] = await file.getMetadata();
          const size = typeof metadata.size === 'string' ? parseInt(metadata.size) : (metadata.size || 0);
          const contentType = metadata.contentType || 'application/octet-stream';

          if (dryRun) {
            console.log(`  🔍 [DRY RUN] Would update media ${mediaData.docId}:`);
            console.log(`     Filename: ${mediaData.filename}`);
            console.log(`     Size: ${size} bytes (${formatFileSize(size)})`);
            console.log(`     Content Type: ${contentType}`);
            report.updatedMediaDocs++;
            return { mediaId: mediaData.docId, status: 'would_update', size, contentType };
          }

          // Update the media document
          const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaData.docId);
          await mediaRef.update({
            size,
            contentType,
            updatedAt: Date.now()
          });

          report.updatedMediaDocs++;
          return { mediaId: mediaData.docId, status: 'updated', size, contentType };

        } catch (error) {
          const errorMsg = `Failed to process media ${doc.id}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          report.errors.push(errorMsg);
          return { mediaId: doc.id, status: 'error', error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Log batch summary
      const batchUpdated = batchResults.filter(r => r.status === 'updated' || r.status === 'would_update').length;
      const batchSkipped = batchResults.filter(r => r.status === 'skipped').length;
      const batchErrors = batchResults.filter(r => r.status === 'error').length;
      
      console.log(`  ✅ Batch ${batchIndex + 1} complete: ${batchUpdated} updated, ${batchSkipped} skipped, ${batchErrors} errors`);
    }

    report.processingTime = Date.now() - startTime;

    // Final summary
    console.log('🎉 Media metadata backfill complete!');
    console.log('📊 Summary:');
    console.log(`   Total media documents: ${report.totalMediaDocs}`);
    console.log(`   Processed: ${report.processedMediaDocs}`);
    console.log(`   Updated: ${report.updatedMediaDocs}`);
    console.log(`   Skipped: ${report.skippedMediaDocs}`);
    console.log(`   Errors: ${report.errors.length}`);
    console.log(`   Processing time: ${(report.processingTime / 1000).toFixed(2)}s`);

    if (report.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      report.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (dryRun) {
      console.log('');
      console.log('🔍 This was a dry run. No changes were made to the database.');
      console.log('   Run without dryRun=true to apply the changes.');
    }

    return report;

  } catch (error) {
    report.processingTime = Date.now() - startTime;
    const errorMsg = `Backfill failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    report.errors.push(errorMsg);
    throw error;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Main execution wrapper
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔧 Media Metadata Backfill Script');
  console.log('==================================');
  console.log('');

  console.log('📋 Configuration:');
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    console.log('');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be made to the database');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const result = await backfillMediaMetadata(dryRun);
    
    console.log('');
    console.log('🎯 Final Result:');
    console.log(`   Success: ${result.errors.length === 0 ? 'YES' : 'NO'}`);
    console.log(`   Media documents updated: ${result.updatedMediaDocs}`);
    console.log(`   Media documents skipped: ${result.skippedMediaDocs}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Total time: ${(result.processingTime / 1000).toFixed(2)}s`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors occurred during processing. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Media metadata backfill completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

export { backfillMediaMetadata }; 