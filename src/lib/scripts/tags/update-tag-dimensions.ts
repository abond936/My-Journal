#!/usr/bin/env node
/**
 * Update tag dimensions based on parent inheritance
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-dimensions.ts [options]
 * 
 * Options:
 *   --dry-run          Preview changes without making them
 *   --batch-size=N     Number of updates per batch (default: 500)
 *   --limit=N          Limit number of tags to process
 * 
 * Example:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-dimensions.ts --dry-run
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
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';

console.log('Firebase Admin SDK initialized successfully.');

interface TagWithParent extends Tag {
  parent?: TagWithParent;
}

interface UpdateOptions {
  dryRun?: boolean;
  batchSize?: number;
  limit?: number;
}

interface UpdateResult {
  totalTags: number;
  processedTags: number;
  updatedTags: number;
  skippedTags: number;
  errors: string[];
  processingTime: number;
}

/**
 * Updates tag dimensions based on parent inheritance.
 * If a tag has no dimension but its parent does, it will inherit the parent's dimension.
 */
export async function updateTagDimensions(options: UpdateOptions = {}): Promise<UpdateResult> {
  const {
    dryRun = false,
    batchSize = 500,
    limit
  } = options;

  const startTime = Date.now();
  const result: UpdateResult = {
    totalTags: 0,
    processedTags: 0,
    updatedTags: 0,
    skippedTags: 0,
    errors: [],
    processingTime: 0
  };

  console.log(`🔄 Starting tag dimension inheritance update...`);
  console.log(`📋 Options: dryRun=${dryRun}, batchSize=${batchSize}, limit=${limit || 'unlimited'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get all tags
    let query: any = firestore.collection(TAGS_COLLECTION);
    if (limit) {
      query = query.limit(limit);
    }

    const tagsSnapshot = await query.get();
    
    if (tagsSnapshot.empty) {
      console.log('❌ No tags found in database');
      return result;
    }

    result.totalTags = tagsSnapshot.size;
    console.log(`✅ Found ${result.totalTags} tags to process`);

    // Create a map of all tags
    const tagMap = new Map<string, TagWithParent>();
    tagsSnapshot.docs.forEach(doc => {
      tagMap.set(doc.id, { id: doc.id, ...doc.data() } as TagWithParent);
    });

    // Build parent relationships
    tagMap.forEach(tag => {
      if (tag.parentId) {
        tag.parent = tagMap.get(tag.parentId);
      }
    });

    // Find root tags (tags without parents)
    const rootTags = Array.from(tagMap.values()).filter(tag => !tag.parentId);
    console.log(`📊 Found ${rootTags.length} root tags`);

    // Process in batches
    let batch = firestore.batch();
    let batchCount = 0;

    // Function to process a tag and its children
    const processTag = async (tag: TagWithParent) => {
      try {
        result.processedTags++;
        let shouldUpdate = false;
        let newDimension = tag.dimension;

        // If tag has no dimension but has a parent with a dimension, inherit it
        if (!tag.dimension && tag.parent?.dimension) {
          newDimension = tag.parent.dimension;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          if (dryRun) {
            console.log(`  🔍 [DRY RUN] Would update tag ${tag.id}:`);
            console.log(`     Name: ${tag.name}`);
            console.log(`     Parent: ${tag.parent?.name} (${tag.parent?.id})`);
            console.log(`     New dimension: ${newDimension}`);
            result.updatedTags++;
          } else {
            const tagRef = firestore.collection(TAGS_COLLECTION).doc(tag.id);
            batch.update(tagRef, { 
              dimension: newDimension,
              updatedAt: Date.now()
            });
            batchCount++;
            result.updatedTags++;

            // If batch is full, commit it
            if (batchCount >= batchSize) {
              await batch.commit();
              batch = firestore.batch();
              batchCount = 0;
              console.log(`  ✅ Committed batch of ${batchSize} updates`);
            }
          }
        } else {
          result.skippedTags++;
        }

        // Process children
        const children = Array.from(tagMap.values()).filter(t => t.parentId === tag.id);
        for (const child of children) {
          await processTag(child);
        }
      } catch (error) {
        const errorMsg = `Error processing tag ${tag.id}: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    };

    // Process all root tags
    console.log('🌳 Processing tag tree...');
    for (const rootTag of rootTags) {
      await processTag(rootTag);
    }

    // Commit any remaining updates
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Committed final batch of ${batchCount} updates`);
    }

    result.processingTime = Date.now() - startTime;

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Total tags: ${result.totalTags}`);
    console.log(`   Processed: ${result.processedTags}`);
    console.log(`   Updated: ${result.updatedTags}`);
    console.log(`   Skipped: ${result.skippedTags}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Processing time: ${(result.processingTime / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (dryRun) {
      console.log('\n🔍 This was a dry run. No changes were made to the database.');
      console.log('   Run without dryRun=true to apply the changes.');
    }

    return result;

  } catch (error) {
    result.processingTime = Date.now() - startTime;
    const errorMsg = `Update failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: UpdateOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '500'),
    limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || undefined
  };

  console.log('🔧 Tag Dimension Inheritance Update Script');
  console.log('=========================================');
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
  }

  // Function to run the update
  const runUpdate = async () => {
    try {
      const result = await updateTagDimensions(options);
      
      console.log('');
      console.log('🎯 Final Result:');
      console.log(`   Success: ${result.updatedTags > 0 ? 'YES' : 'NO'}`);
      console.log(`   Tags updated: ${result.updatedTags}`);
      console.log(`   Tags skipped: ${result.skippedTags}`);
      console.log(`   Errors: ${result.errors.length}`);
      console.log(`   Total time: ${(result.processingTime / 1000).toFixed(2)}s`);
      
      if (result.errors.length > 0) {
        console.log('');
        console.log('❌ Errors occurred during processing. Check the output above for details.');
        process.exit(1);
      } else {
        console.log('');
        console.log('✅ Update completed successfully!');
        process.exit(0);
      }
    } catch (error) {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    }
  };

  // Execute immediately for dry run, wait 5 seconds for live mode
  if (options.dryRun) {
    runUpdate();
  } else {
    setTimeout(runUpdate, 5000);
  }
} 