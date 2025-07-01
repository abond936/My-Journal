import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';

interface TagDimensionFix {
  id: string;
  name: string;
  currentDimension?: string;
  suggestedDimension?: string;
  needsUpdate: boolean;
}

async function fixTagDimensions() {
  console.log('🔧 Fixing Tag Dimensions...\n');

  try {
    // Get all tags
    const tagsSnapshot = await firestore.collection(TAGS_COLLECTION).get();
    
    if (tagsSnapshot.empty) {
      console.log('❌ No tags found in database');
      return;
    }

    console.log(`✅ Found ${tagsSnapshot.size} tags\n`);

    const tagFixes: TagDimensionFix[] = [];
    const dimensionCounts = {
      who: 0,
      what: 0,
      when: 0,
      where: 0,
      reflection: 0,
      undefined: 0
    };

    // Analyze each tag
    for (const doc of tagsSnapshot.docs) {
      const tag = doc.data() as Tag;
      const currentDimension = tag.dimension;
      
      // Count current dimensions
      if (currentDimension) {
        dimensionCounts[currentDimension]++;
      } else {
        dimensionCounts.undefined++;
      }

      // Suggest dimension based on tag name and hierarchy
      const suggestedDimension = suggestDimension(tag);
      
      // Only suggest changes for tags with undefined dimensions
      // Don't change existing dimensions - trust that they're correct
      const needsUpdate = !currentDimension;
      
      tagFixes.push({
        id: doc.id,
        name: tag.name,
        currentDimension,
        suggestedDimension,
        needsUpdate
      });
    }

    // Display current state
    console.log('📊 Current Dimension Distribution:');
    Object.entries(dimensionCounts).forEach(([dim, count]) => {
      console.log(`  ${dim}: ${count} tags`);
    });

    console.log('\n📋 Tags that need dimension updates:');
    const tagsNeedingUpdate = tagFixes.filter(t => t.needsUpdate);
    
    if (tagsNeedingUpdate.length === 0) {
      console.log('  ✅ All tags have correct dimensions!');
    } else {
      console.log(`  Found ${tagsNeedingUpdate.length} tags needing updates:\n`);
      
      tagsNeedingUpdate.slice(0, 20).forEach(tag => {
        console.log(`  - "${tag.name}" (${tag.id})`);
        console.log(`    Current: ${tag.currentDimension || 'undefined'}`);
        console.log(`    Suggested: ${tag.suggestedDimension || 'undefined'}`);
        console.log('');
      });

      if (tagsNeedingUpdate.length > 20) {
        console.log(`  ... and ${tagsNeedingUpdate.length - 20} more tags`);
      }
    }

    // Ask user if they want to proceed with updates
    console.log('\n⚠️  To apply dimension updates, run with --apply flag');
    console.log('   Example: npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/fix-tag-dimensions.ts --apply');

    // Check if --apply flag is present
    const shouldApply = process.argv.includes('--apply');
    
    if (shouldApply && tagsNeedingUpdate.length > 0) {
      console.log('\n🔄 Applying dimension updates...');
      
      const batch = firestore.batch();
      let updateCount = 0;
      
      for (const tagFix of tagsNeedingUpdate) {
        if (tagFix.suggestedDimension) {
          const tagRef = firestore.collection(TAGS_COLLECTION).doc(tagFix.id);
          batch.update(tagRef, { 
            dimension: tagFix.suggestedDimension,
            updatedAt: Date.now()
          });
          updateCount++;
        }
      }
      
      await batch.commit();
      console.log(`✅ Updated ${updateCount} tags with correct dimensions`);
    }

    console.log('\n✅ Tag dimension audit complete!');

  } catch (error) {
    console.error('❌ Error during tag dimension fix:', error);
  }
}

/**
 * Detects if a dimension is clearly wrong based on the tag name
 * This is very conservative - only flags obvious mismatches
 */
function isClearlyWrongDimension(tagName: string, currentDimension: string, suggestedDimension: string): boolean {
  const name = tagName.toLowerCase();
  
  // Very conservative rules - only flag obvious mismatches
  const clearlyWrong = [
    // Names of people should be 'who', not other dimensions
    { pattern: /^(john|jane|bob|alice|mark|greg|scot|jack|ellis)$/i, shouldBe: 'who' },
    
    // Years should be 'when', not other dimensions
    { pattern: /^\d{4}$/, shouldBe: 'when' },
    
    // Decades should be 'when', not other dimensions  
    { pattern: /^\d{4}s$/, shouldBe: 'when' },
    
    // Place names should be 'where', not other dimensions
    { pattern: /(road|street|avenue|drive|lane|place|city|town|state|country)$/i, shouldBe: 'where' }
  ];
  
  for (const rule of clearlyWrong) {
    if (rule.pattern.test(name) && currentDimension !== rule.shouldBe) {
      return true;
    }
  }
  
  // If no clear rule applies, don't suggest changes
  return false;
}

/**
 * Suggests a dimension for a tag based on its name and hierarchy
 */
function suggestDimension(tag: Tag): string | undefined {
  const name = tag.name.toLowerCase();
  
  // Common patterns for each dimension
  const whoPatterns = [
    'parent', 'child', 'family', 'friend', 'colleague', 'teacher', 'student',
    'boss', 'employee', 'neighbor', 'doctor', 'nurse', 'coach', 'mentor',
    'grandparent', 'sibling', 'cousin', 'aunt', 'uncle', 'spouse', 'partner'
  ];
  
  const whatPatterns = [
    'work', 'job', 'career', 'hobby', 'sport', 'music', 'art', 'cooking',
    'reading', 'writing', 'travel', 'exercise', 'study', 'project', 'event',
    'meeting', 'party', 'wedding', 'birthday', 'holiday', 'vacation'
  ];
  
  const whenPatterns = [
    'year', 'month', 'day', 'week', 'morning', 'afternoon', 'evening', 'night',
    'summer', 'winter', 'spring', 'fall', 'season', 'period', 'era', 'decade',
    'century', 'anniversary', 'birthday', 'graduation', 'retirement'
  ];
  
  const wherePatterns = [
    'home', 'work', 'school', 'office', 'hospital', 'store', 'restaurant',
    'park', 'beach', 'mountain', 'city', 'town', 'country', 'state', 'province',
    'room', 'kitchen', 'bedroom', 'garden', 'street', 'road', 'highway'
  ];
  
  const reflectionPatterns = [
    'thought', 'feeling', 'emotion', 'realization', 'insight', 'lesson',
    'learning', 'growth', 'change', 'decision', 'choice', 'regret', 'gratitude',
    'hope', 'fear', 'joy', 'sadness', 'anger', 'love', 'hate', 'worry'
  ];
  
  // Check patterns
  if (whoPatterns.some(pattern => name.includes(pattern))) return 'who';
  if (whatPatterns.some(pattern => name.includes(pattern))) return 'what';
  if (whenPatterns.some(pattern => name.includes(pattern))) return 'when';
  if (wherePatterns.some(pattern => name.includes(pattern))) return 'where';
  if (reflectionPatterns.some(pattern => name.includes(pattern))) return 'reflection';
  
  // If no pattern matches, return undefined (user will need to set manually)
  return undefined;
}

// Run the script
fixTagDimensions()
  .then(() => {
    console.log('🎉 Tag dimension fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tag dimension fix failed:', error);
    process.exit(1);
  }); 