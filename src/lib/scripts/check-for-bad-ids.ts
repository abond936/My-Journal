/**
 * This script scans the 'entries' and 'albums' collections in Firestore
 * to identify documents that contain an 'id' field within their data.
 * This is a data integrity issue, as the document ID should not be part
 * of the document's own data fields.
 *
 * This script is READ-ONLY and does not make any changes to the data.
 *
 * Required environment variables:
 * - FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
 * - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
 * - FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
 *
 * To run this script:
 * npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/check-for-bad-ids.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
console.log('Loading environment variables...');
const result = dotenv.config({ path: resolve(process.cwd(), '.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}
console.log('Environment variables loaded successfully.');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID) {
    console.error('Missing required Firebase environment variables.');
    process.exit(1);
}


// Firebase Admin must be imported AFTER dotenv has loaded the environment variables.
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();

async function scanCollection(collectionName: string) {
  console.log(`\nScanning collection: '${collectionName}'...`);
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  const problematicDocs: string[] = [];

  if (snapshot.empty) {
    console.log(`Collection '${collectionName}' is empty. Nothing to scan.`);
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data && 'id' in data) {
      problematicDocs.push(doc.id);
      console.warn(`  [!] Found problematic document in '${collectionName}'. ID: ${doc.id}`);
    }
  });

  if (problematicDocs.length > 0) {
    console.log(`\nSummary for '${collectionName}':`);
    console.log(`Found ${problematicDocs.length} documents with an 'id' field in their data.`);
    console.log('Problematic document IDs:', problematicDocs);
  } else {
    console.log(`Scan complete. No documents with an 'id' field found in '${collectionName}'.`);
  }
}

async function main() {
  console.log('Starting data integrity scan...');
  try {
    await scanCollection('entries');
    await scanCollection('albums');
    console.log('\nScan finished.');
  } catch (error) {
    console.error('\nAn error occurred during the scan:', error);
    process.exit(1);
  }
}

main(); 