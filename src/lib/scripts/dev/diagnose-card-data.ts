import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';
import { getAdminApp } from '@/lib/config/firebase/admin';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function diagnoseCard(cardId: string) {
  console.log(`Attempting to diagnose card with ID: ${cardId}`);
  try {
    getAdminApp(); // Ensure Firebase is initialized
    const firestore = admin.firestore();
    const cardRef = firestore.collection('cards').doc(cardId);
    const doc = await cardRef.get();

    if (!doc.exists) {
      console.error(`\n❌ Error: Card with ID "${cardId}" not found.`);
      return;
    }

    const cardData = doc.data();
    console.log(`\n✅ Found Card: ${cardId}`);
    console.log('----------------------------------------');
    console.log('Full Card Data:');
    console.log(JSON.stringify(cardData, null, 2));
    console.log('----------------------------------------');
    
    if (cardData && cardData.galleryMedia) {
        console.log('Gallery Media Field Contents:');
        console.log(JSON.stringify(cardData.galleryMedia, null, 2));
        console.log('----------------------------------------');
    } else {
        console.log('Card does not have a "galleryMedia" field.');
    }

  } catch (error) {
    console.error(`\n❌ A critical error occurred during diagnosis for card ID ${cardId}:`, error);
    process.exit(1);
  }
}

const cardIdToDiagnose = 'X5DmcICdPPQ1dFHFiVxi';
diagnoseCard(cardIdToDiagnose).then(() => {
  console.log('\nDiagnosis script finished.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
}); 