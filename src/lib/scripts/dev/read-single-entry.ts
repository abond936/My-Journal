import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
const envPath = resolve(process.cwd(), '.env');
console.log(`Loading .env file from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file', result.error);
  process.exit(1);
}
console.log('Dotenv config loaded successfully.');

import { getAdminApp } from '@/lib/config/firebase/admin';

async function readFirstEntry() {
  console.log('Initializing Firebase Admin...');
  try {
    const adminApp = getAdminApp();
    const firestore = adminApp.firestore();
    console.log('Firebase Admin initialized.');

    const entriesCollection = firestore.collection('entries');
    console.log("Fetching from 'entries' collection...");

    const snapshot = await entriesCollection.limit(1).get();

    if (snapshot.empty) {
      console.log('No documents found in the "entries" collection.');
      return;
    }

    console.log('Found a document. Data:');
    const doc = snapshot.docs[0];
    const data = doc.data();

    // Using console.dir for better object inspection
    console.dir(data, { depth: null });

  } catch (error) {
    console.error('Failed to read from Firestore:', error);
    process.exit(1);
  }
}

readFirstEntry(); 