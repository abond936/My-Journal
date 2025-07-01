import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';

async function debugTagDimensions() {
  console.log('🔍 Debugging Tag Dimensions...\n');

  try {
    // Get all tags and check their dimensions
    console.log('📊 Checking tag dimensions...');
    const tagsSnapshot = await firestore.collection(TAGS_COLLECTION).get();
    
    if (tagsSnapshot.empty) {
      console.log('❌ No tags found in database');
      return;
    }

    console.log(`✅ Found ${tagsSnapshot.size} tags\n`);

    const dimensionCounts = {
      who: 0,
      what: 0,
      when: 0,
      where: 0,
      reflection: 0,
      undefined: 0
    };

    const tagsByDimension = {
      who: [] as string[],
      what: [] as string[],
      when: [] as string[],
      where: [] as string[],
      reflection: [] as string[],
      undefined: [] as string[]
    };

    for (const doc of tagsSnapshot.docs) {
      const tag = doc.data();
      const dimension = tag.dimension || 'undefined';
      
      dimensionCounts[dimension]++;
      tagsByDimension[dimension].push(`${tag.name} (${doc.id})`);
    }

    console.log('📈 Dimension Distribution:');
    Object.entries(dimensionCounts).forEach(([dim, count]) => {
      console.log(`  ${dim}: ${count} tags`);
    });

    console.log('\n📋 Sample tags by dimension:');
    Object.entries(tagsByDimension).forEach(([dim, tags]) => {
      if (tags.length > 0) {
        console.log(`\n${dim.toUpperCase()}:`);
        tags.slice(0, 5).forEach(tag => console.log(`  - ${tag}`));
        if (tags.length > 5) {
          console.log(`  ... and ${tags.length - 5} more`);
        }
      }
    });

    // Check for the "parents" tag specifically
    console.log('\n🔍 Looking for "parents" tag...');
    const parentsTag = tagsSnapshot.docs.find(doc => {
      const tag = doc.data();
      return tag.name.toLowerCase().includes('parent');
    });

    if (parentsTag) {
      const tag = parentsTag.data();
      console.log(`✅ Found parents tag: "${tag.name}" (${parentsTag.id})`);
      console.log(`   Dimension: ${tag.dimension || 'undefined'}`);
      console.log(`   Parent ID: ${tag.parentId || 'none'}`);
    } else {
      console.log('❌ No tag found with "parent" in the name');
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug function
debugTagDimensions()
  .then(() => {
    console.log('🎉 Debug script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  }); 