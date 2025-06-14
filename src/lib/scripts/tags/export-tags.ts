/**
 * @file export-tags.ts
 * @description A script to export all tags from the Firestore 'tags' collection to a CSV file.
 * This script is designed to handle inconsistent data models by dynamically generating
 * a header row that includes all unique fields found across all tag documents.
 * 
 * @requires FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
 * @requires FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
 * @requires FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
 * 
 * @usage npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/tags/export-tags.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

console.log('Starting tag export script...');

async function exportTags() {
  try {
    // Initialize Firebase Admin
    console.log('Initializing Firebase Admin...');
    getAdminApp();
    const db = getFirestore();
    const tagsCollection = db.collection('tags');

    // 1. Fetch all documents from the tags collection
    console.log('Fetching all tags from the database...');
    const snapshot = await tagsCollection.get();
    if (snapshot.empty) {
      console.log('No tags found. Exiting.');
      return;
    }
    console.log(`Found ${snapshot.size} tags.`);

    const tagsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 2. Dynamically determine all unique field names for the header
    console.log('Determining all unique fields for CSV header...');
    const allKeys = new Set<string>();
    allKeys.add('id'); // Ensure 'id' is always the first column
    tagsData.forEach(tag => {
      Object.keys(tag).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);
    console.log('CSV Headers:', headers);

    // 3. Prepare the data for CSV stringification
    // The 'columns' option ensures all rows have the same set of properties in the same order.
    const csvOutput = stringify(tagsData, {
      header: true,
      columns: headers,
    });

    // 4. Write the CSV string to a file
    const outputPath = resolve(process.cwd(), 'tags-export.csv');
    console.log(`Writing data to ${outputPath}...`);
    fs.writeFileSync(outputPath, csvOutput);

    console.log('✅ Tag export completed successfully!');

  } catch (error) {
    console.error('❌ An error occurred during the export process:');
    console.error(error);
    process.exit(1);
  }
}

exportTags(); 