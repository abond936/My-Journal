/**
 * Firestore Backup Script
 * 
 * Purpose: Creates a backup of Firestore collections (tags and entries) to OneDrive
 * 
 * Required Environment Variables:
 * - ONEDRIVE_PATH: Path to OneDrive root directory
 * - FIREBASE_SERVICE_ACCOUNT_PROJECT_ID: Firebase project ID
 * - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: Firebase service account private key
 * - FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: Firebase service account client email
 * 
 * Output:
 * - Creates a timestamped backup directory in OneDrive/Firebase Backups/
 * - Saves backup as JSON file
 * - Maintains last 5 backups
 * - Logs operations to temp/firebase/backup-output.txt
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Debug dotenv loading
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

import { adminDb } from '@/lib/config/firebase/admin';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('ONEDRIVE_PATH:', process.env.ONEDRIVE_PATH);
console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID);
console.log('FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL);
console.log('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY (first 30 chars):', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 30));

async function backupFirestore() {
  let output = '';
  let success = true;
  
  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.env.ONEDRIVE_PATH || '', 'Firebase Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.txt`);

    output += `\n=== Starting Firestore Backup ===\n`;
    output += `Timestamp: ${new Date().toISOString()}\n`;
    output += `Backup path: ${backupFile}\n`;

    // Get all collections
    const collections = ['tags', 'entries'];
    const backupData: { [key: string]: any[] } = {};

    // Backup each collection
    for (const collectionName of collections) {
      output += `\nBacking up collection: ${collectionName}\n`;
      const snapshot = await adminDb.collection(collectionName).get();
      backupData[collectionName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      output += `Found ${snapshot.size} documents\n`;
    }

    // Save backup to file in OneDrive
    const backupFilePath = path.join(backupDir, `firestore-backup.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    output += `\nBackup saved to: ${backupFilePath}\n`;

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      collections: Object.keys(backupData),
      documentCounts: Object.fromEntries(
        Object.entries(backupData).map(([key, value]) => [key, value.length])
      ),
      backupSize: fs.statSync(backupFilePath).size
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Clean up old backups (keep last 5)
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-'))
      .sort()
      .reverse();

    if (backups.length > 5) {
      output += `\n=== Cleaning up old backups ===\n`;
      for (const oldBackup of backups.slice(5)) {
        const oldBackupPath = path.join(backupDir, oldBackup);
        fs.rmSync(oldBackupPath, { recursive: true, force: true });
        output += `Deleted old backup: ${oldBackup}\n`;
      }
    }

    output += `\nBackup completed successfully\n`;

    // Write backup to file
    fs.writeFileSync(backupFile, output);
    console.log(`Backup output written to ${backupFile}`);

  } catch (error) {
    success = false;
    output += `\nError during backup:\n`;
    if (error instanceof Error) {
      output += `Message: ${error.message}\n`;
      output += `Stack: ${error.stack}\n`;
    } else {
      output += `${error}\n`;
    }
  } finally {
    // Exit with appropriate status code
    process.exit(success ? 0 : 1);
  }
}

backupFirestore(); 