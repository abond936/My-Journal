import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { createInterface } from 'readline';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Initialize Firebase Admin SDK
getAdminApp();
const db = getFirestore();

// Helper for interactive command-line prompts
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Firestore Database Restore Script
 * 
 * Purpose: Restores the database from a JSON backup file.
 * WARNING: This script will OVERWRITE existing data.
 */
async function restoreDatabase(backupFilePath: string) {
  console.log('--- Starting Firestore Database Restore ---');
  
  // --- Safety Check 1: File Existence ---
  if (!fs.existsSync(backupFilePath)) {
    console.error(`\n[ERROR] Backup file not found at: ${backupFilePath}`);
    return;
  }
  console.log(`Found backup file: ${backupFilePath}`);

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
  const collections = Object.keys(backupData);

  console.log('\nThis script will restore the following collections:');
  for (const coll of collections) {
    console.log(`- ${coll} (${backupData[coll].length} documents)`);
  }
  
  // --- Safety Check 2: User Confirmation ---
  console.warn('\n\n[WARNING] This operation will OVERWRITE any existing data in these collections.');
  console.warn('It cannot be undone. Please be certain before proceeding.');
  
  const confirm = await askQuestion('Type "restore" to confirm and begin the process: ');
  if (confirm.toLowerCase() !== 'restore') {
    console.log('\nRestore cancelled. No changes were made.');
    return;
  }

  // --- Begin Restore Process ---
  console.log('\n--- Starting Restore ---');
  for (const collectionName of collections) {
    const docs = backupData[collectionName];
    if (!docs || docs.length === 0) {
      console.log(`Skipping empty collection: ${collectionName}`);
      continue;
    }
    
    console.log(`Restoring collection: ${collectionName}...`);
    const batchPromises = [];
    for (const doc of docs) {
      if (doc.id) {
        const docRef = db.collection(collectionName).doc(doc.id);
        const { id, ...data } = doc; // Separate id from the rest of the data
        batchPromises.push(docRef.set(data));
      }
    }
    
    await Promise.all(batchPromises);
    console.log(` -> Restored ${docs.length} documents to ${collectionName}.`);
  }

  console.log('\n--- Database Restore Completed Successfully ---');
}

// Main execution wrapper
async function main() {
  const backupFilePath = process.argv[2]; // Get file path from command-line argument

  if (!backupFilePath) {
    console.error('[ERROR] Please provide the path to the backup JSON file as an argument.');
    console.error('Usage: npx ts-node <script_path> <path_to_backup_file.json>');
    process.exitCode = 1;
    return;
  }

  try {
    await restoreDatabase(backupFilePath);
  } catch (error) {
    console.error('\n[FATAL] Database restore process failed.');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
    }
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

// Run the restore script
main(); 