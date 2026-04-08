import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { organizeTagsByDimension, calculateDerivedTagData } from '@/lib/firebase/tagService';
import { Card } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

interface BackfillOptions {
  dryRun?: boolean;
  batchSize?: number;
  limit?: number;
}

interface BackfillResult {
  totalCards: number;
  processedCards: number;
  updatedCards: number;
  skippedCards: number;
  totalMedia: number;
  processedMedia: number;
  updatedMedia: number;
  skippedMedia: number;
  errors: string[];
  processingTime: number;
}

/**
 * Backfills dimensional tag arrays (who, what, when, where, reflection) and filterTags for all existing cards.
 * This script takes the existing flat tags array and organizes it by dimension, and calculates inherited tags.
 */
export async function backfillDimensionalTags(options: BackfillOptions = {}): Promise<BackfillResult> {
  const {
    dryRun = false,
    batchSize = 500,
    limit
  } = options;

  const startTime = Date.now();
  const result: BackfillResult = {
    totalCards: 0,
    processedCards: 0,
    updatedCards: 0,
    skippedCards: 0,
    totalMedia: 0,
    processedMedia: 0,
    updatedMedia: 0,
    skippedMedia: 0,
    errors: [],
    processingTime: 0
  };

  console.log(`🚀 Starting dimensional tags and filterTags backfill...`);
  console.log(`📋 Options: dryRun=${dryRun}, batchSize=${batchSize}, limit=${limit || 'unlimited'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get all cards
    let query: any = firestore.collection(CARDS_COLLECTION);
    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    const allCards = snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    } as Card));

    result.totalCards = allCards.length;
    console.log(`📊 Found ${result.totalCards} cards to process`);

    if (result.totalCards === 0) {
      console.log('✅ No cards found. Nothing to do.');
      return result;
    }

    // Process cards in batches
    const batches = [];
    for (let i = 0; i < allCards.length; i += batchSize) {
      batches.push(allCards.slice(i, i + batchSize));
    }

    console.log(`🔄 Processing ${batches.length} batches of up to ${batchSize} cards each`);
    console.log('');

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} cards)`);

      const batchPromises = batch.map(async (card) => {
        try {
          result.processedCards++;

          // Skip cards that already have dimensional arrays populated AND filterTags
          if (card.who && card.who.length > 0 && 
              card.what && card.what.length > 0 && 
              card.when && card.when.length > 0 && 
              card.where && card.where.length > 0 && 
              card.reflection && card.reflection.length > 0 &&
              card.filterTags && Object.keys(card.filterTags).length > 0) {
            result.skippedCards++;
            return { cardId: card.docId, status: 'skipped', reason: 'Already has dimensional arrays and filterTags populated' };
          }

          // Skip cards with no tags
          if (!card.tags || card.tags.length === 0) {
            result.skippedCards++;
            return { cardId: card.docId, status: 'skipped', reason: 'No tags to organize' };
          }

          // Calculate all derived tag data using centralized function
          const { filterTags, dimensionalTags } = await calculateDerivedTagData(card.tags);

          // Check if any dimensional arrays would be populated
          const hasDimensionalTags = Object.values(dimensionalTags).some(arr => arr.length > 0);
          const hasFilterTags = Object.keys(filterTags).length > 0;
          
          if (!hasDimensionalTags && !hasFilterTags) {
            result.skippedCards++;
            return { cardId: card.docId, status: 'skipped', reason: 'No dimensional tags or filterTags found' };
          }

          if (dryRun) {
            console.log(`  🔍 [DRY RUN] Would update card ${card.docId}:`);
            console.log(`     Tags: [${card.tags.join(', ')}]`);
            console.log(`     FilterTags: ${Object.keys(filterTags).length} tags`);
            console.log(`     Who: [${dimensionalTags.who.join(', ')}]`);
            console.log(`     What: [${dimensionalTags.what.join(', ')}]`);
            console.log(`     When: [${dimensionalTags.when.join(', ')}]`);
            console.log(`     Where: [${dimensionalTags.where.join(', ')}]`);
            console.log(`     Reflection: [${dimensionalTags.reflection.join(', ')}]`);
            result.updatedCards++;
            return { cardId: card.docId, status: 'would_update', dimensionalTags, filterTags };
          }

          // Update the card
          const cardRef = firestore.collection(CARDS_COLLECTION).doc(card.docId);
          await cardRef.update({
            filterTags,
            who: dimensionalTags.who || [],
            what: dimensionalTags.what || [],
            when: dimensionalTags.when || [],
            where: dimensionalTags.where || [],
            reflection: dimensionalTags.reflection || [],
            updatedAt: Date.now()
          });

          result.updatedCards++;
          return { cardId: card.docId, status: 'updated', dimensionalTags, filterTags };

        } catch (error) {
          const errorMsg = `Failed to process card ${card.docId}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          return { cardId: card.docId, status: 'error', error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Log batch summary
      const batchUpdated = batchResults.filter(r => r.status === 'updated' || r.status === 'would_update').length;
      const batchSkipped = batchResults.filter(r => r.status === 'skipped').length;
      const batchErrors = batchResults.filter(r => r.status === 'error').length;
      
      console.log(`  ✅ Batch ${batchIndex + 1} complete: ${batchUpdated} updated, ${batchSkipped} skipped, ${batchErrors} errors`);
      console.log('');
    }

    // Process media in batches
    const mediaSnapshot = await firestore.collection(MEDIA_COLLECTION).get();
    const allMedia = mediaSnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    } as Media));
    result.totalMedia = allMedia.length;
    console.log('');
    console.log(`🖼️ Found ${result.totalMedia} media docs to process`);

    const mediaBatches = [];
    for (let i = 0; i < allMedia.length; i += batchSize) {
      mediaBatches.push(allMedia.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < mediaBatches.length; batchIndex++) {
      const batch = mediaBatches[batchIndex];
      console.log(`🖼️ Processing media batch ${batchIndex + 1}/${mediaBatches.length} (${batch.length} docs)`);

      const batchPromises = batch.map(async (m) => {
        try {
          result.processedMedia++;
          const directTags = (m.tags || []) as string[];

          if (!directTags || directTags.length === 0) {
            const hasAnyPresenceField =
              typeof m.hasTags === 'boolean' ||
              typeof m.hasWho === 'boolean' ||
              typeof m.hasWhat === 'boolean' ||
              typeof m.hasWhen === 'boolean' ||
              typeof m.hasWhere === 'boolean' ||
              typeof m.hasReflection === 'boolean';
            if (hasAnyPresenceField) {
              result.skippedMedia++;
              return;
            }
            if (!dryRun) {
              await firestore.collection(MEDIA_COLLECTION).doc(m.docId).update({
                hasTags: false,
                hasWho: false,
                hasWhat: false,
                hasWhen: false,
                hasWhere: false,
                hasReflection: false,
                updatedAt: Date.now(),
              });
            }
            result.updatedMedia++;
            return;
          }

          const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags);
          const payload = {
            tags: directTags,
            filterTags,
            who: dimensionalTags.who || [],
            what: dimensionalTags.what || [],
            when: dimensionalTags.when || [],
            where: dimensionalTags.where || [],
            reflection: dimensionalTags.reflection || [],
            hasTags: directTags.length > 0,
            hasWho: (dimensionalTags.who || []).length > 0,
            hasWhat: (dimensionalTags.what || []).length > 0,
            hasWhen: (dimensionalTags.when || []).length > 0,
            hasWhere: (dimensionalTags.where || []).length > 0,
            hasReflection: (dimensionalTags.reflection || []).length > 0,
            updatedAt: Date.now(),
          };

          if (!dryRun) {
            await firestore.collection(MEDIA_COLLECTION).doc(m.docId).update(payload);
          }
          result.updatedMedia++;
        } catch (error) {
          const errorMsg = `Failed to process media ${m.docId}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      });

      await Promise.all(batchPromises);
    }

    result.processingTime = Date.now() - startTime;

    // Final summary
    console.log('🎉 Backfill complete!');
    console.log('📊 Summary:');
    console.log(`   Total cards: ${result.totalCards}`);
    console.log(`   Processed: ${result.processedCards}`);
    console.log(`   Updated: ${result.updatedCards}`);
    console.log(`   Skipped: ${result.skippedCards}`);
    console.log(`   Total media: ${result.totalMedia}`);
    console.log(`   Processed media: ${result.processedMedia}`);
    console.log(`   Updated media: ${result.updatedMedia}`);
    console.log(`   Skipped media: ${result.skippedMedia}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Processing time: ${(result.processingTime / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (dryRun) {
      console.log('');
      console.log('🔍 This was a dry run. No changes were made to the database.');
      console.log('   Run without dryRun=true to apply the changes.');
    }

    return result;

  } catch (error) {
    result.processingTime = Date.now() - startTime;
    const errorMsg = `Backfill failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

// Main execution wrapper
async function main() {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '500'),
    limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || undefined
  };

  console.log('🔧 Dimensional Tags and FilterTags Backfill Script');
  console.log('==================================================');
  console.log('');

  console.log('📋 Configuration:');
  console.log(`   Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`   Batch size: ${options.batchSize}`);
  console.log(`   Limit: ${options.limit || 'unlimited'}`);
  console.log('');

  if (options.dryRun) {
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
    const result = await backfillDimensionalTags(options);
    
    console.log('');
    console.log('🎯 Final Result:');
    console.log(`   Success: ${result.updatedCards > 0 ? 'YES' : 'NO'}`);
    console.log(`   Cards updated: ${result.updatedCards}`);
    console.log(`   Cards skipped: ${result.skippedCards}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Total time: ${(result.processingTime / 1000).toFixed(2)}s`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors occurred during processing. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Backfill completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 