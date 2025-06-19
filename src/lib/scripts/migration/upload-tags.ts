import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import * as fs from 'fs';
import * as path from 'path';
import admin from 'firebase-admin';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const adminDb = admin.firestore();
adminDb.settings({ ignoreUndefinedProperties: true });

// This interface now EXACTLY matches the structure of the JSON objects
interface JsonTag {
  id: string;
  name: string;
  dimension: string;
  parentId: string;
  Order: string;
  '': string; // Accounts for the empty column header
}

const BATCH_SIZE = 400;

async function clearCollection(collectionPath: string): Promise<void> {
  const collectionRef = adminDb.collection(collectionPath);
  let query = collectionRef.orderBy('__name__').limit(BATCH_SIZE);

  return new Promise((resolve, reject) => {
    const deleteNextBatch = async () => {
      try {
        const snapshot = await query.get();
        if (snapshot.size === 0) return resolve();
        
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        process.nextTick(deleteNextBatch);
      } catch (error) {
        reject(error);
      }
    };
    deleteNextBatch();
  });
}

async function uploadTags() {
  console.log('--- Starting Tag Migration Script ---');

  const jsonFilePath = path.resolve(process.cwd(), 'src/data/migration', 'new-tags.json');
  if (!fs.existsSync(jsonFilePath)) throw new Error(`FATAL: JSON file not found at ${jsonFilePath}`);
  
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const rawTags: JsonTag[] = JSON.parse(fileContent);
  
  console.log("\nClearing 'tags' collection...");
  await clearCollection('tags');
  console.log("✅ 'tags' collection cleared.");

  console.log('\n--- Pass 1: Creating tag documents ---');
  const csvIdToFirestoreIdMap = new Map<string, string>();
  const csvIdToJsonTagMap = new Map<string, JsonTag>();
  const tagsCollection = adminDb.collection('tags');
  let createBatch = adminDb.batch();
  let opCount = 0;

  for (const rawTag of rawTags) {
    const csvId = rawTag.id;
    if (!csvId) continue;
    
    csvIdToJsonTagMap.set(csvId, rawTag);
    const newDocRef = tagsCollection.doc();
    csvIdToFirestoreIdMap.set(csvId, newDocRef.id);

    // This data mapping is now correct
    const order = rawTag.Order ? parseFloat(rawTag.Order) : 0;
    const baseTagData: Partial<Tag> = {
      name: rawTag.name,
      order: isNaN(order) ? 0 : order,
      dimension: rawTag.dimension.toLowerCase() as Tag['dimension'],
    };
    
    createBatch.set(newDocRef, baseTagData);
    opCount++;

    if (opCount === BATCH_SIZE) {
      await createBatch.commit();
      createBatch = adminDb.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await createBatch.commit();
  console.log(`✅ Pass 1 complete.`);

  console.log('\n--- Pass 2: Linking relationships ---');
  let updateBatch = adminDb.batch();
  opCount = 0;

  for (const rawTag of rawTags) {
    const csvId = rawTag.id;
    if (!csvId) continue;

    const firestoreId = csvIdToFirestoreIdMap.get(csvId);
    if (!firestoreId) continue;

    const parentCsvId = rawTag.parentId;
    const dataToUpdate: { parentId?: string; path?: string[] } = {};

    if (parentCsvId && parentCsvId !== 'NULL') {
      const parentFirestoreId = csvIdToFirestoreIdMap.get(parentCsvId);
      if (parentFirestoreId) dataToUpdate.parentId = parentFirestoreId;
    }

    const path: string[] = [];
    let currentTagInPath = rawTag;
    while (currentTagInPath?.parentId && currentTagInPath.parentId !== 'NULL') {
      const parentFirestoreId = csvIdToFirestoreIdMap.get(currentTagInPath.parentId);
      if (parentFirestoreId) path.unshift(parentFirestoreId);
      currentTagInPath = csvIdToJsonTagMap.get(currentTagInPath.parentId);
    }
    dataToUpdate.path = path;

    if (dataToUpdate.parentId || (dataToUpdate.path && dataToUpdate.path.length > 0)) {
      const docRef = tagsCollection.doc(firestoreId);
      updateBatch.update(docRef, dataToUpdate);
      opCount++;
    }

    if (opCount === BATCH_SIZE) {
      await updateBatch.commit();
      updateBatch = adminDb.batch();
      opCount = 0;
    }
  }
  
  if (opCount > 0) await updateBatch.commit();
  console.log(`✅ Pass 2 complete.`);
  console.log('\n--- MIGRATION COMPLETE ---');
}

uploadTags().catch(error => {
  console.error('\n--- SCRIPT FAILED ---', error);
  process.exit(1);
});