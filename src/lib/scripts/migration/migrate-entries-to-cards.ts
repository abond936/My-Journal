/**
 * Migration Script: Entries to Cards
 * 
 * Description:
 * This script migrates all documents from the 'entries' collection to the 'cards' collection.
 * It transforms the data according to a predefined mapping, including recalculating inherited tags.
 * 
 * Usage:
 * - For a dry run (recommended first): npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/migration/migrate-entries-to-cards.ts --dryRun
 * - To execute the migration: npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/migration/migrate-entries-to-cards.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
console.log('--- Script Starting ---');
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));
const result = dotenv.config({ path: resolve(process.cwd(), '.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully.');
  // Log a subset of env vars to confirm they are loaded
  console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID is set:', !!process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID);
}

import { getAdminApp } from '@/lib/config/firebase/admin';
import { CollectionReference, DocumentData, getFirestore } from 'firebase-admin/firestore';
import { Entry, EntryType } from '@/lib/types/entry';
import { Card } from '@/lib/types/card';
import { getTagAncestors } from '@/lib/firebase/tagDataAccess';
import { PhotoMetadata } from '@/lib/types/photo';

const BATCH_SIZE = 500; // Firestore batch writes are limited to 500 operations

// --- Robust Data Cleaning Functions ---

function cleanDate(date: any): number {
  if (!date) return Date.now();
  // Firestore Timestamps have a toDate method
  if (typeof date.toDate === 'function') {
    return date.toDate().getTime();
  }
  // Handle if it's already a Date object, a number (timestamp), or a string
  const d = new Date(date);
  // Check if the date is valid
  if (!isNaN(d.getTime())) {
    return d.getTime();
  }
  return Date.now();
}

function cleanPhoto(photo: PhotoMetadata | null): PhotoMetadata | null {
  if (!photo) return null;
  
  const cleaned: PhotoMetadata = {
    id: photo.id || '',
    filename: photo.filename || '',
    path: photo.path || '',
    width: photo.width || 0,
    height: photo.height || 0,
    lastModified: photo.lastModified || new Date().toISOString(),
    size: photo.size || 0,
    thumbnailUrl: photo.thumbnailUrl || '',
    previewUrl: photo.previewUrl || '',
    webUrl: photo.webUrl || '',
  };

  if (photo.caption) {
    cleaned.caption = photo.caption;
  }
  if (photo.objectPosition) {
    cleaned.objectPosition = photo.objectPosition;
  }
  
  return cleaned;
}

async function migrateEntriesToCards() {
  const dryRun = process.argv.includes('--dryRun');
  console.log(dryRun ? '=== Starting Dry Run ===' : '=== Starting Live Migration ===');

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const entriesCollection = db.collection('entries') as CollectionReference<Entry>;
    const cardsCollection = db.collection('cards') as CollectionReference<Card>;

    const entriesSnapshot = await entriesCollection.get();
    const totalEntries = entriesSnapshot.size;
    console.log(`Found ${totalEntries} entries to migrate.`);

    if (totalEntries === 0) {
      console.log('No entries to migrate. Exiting.');
      return;
    }

    let batch = db.batch();
    let batchCount = 0;
    let migratedCount = 0;

    for (const entryDoc of entriesSnapshot.docs) {
      const entryData = entryDoc.data();
      
      // --- Aggressive Validation ---
      if (!entryData.title || !entryData.type || !entryData.status || !entryData.content) {
        console.error(`\n!!! SKIPPING INVALID ENTRY !!!`);
        console.error(`- Entry ID: ${entryDoc.id}`);
        if (!entryData.title) console.error(`- Reason: Missing 'title'`);
        if (!entryData.type) console.error(`- Reason: Missing 'type'`);
        if (!entryData.status) console.error(`- Reason: Missing 'status'`);
        if (!entryData.content) console.error(`- Reason: Missing 'content'`);
        console.error('---------------------------------\n');
        continue; // Skip this document
      }
      
      // --- Transformation Logic ---
      const leafTags = entryData.tags || [];
      const ancestorTags = await getTagAncestors(leafTags);
      const inheritedTags = [...new Set([...leafTags, ...ancestorTags])];

      // Handle type mapping
      let cardType: Card['type'] = 'story'; // Default to 'story'
      if (entryData.type !== 'reflection') {
        cardType = entryData.type as Card['type'];
      }
      
      const newCard: Omit<Card, 'id'> = {
        title: entryData.title || '',
        excerpt: entryData.excerpt || '',
        content: entryData.content || '',
        type: cardType,
        status: entryData.status || 'draft',
        displayMode: 'inline',
        coverImage: cleanPhoto(entryData.coverPhoto),
        contentMedia: (entryData.media || []).map(cleanPhoto).filter((p): p is PhotoMetadata => p !== null),
        galleryMedia: [],
        tags: leafTags,
        inheritedTags: inheritedTags,
        tagPaths: [],
        childrenIds: [],
        createdAt: cleanDate(entryData.createdAt),
        updatedAt: cleanDate(entryData.updatedAt),
        who: [],
        what: [],
        when: [],
        where: [],
        reflection: [],
      };
      
      console.log(`- Transforming Entry ID: ${entryDoc.id} -> Card Title: ${newCard.title}`);

      if (!dryRun) {
        const cardRef = cardsCollection.doc(entryDoc.id);
        batch.set(cardRef, newCard);
        batchCount++;
      }
      
      migratedCount++;

      if (batchCount === BATCH_SIZE) {
        console.log(`--- Committing batch of ${BATCH_SIZE} cards ---`);
        if (!dryRun) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // Commit any remaining items in the last batch
    if (batchCount > 0 && !dryRun) {
      console.log(`--- Committing final batch of ${batchCount} cards ---`);
      await batch.commit();
    }

    console.log(`\n=== Migration Summary ===`);
    console.log(`Total entries processed: ${migratedCount}`);
    console.log(dryRun ? `Dry run complete. No data was written.` : `Migration complete. ${migratedCount} cards were written.`);

  } catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  }
}

migrateEntriesToCards(); 