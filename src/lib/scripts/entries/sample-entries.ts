import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing Firebase admin
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

// Now import Firebase admin after environment variables are loaded
import { adminDb } from '../config/firebaseAdmin';

// Debug logging for Firebase environment variables
console.log('\nAdmin Firebase variables:');
console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Not set');

async function sampleEntries() {
  try {
    console.log('\nSampling entries from database...');
    
    // Get a sample of entries
    const snapshot = await adminDb.collection('entries')
      .limit(3)
      .get();
    
    console.log(`Found ${snapshot.size} entries\n`);
    
    // Display each entry's structure
    let index = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`Entry ${index + 1}:`);
      console.log('ID:', doc.id);
      console.log('Fields:', Object.keys(data).sort().join(', '));
      
      // Print each field and its type
      console.log('\nField Details:');
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value}${Array.isArray(value) ? ' (array)' : ''}`);
      });
      
      console.log('\n---\n');
      index++;
    }

  } catch (error) {
    console.error('Error sampling entries:', error);
    process.exit(1);
  }
}

sampleEntries(); 