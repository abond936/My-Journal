#!/usr/bin/env node
/**
 * Update tag counts based on direct assignments and children's counts
 * 
 * This script uses the proper hierarchical counting logic:
 * cardCount = direct assignments + sum of immediate children's cardCounts
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts [options]
 * 
 * Options:
 *   --dry-run          Preview changes without making them (shows summary and sample mismatches)
 *   --verbose          Show detailed progress information
 * 
 * Example:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts --dry-run
 */

import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

import { updateAllTagCardCounts } from '@/lib/firebase/tagService';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();

async function dryRunTagCounts() {
  console.log('🔎 Dry run: Checking tag count accuracy (no changes will be made) ...');

  // 1. Fetch all tags and build a map
  const tagsCollection = firestore.collection('tags');
  const cardsCollection = firestore.collection('cards');
  const allTagsSnapshot = await tagsCollection.get();
  const allTags: Tag[] = [];
  const tagMap = new Map<string, Tag & { children: string[] }>();
  allTagsSnapshot.forEach(doc => {
    const tag = { docId: doc.id, children: [], ...doc.data() } as Tag & { children: string[] };
    allTags.push(tag);
    tagMap.set(doc.id, tag);
  });
  // Build children arrays
  allTags.forEach(tag => {
    if (tag.parentId && tagMap.has(tag.parentId)) {
      tagMap.get(tag.parentId)!.children.push(tag.docId!);
    }
  });

  // 2. Fetch all published cards and build tag-to-card map
  const publishedCardsSnapshot = await cardsCollection.where('status', '==', 'published').get();
  const tagToDirectCardCount = new Map<string, number>();
  publishedCardsSnapshot.forEach(cardDoc => {
    const card = cardDoc.data() as Card;
    if (card.tags && card.tags.length > 0) {
      const uniqueTags = new Set(card.tags);
      uniqueTags.forEach(tagId => {
        tagToDirectCardCount.set(tagId, (tagToDirectCardCount.get(tagId) || 0) + 1);
      });
    }
  });

  // 3. Calculate correct hierarchical counts (bottom-up)
  const calculatedCounts = new Map<string, number>();
  function computeCount(tagId: string): number {
    // Direct assignments
    const direct = tagToDirectCardCount.get(tagId) || 0;
    // Sum of children's counts
    const tag = tagMap.get(tagId);
    if (!tag) return direct;
    let childrenTotal = 0;
    for (const childId of tag.children) {
      childrenTotal += computeCount(childId);
    }
    const total = direct + childrenTotal;
    calculatedCounts.set(tagId, total);
    return total;
  }
  // Start from root tags
  allTags.filter(t => !t.parentId).forEach(t => computeCount(t.docId!));

  // 4. Compare and summarize
  let incorrectCount = 0;
  const mismatches: { tag: Tag, current: number, expected: number }[] = [];
  allTags.forEach(tag => {
    const expected = calculatedCounts.get(tag.docId!) || 0;
    const current = tag.cardCount || 0;
    if (expected !== current) {
      incorrectCount++;
      if (mismatches.length < 10) {
        mismatches.push({ tag, current, expected });
      }
    }
  });

  // 5. Print summary
  console.log('');
  console.log(`Checked ${allTags.length} tags.`);
  if (incorrectCount === 0) {
    console.log('✅ All tag counts are correct!');
  } else {
    console.log(`❌ ${incorrectCount} tags have incorrect counts.`);
    console.log('Sample mismatches:');
    mismatches.forEach(({ tag, current, expected }) => {
      console.log(`- Tag: ${tag.name} (${tag.docId}) | Current: ${current} | Expected: ${expected}`);
    });
    if (incorrectCount > mismatches.length) {
      console.log(`...and ${incorrectCount - mismatches.length} more.`);
    }
  }
  console.log('');
}

async function resetTagCounts() {
  console.log('🔄 Starting tag count reset...');
  console.log('📊 This will recalculate all tag counts using proper hierarchical logic:');
  console.log('   cardCount = direct assignments + sum of immediate children\'s cardCounts');
  console.log('');

  try {
    const startTime = Date.now();
    
    // Use the proper function from tagService that implements bottom-up hierarchical counting
    const processedCount = await updateAllTagCardCounts();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log(`✅ Successfully updated ${processedCount} tags in ${duration.toFixed(2)} seconds`);
    console.log('🎯 All tag counts have been reset to accurate values');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Tags processed: ${processedCount}`);
    console.log(`   - Time taken: ${duration.toFixed(2)}s`);
    console.log(`   - Average: ${(processedCount / duration).toFixed(2)} tags/second`);

  } catch (error) {
    console.error('❌ An error occurred during the tag count reset:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose');
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  dryRunTagCounts()
    .then(() => {
      console.log('');
      console.log('📝 Dry run completed. No changes were made.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Script failed to run:', err);
      process.exit(1);
    });
} else {
  if (isVerbose) {
    console.log('🔍 Verbose mode enabled - showing detailed progress');
  }
  resetTagCounts()
    .then(() => {
      console.log('');
      console.log('🎉 Tag count reset completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Script failed to run:', err);
      process.exit(1);
    });
} 