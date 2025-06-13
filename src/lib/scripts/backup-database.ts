import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Initialize Firebase Admin SDK
getAdminApp();

const db = getFirestore();

/**
 * Firestore Database Backup Script
 * 
 * Purpose: Creates a JSON backup of specified Firestore collections.
 * 
 * Output:
 * - Creates a timestamped JSON file in 'C:\\Users\\alanb\\CodeBase Backups'
 * - Includes collections: 'entries', 'albums', 'tags', 'users'
 */
async function backupDatabase() {
  console.log('--- Starting Firestore Database Backup ---');

  const collectionsToBackup = ['entries', 'albums', 'tags', 'users'];
  const backupData: { [key: string]: any[] } = {};
  
  // Set backup directory
  const backupDir = 'C:\\Users\\alanb\\CodeBase Backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Fetch data from each collection
  for (const collectionName of collectionsToBackup) {
    try {
      console.log(`Fetching collection: ${collectionName}...`);
      const snapshot = await db.collection(collectionName).get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      backupData[collectionName] = docs;
      console.log(` -> Found ${docs.length} documents.`);
    } catch (error) {
      console.error(`Error fetching collection ${collectionName}:`, error);
      // Continue to next collection if one fails
    }
  }

  // Create backup file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `firestore-backup-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFilename);

  // Write data to JSON file
  try {
    console.log(`\nWriting backup to: ${backupFilePath}`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    const stats = fs.statSync(backupFilePath);
    console.log(`Backup file created successfully.`);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error writing backup file:', error);
    throw error; // Propagate error to main handler
  }

  console.log('\n--- Firestore Database Backup Completed ---');
}

// Main execution wrapper
async function main() {
  try {
    await backupDatabase();
  } catch (error) {
    console.error('\nFATAL: Database backup process failed.');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
    }
    process.exitCode = 1; // Signal failure
  }
}

// Run the backup
main(); 