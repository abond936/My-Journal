import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';
import { organizeTagsByDimension } from '@/lib/firebase/tagDataAccess';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';

async function testDimensionalLogic() {
  console.log('🧪 Testing Dimensional Logic...\n');

  try {
    // Get a card that has tags
    const cardSnapshot = await firestore.collection(CARDS_COLLECTION)
      .where('tags', '!=', [])
      .limit(1)
      .get();
    
    if (cardSnapshot.empty) {
      console.log('❌ No cards with tags found');
      return;
    }

    const card = cardSnapshot.docs[0].data();
    const cardId = cardSnapshot.docs[0].id;

    console.log(`📄 Testing card: ${cardId} - "${card.title}"`);
    console.log(`   Tags: [${(card.tags || []).join(', ')}]`);
    console.log(`   Who: [${(card.who || []).join(', ')}]`);
    console.log(`   What: [${(card.what || []).join(', ')}]`);
    console.log(`   When: [${(card.when || []).join(', ')}]`);
    console.log(`   Where: [${(card.where || []).join(', ')}]`);
    console.log(`   Reflection: [${(card.reflection || []).join(', ')}]`);
    console.log('');

    // Test the backfill script's logic
    console.log('🔍 Testing backfill script logic:');
    const backfillCondition = card.who && card.what && card.when && card.where && card.reflection;
    console.log(`   card.who && card.what && card.when && card.where && card.reflection = ${backfillCondition}`);
    console.log(`   card.who exists: ${!!card.who}`);
    console.log(`   card.what exists: ${!!card.what}`);
    console.log(`   card.when exists: ${!!card.when}`);
    console.log(`   card.where exists: ${!!card.where}`);
    console.log(`   card.reflection exists: ${!!card.reflection}`);
    console.log('');

    // Test the organizeTagsByDimension function
    if (card.tags && card.tags.length > 0) {
      console.log('🧪 Testing organizeTagsByDimension:');
      const organized = await organizeTagsByDimension(card.tags);
      console.log(`   Input tags: [${card.tags.join(', ')}]`);
      console.log(`   Organized result:`);
      console.log(`     Who: [${organized.who.join(', ')}]`);
      console.log(`     What: [${organized.what.join(', ')}]`);
      console.log(`     When: [${organized.when.join(', ')}]`);
      console.log(`     Where: [${organized.where.join(', ')}]`);
      console.log(`     Reflection: [${organized.reflection.join(', ')}]`);
    } else {
      console.log('❌ Card has no tags to test');
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testDimensionalLogic()
  .then(() => {
    console.log('🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 