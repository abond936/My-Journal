import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  }),
});

const db = getFirestore(app);

async function migrateEntries() {
  console.log('Starting entries migration...');
  
  try {
    // Get all entries
    const entriesRef = db.collection('entries');
    const snapshot = await entriesRef.get();
    
    console.log(`Found ${snapshot.size} entries to migrate`);
    
    let processedCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit
    
    // Process entries in batches
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(i, i + BATCH_LIMIT);
      
      for (const doc of batchDocs) {
        const data = doc.data();
        
        // Prepare update data
        const updateData = {
          // Set default values for new required fields
          type: 'story', // Default to story type
          status: 'published', // Default to published status
          date: data.createdAt || new Date(), // Use createdAt as date if available
        };
        
        // Add to batch
        batch.update(doc.ref, updateData);
      }
      
      // Commit this batch
      await batch.commit();
      processedCount += batchDocs.length;
      console.log(`Committed batch of ${batchDocs.length} entries (${processedCount}/${snapshot.size} total)`);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateEntries().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
}); 