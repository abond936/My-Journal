import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Debug dotenv loading
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = getFirestore(app);

// Sample photos for testing - using different categories and sizes
const samplePhotos = [
  // Landscape photos
  'https://picsum.photos/1200/800?random=1',
  'https://picsum.photos/1200/800?random=2',
  // Portrait photos
  'https://picsum.photos/800/1200?random=3',
  'https://picsum.photos/800/1200?random=4',
  // Square photos
  'https://picsum.photos/1000/1000?random=5',
  'https://picsum.photos/1000/1000?random=6',
  // Wide photos
  'https://picsum.photos/1600/900?random=7',
  'https://picsum.photos/1600/900?random=8',
  // Tall photos
  'https://picsum.photos/900/1600?random=9',
  'https://picsum.photos/900/1600?random=10'
];

async function addPhotosToEntries() {
  try {
    console.log('\nFetching first 10 entries...\n');
    
    const entriesRef = db.collection('entries');
    const snapshot = await entriesRef.limit(10).get();
    
    if (snapshot.empty) {
      console.log('No entries found');
      return;
    }

    console.log(`Found ${snapshot.size} entries\n`);
    
    for (const doc of snapshot.docs) {
      const entry = doc.data();
      console.log(`Processing entry: ${entry.title || doc.id}`);
      
      // Add 5 photos to each entry
      const selectedPhotos = samplePhotos
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      
      await doc.ref.update({
        media: selectedPhotos
      });
      
      console.log('Added 5 photos to entry:');
      console.log('Cover image:', selectedPhotos[0]);
      console.log('Additional images:', selectedPhotos.slice(1));
      console.log('---\n');
    }
    
    console.log('Successfully updated entries with photos');
    
  } catch (error) {
    console.error('Error adding photos to entries:', error);
  } finally {
    process.exit(0);
  }
}

addPhotosToEntries(); 