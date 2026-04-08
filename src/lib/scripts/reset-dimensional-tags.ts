import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const TAGS_COLLECTION = 'tags';
const CARDS_COLLECTION = 'cards';

async function resetDimensionalTags() {
  console.log('🔄 Resetting Dimensional Tags...\n');

  try {
    // Step 1: Set year-looking tags to 'when' dimension
    console.log('📅 Setting year-looking tags to "when" dimension...');
    
    const tagsSnapshot = await firestore.collection(TAGS_COLLECTION).get();
    const yearTags = [];
    
    for (const doc of tagsSnapshot.docs) {
      const tag = doc.data();
      const name = tag.name;
      
      // Check if tag name looks like a year (4 digits, optionally with 's' for decade)
      if (/^\d{4}s?$/.test(name)) {
        yearTags.push({ id: doc.id, name });
      }
    }
    
    console.log(`Found ${yearTags.length} year-looking tags:`);
    yearTags.forEach(tag => console.log(`  - ${tag.name} (${tag.id})`));
    
    // Update year tags to 'when' dimension
    if (yearTags.length > 0) {
      const batch = firestore.batch();
      yearTags.forEach(tag => {
        const tagRef = firestore.collection(TAGS_COLLECTION).doc(tag.id);
        batch.update(tagRef, { 
          dimension: 'when',
          updatedAt: Date.now()
        });
      });
      await batch.commit();
      console.log(`✅ Updated ${yearTags.length} tags to 'when' dimension`);
    }
    
    // Step 2: Clear all dimensional arrays on cards (except 'when' will be recalculated)
    console.log('\n🧹 Clearing dimensional arrays on all cards...');
    
    const cardsSnapshot = await firestore.collection(CARDS_COLLECTION).get();
    console.log(`Found ${cardsSnapshot.size} cards to update`);
    
    const batch = firestore.batch();
    let updateCount = 0;
    
    for (const doc of cardsSnapshot.docs) {
      const cardRef = firestore.collection(CARDS_COLLECTION).doc(doc.id);
      batch.update(cardRef, {
        who: [],
        what: [],
        when: [], // This will be recalculated when tags are updated
        where: [],
        reflection: FieldValue.delete(),
        updatedAt: Date.now()
      });
      updateCount++;
    }
    
    await batch.commit();
    console.log(`✅ Cleared dimensional arrays on ${updateCount} cards`);
    
    console.log('\n🎉 Reset complete!');
    console.log('\n📝 Next steps:');
    console.log('1. The "when" dimension is now set for year-looking tags');
    console.log('2. All dimensional arrays on cards have been cleared');
    console.log('3. When you update tags, the system will recalculate dimensions, ancestors, and filters');
    console.log('4. You can now manually set dimensions for other tags as needed');

  } catch (error) {
    console.error('❌ Error during reset:', error);
  }
}

// Run the script
resetDimensionalTags()
  .then(() => {
    console.log('🎉 Reset completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reset failed:', error);
    process.exit(1);
  }); 