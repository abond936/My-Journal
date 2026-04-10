#!/usr/bin/env node
/**
 * Update tag counts based on unique cards (not tag applications)
 * 
 * This script uses the proper hierarchical counting logic:
 * cardCount = unique cards that use this tag directly OR any of its descendants
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts [options]
 * 
 * Options:
 *   --dry-run          Preview changes without making them (shows summary and sample mismatches)
 *   --apply            Actually apply the changes to fix mismatches
 *   --verbose          Show detailed progress information
 * 
 * Examples:
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/update-tag-counts.ts --apply
 */

import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

import { updateAllTagCardCounts, updateAllTagMediaCounts } from '@/lib/firebase/tagService';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();

async function dryRunTagCounts() {
  console.log('🔎 Dry run: Checking unique card count accuracy (no changes will be made) ...');

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
  const tagToDirectCardIds = new Map<string, Set<string>>();
  publishedCardsSnapshot.forEach(cardDoc => {
    const card = cardDoc.data() as Card;
    if (card.tags && card.tags.length > 0) {
      const uniqueTags = new Set(card.tags);
      uniqueTags.forEach(tagId => {
        if (!tagToDirectCardIds.has(tagId)) {
          tagToDirectCardIds.set(tagId, new Set());
        }
        tagToDirectCardIds.get(tagId)!.add(cardDoc.id);
      });
    }
  });

  // 3. Calculate correct unique card counts (bottom-up)
  const calculatedUniqueCardIds = new Map<string, Set<string>>();
  const calculatedCounts = new Map<string, number>();
  
  function computeUniqueCards(tagId: string): Set<string> {
    // Direct card assignments
    const directCardIds = tagToDirectCardIds.get(tagId) || new Set<string>();
    
    // Get unique cards from all children
    const tag = tagMap.get(tagId);
    if (!tag) {
      calculatedUniqueCardIds.set(tagId, directCardIds);
      calculatedCounts.set(tagId, directCardIds.size);
      return directCardIds;
    }
    
    const allUniqueCardIds = new Set(directCardIds);
    for (const childId of tag.children) {
      const childCardIds = computeUniqueCards(childId);
      childCardIds.forEach(cardId => allUniqueCardIds.add(cardId));
    }
    
    calculatedUniqueCardIds.set(tagId, allUniqueCardIds);
    calculatedCounts.set(tagId, allUniqueCardIds.size);
    return allUniqueCardIds;
  }
  
  // Start from root tags
  allTags.filter(t => !t.parentId).forEach(t => computeUniqueCards(t.docId!));

  // 4. Compare and summarize
  let incorrectCount = 0;
  const mismatches: { tag: Tag, current: number, expected: number, sampleCards?: string[] }[] = [];
  allTags.forEach(tag => {
    const expected = calculatedCounts.get(tag.docId!) || 0;
    const current = tag.cardCount || 0;
    if (expected !== current) {
      incorrectCount++;
      if (mismatches.length < 10) {
        const uniqueCardIds = calculatedUniqueCardIds.get(tag.docId!) || new Set();
        const sampleCards = Array.from(uniqueCardIds).slice(0, 3);
        mismatches.push({ 
          tag, 
          current, 
          expected, 
          sampleCards: sampleCards.length > 0 ? sampleCards : undefined 
        });
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
    mismatches.forEach(({ tag, current, expected, sampleCards }) => {
      console.log(`- Tag: ${tag.name} (${tag.docId}) | Current: ${current} | Expected: ${expected}`);
      if (sampleCards && sampleCards.length > 0) {
        console.log(`  Sample cards: ${sampleCards.join(', ')}`);
      }
    });
    if (incorrectCount > mismatches.length) {
      console.log(`...and ${incorrectCount - mismatches.length} more.`);
    }
  }
  console.log('');
}

async function resetTagCounts() {
  console.log('🔄 Starting tag count reset...');
  console.log('📊 This will recalculate all tag counts using unique card logic:');
  console.log('   cardCount = unique cards that use this tag directly OR any of its descendants');
  console.log('');

  try {
    const startTime = Date.now();
    
    // Use the proper function from tagService that implements bottom-up hierarchical counting
    const processedCards = await updateAllTagCardCounts();
    const processedMedia = await updateAllTagMediaCounts();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log(`✅ Card counts: ${processedCards} tags · Media counts: ${processedMedia} tags (${duration.toFixed(2)}s total)`);
    console.log('🎯 cardCount and mediaCount reset to hierarchical unique totals');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Tags processed (cards): ${processedCards}`);
    console.log(`   - Tags processed (media): ${processedMedia}`);
    console.log(`   - Time taken: ${duration.toFixed(2)}s`);

  } catch (error) {
    console.error('❌ An error occurred during the tag count reset:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose');
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');

if (isDryRun) {
  dryRunTagCounts()
    .then(() => {
      console.log('');
      console.log('📝 Dry run completed. No changes were made.');
      console.log('💡 To apply changes, run with --apply flag');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Script failed to run:', err);
      process.exit(1);
    });
} else if (isApply) {
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
} else {
  console.log('❌ Please specify either --dry-run or --apply');
  console.log('Usage:');
  console.log('  --dry-run    Preview changes without making them');
  console.log('  --apply      Actually apply the changes');
  process.exit(1);
} 