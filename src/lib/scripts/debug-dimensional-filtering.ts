import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { organizeTagsByDimension } from '@/lib/firebase/tagDataAccess';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';

async function debugDimensionalFiltering() {
  console.log('🔍 Debugging Dimensional Filtering...\n');

  try {
    // 1. Get a sample of cards to see what's in the dimensional arrays
    console.log('📊 Checking dimensional arrays in existing cards...');
    const sampleSnapshot = await firestore.collection(CARDS_COLLECTION).limit(5).get();
    
    if (sampleSnapshot.empty) {
      console.log('❌ No cards found in database');
      return;
    }

    console.log(`✅ Found ${sampleSnapshot.size} sample cards\n`);

    for (const doc of sampleSnapshot.docs) {
      const card = doc.data();
      console.log(`📄 Card: ${doc.id} - "${card.title}"`);
      console.log(`   Tags: [${(card.tags || []).join(', ')}]`);
      console.log(`   Who: [${(card.who || []).join(', ')}]`);
      console.log(`   What: [${(card.what || []).join(', ')}]`);
      console.log(`   When: [${(card.when || []).join(', ')}]`);
      console.log(`   Where: [${(card.where || []).join(', ')}]`);
      console.log(`   Reflection: [${(card.reflection || []).join(', ')}]`);
      console.log('');
    }

    // 2. Test the organizeTagsByDimension function with some sample tags
    console.log('🧪 Testing organizeTagsByDimension function...');
    
    // Get a few sample tags from the database
    const tagsSnapshot = await firestore.collection('tags').limit(10).get();
    const sampleTags = tagsSnapshot.docs.map(doc => doc.id);
    
    console.log(`Sample tag IDs: [${sampleTags.join(', ')}]`);
    
    const organized = await organizeTagsByDimension(sampleTags);
    console.log('Organized result:');
    console.log(`  Who: [${organized.who.join(', ')}]`);
    console.log(`  What: [${organized.what.join(', ')}]`);
    console.log(`  When: [${organized.when.join(', ')}]`);
    console.log(`  Where: [${organized.where.join(', ')}]`);
    console.log(`  Reflection: [${organized.reflection.join(', ')}]`);
    console.log('');

    // 3. Test a specific dimensional filter query
    console.log('🔍 Testing dimensional filter query...');
    
    // Find a card that has some "who" tags
    const cardsWithWho = await firestore.collection(CARDS_COLLECTION)
      .where('who', '!=', [])
      .limit(1)
      .get();
    
    if (!cardsWithWho.empty) {
      const testCard = cardsWithWho.docs[0].data();
      const whoTagIds = testCard.who || [];
      
      if (whoTagIds.length > 0) {
        console.log(`Testing filter with who tags: [${whoTagIds.join(', ')}]`);
        
        const filterQuery = await firestore.collection(CARDS_COLLECTION)
          .where('who', 'array-contains-any', whoTagIds)
          .limit(5)
          .get();
        
        console.log(`✅ Found ${filterQuery.size} cards with those who tags:`);
        filterQuery.docs.forEach(doc => {
          const card = doc.data();
          console.log(`  - ${doc.id}: "${card.title}" (who: [${(card.who || []).join(', ')}])`);
        });
      } else {
        console.log('❌ No who tags found in test card');
      }
    } else {
      console.log('❌ No cards found with who tags');
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug function
debugDimensionalFiltering()
  .then(() => {
    console.log('🎉 Debug script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  }); 