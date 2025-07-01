#!/usr/bin/env tsx

/**
 * Runner script for backfilling dimensional tags
 * 
 * Usage:
 *   npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --dry-run
 *   npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --limit=10
 *   npm run tsx src/lib/scripts/run-backfill-dimensional-tags.ts -- --batch-size=100
 */

import { backfillDimensionalTags } from './firebase/backfill-dimensional-tags';

async function main() {
  console.log('🔧 Dimensional Tags Backfill Runner');
  console.log('====================================');
  console.log('');

  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '500'),
    limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || undefined
  };

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

main(); 