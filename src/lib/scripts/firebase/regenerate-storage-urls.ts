import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables (.env.local overrides .env for local secrets)
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';

const MEDIA_COLLECTION = 'media';

interface RegenerateReport {
  totalMediaDocs: number;
  processedMediaDocs: number;
  updatedMediaDocs: number;
  skippedMediaDocs: number;
  errors: string[];
  processingTime: number;
}

async function regenerateStorageUrls(dryRun: boolean = false): Promise<RegenerateReport> {
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();
  const storage = adminApp.storage();
  const bucket = storage.bucket();

  const report: RegenerateReport = {
    totalMediaDocs: 0,
    processedMediaDocs: 0,
    updatedMediaDocs: 0,
    skippedMediaDocs: 0,
    errors: [],
    processingTime: 0,
  };

  const startTime = Date.now();

  console.log('🚀 Regenerating storage URLs (v4 signed URLs)...');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be written to the database.');
  }

  try {
    console.log('📋 Fetching all media documents...');
    const mediaSnapshot = await firestore.collection(MEDIA_COLLECTION).get();
    report.totalMediaDocs = mediaSnapshot.size;

    console.log(`📊 Found ${report.totalMediaDocs} media documents to process`);

    if (report.totalMediaDocs === 0) {
      console.log('✅ No media documents found. Nothing to do.');
      return report;
    }

    const batchSize = 50;
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

          if (!mediaData.storagePath) {
            const errorMsg = `Media ${mediaData.docId} missing storagePath`;
            report.errors.push(errorMsg);
            return { mediaId: mediaData.docId, status: 'error' as const, reason: errorMsg };
          }

          const file = bucket.file(mediaData.storagePath);
          const [exists] = await file.exists();

          if (!exists) {
            const errorMsg = `Storage file not found for media ${mediaData.docId}: ${mediaData.storagePath}`;
            report.errors.push(errorMsg);
            return { mediaId: mediaData.docId, status: 'error' as const, reason: errorMsg };
          }

          const [newUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
            version: 'v4',
          });

          if (dryRun) {
            console.log(`  🔍 [DRY RUN] Would update media ${mediaData.docId}: ${mediaData.filename}`);
            report.updatedMediaDocs++;
            return { mediaId: mediaData.docId, status: 'would_update' as const };
          }

          const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaData.docId);
          await mediaRef.update({
            storageUrl: newUrl,
            updatedAt: Date.now(),
          });

          report.updatedMediaDocs++;
          return { mediaId: mediaData.docId, status: 'updated' as const };
        } catch (error) {
          const errorMsg = `Failed to process media ${doc.id}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          report.errors.push(errorMsg);
          return { mediaId: doc.id, status: 'error' as const, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchUpdated = batchResults.filter(
        (r) => r.status === 'updated' || r.status === 'would_update'
      ).length;
      const batchErrors = batchResults.filter((r) => r.status === 'error').length;
      console.log(`  ✅ Batch ${batchIndex + 1} complete: ${batchUpdated} updated, ${batchErrors} errors`);
    }

    report.processingTime = Date.now() - startTime;

    console.log('');
    console.log('🎉 Storage URL regeneration complete!');
    console.log('📊 Summary:');
    console.log(`   Total media documents: ${report.totalMediaDocs}`);
    console.log(`   Processed: ${report.processedMediaDocs}`);
    console.log(`   Updated: ${report.updatedMediaDocs}`);
    console.log(`   Errors: ${report.errors.length}`);
    console.log(`   Processing time: ${(report.processingTime / 1000).toFixed(2)}s`);

    if (report.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      report.errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (dryRun) {
      console.log('');
      console.log('🔍 This was a dry run. No changes were made to the database.');
      console.log('   Run without --dry-run to apply the changes.');
    }

    return report;
  } catch (error) {
    report.processingTime = Date.now() - startTime;
    const errorMsg = `Regeneration failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    report.errors.push(errorMsg);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔧 Regenerate Storage URLs (v4)');
  console.log('================================');
  console.log('');
  console.log('📋 Configuration:');
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  if (!dryRun) {
    console.log('⚠️  LIVE MODE - Firestore will be updated');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');
    await new Promise((r) => setTimeout(r, 5000));
  }

  try {
    const result = await regenerateStorageUrls(dryRun);

    console.log('');
    console.log('🎯 Final Result:');
    console.log(`   Success: ${result.errors.length === 0 ? 'YES' : 'NO'}`);
    console.log(`   Media documents updated: ${result.updatedMediaDocs}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Regeneration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

main();

export { regenerateStorageUrls };
