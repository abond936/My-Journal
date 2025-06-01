import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

async function verifyCollection(collectionName: string): Promise<number> {
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count;
}

async function migrateCollections() {
  let output = '';
  try {
    output += '=== Starting Collection Migration ===\n\n';

    // 1. Verify initial state
    const initialTagsCount = await verifyCollection('tags');
    const initialEntriesCount = await verifyCollection('entries');

    output += `Initial state:\n`;
    output += `Tags collection: ${initialTagsCount} documents\n`;
    output += `Entries collection: ${initialEntriesCount} documents\n\n`;

    // 2. Verify data integrity
    output += '=== Verifying Data Integrity ===\n';
    
    // Check tags collection
    const tagsSnapshot = await db.collection('tags').get();
    const tagIds = new Set(tagsSnapshot.docs.map(doc => doc.id));
    output += `Tags collection: ${tagsSnapshot.size} documents\n`;
    
    // Check entries collection
    const entriesSnapshot = await db.collection('entries').get();
    const entriesWithInvalidTags = entriesSnapshot.docs.filter(doc => {
      const tags = doc.data().tags || [];
      return tags.some((tagId: string) => !tagIds.has(tagId));
    });
    
    output += `Entries collection: ${entriesSnapshot.size} documents\n`;
    if (entriesWithInvalidTags.length > 0) {
      output += `Warning: Found ${entriesWithInvalidTags.length} entries with invalid tag references\n`;
      entriesWithInvalidTags.forEach(doc => {
        output += `- Entry ${doc.id} has invalid tags: ${doc.data().tags}\n`;
      });
    }

    // 3. Verify final state
    const finalTagsCount = await verifyCollection('tags');
    const finalEntriesCount = await verifyCollection('entries');

    output += '\n=== Final State ===\n';
    output += `Tags collection: ${finalTagsCount} documents\n`;
    output += `Entries collection: ${finalEntriesCount} documents\n`;

    if (finalTagsCount !== initialTagsCount || finalEntriesCount !== initialEntriesCount) {
      throw new Error('Document counts changed during verification');
    }

  } catch (error) {
    output += `\nError during migration: ${error}\n`;
  } finally {
    // Write output to file
    const outputPath = path.resolve(process.cwd(), 'temp/firebase/migration-output.txt');
    fs.writeFileSync(outputPath, output);
    console.log(`Migration output written to ${outputPath}`);
    process.exit(0);
  }
}

migrateCollections(); 