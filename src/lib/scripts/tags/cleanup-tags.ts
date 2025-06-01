import { config } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Tag } from '../data/tags';

// Load environment variables
config();

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID);
console.log('FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL);
console.log('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY (first 30 chars):', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 30));

// Initialize Firebase Admin with environment variables
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  }),
});

const db = getFirestore(app);

async function cleanupTags() {
  try {
    console.log('Starting tag cleanup...');
    const tagsRef = db.collection('tags');
    const snapshot = await tagsRef.get();
    
    // Find tags with question marks
    const tagsToDelete = snapshot.docs.filter(doc => {
      const tag = doc.data() as Tag;
      return tag.name.includes('?');
    });

    if (tagsToDelete.length === 0) {
      console.log('No tags with question marks found.');
      return;
    }

    console.log(`Found ${tagsToDelete.length} tags with question marks:`);
    tagsToDelete.forEach(doc => {
      const tag = doc.data() as Tag;
      console.log(`- "${tag.name}" (ID: ${doc.id}, Dimension: ${tag.dimension})`);
    });

    // Confirm with user
    console.log('\nAbout to delete these tags. Press Ctrl+C to cancel or wait 5 seconds to proceed...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create a batch operation
    const batch = db.batch();
    
    // Add delete operations to batch
    tagsToDelete.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();
    
    console.log('\nSuccessfully deleted all tags with question marks.');
    
  } catch (error) {
    console.error('Error during tag cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTags().then(() => {
  console.log('Cleanup completed.');
  process.exit(0);
}); 