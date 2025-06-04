import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = getFirestore(app);

async function checkEntriesWithMedia() {
  try {
    const entriesRef = db.collection('entries');
    const snapshot = await entriesRef.get();
    
    console.log('\nChecking entries for media...\n');
    
    let totalEntries = 0;
    let entriesWithMedia = 0;
    
    snapshot.forEach(doc => {
      totalEntries++;
      const data = doc.data();
      if (data.media && data.media.length > 0) {
        entriesWithMedia++;
        console.log(`Entry ${doc.id} has ${data.media.length} media items:`);
        data.media.forEach((url: string, index: number) => {
          console.log(`  ${index + 1}. ${url}`);
        });
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`Total entries: ${totalEntries}`);
    console.log(`Entries with media: ${entriesWithMedia}`);
    console.log(`Entries without media: ${totalEntries - entriesWithMedia}`);
    
  } catch (error) {
    console.error('Error checking entries:', error);
  } finally {
    process.exit(0);
  }
}

checkEntriesWithMedia(); 