/**
 * @file diagnose-tags.ts
 * @description A non-destructive script to read the contents of the 'tags' collection for diagnostic purposes.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getAdminApp } from '@/lib/config/firebase/admin';

async function diagnoseTags() {
  console.log('--- Starting Tag Diagnosis Script ---');
  
  try {
    const adminApp = getAdminApp();
    const adminDb = adminApp.firestore();
    const tagsCollection = adminDb.collection('tags');

    console.log(`\nAttempting to connect to Firebase Project ID: ${process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID}`);
    
    const snapshot = await tagsCollection.get();
    const count = snapshot.size;

    console.log(`\nFound ${count} documents in the 'tags' collection.`);

    if (count === 0) {
      console.log('The collection appears to be empty.');
    } else {
      console.log('\n--- Sample Documents (first 5) ---');
      snapshot.docs.slice(0, 5).forEach(doc => {
        console.log(`\nDocument ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
      if (count > 5) {
        console.log(`\n...and ${count - 5} more documents.`);
      }
    }
  } catch (error) {
    console.error('\n--- SCRIPT FAILED ---');
    console.error('An error occurred while trying to read from Firestore:', error);
  }

  console.log('\n--- Diagnosis Complete ---');
}

diagnoseTags(); 