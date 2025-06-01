import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin
const serviceAccount = require('./my-journal-936-firebase-adminsdk-fbsvc-7fb74a04c2.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

interface Category {
  id: string;
  name: string;
  dimension: 'about' | 'who' | 'what' | 'when' | 'where';
  parentId: string | null;
  order: number;
  isReflection: boolean;
  path: string[];
}

function determineDimension(name: string): 'about' | 'who' | 'what' | 'when' | 'where' {
  if (name === 'About') return 'about';
  if (name === 'WHO') return 'who';
  if (name === 'WHAT - Themes/Domains') return 'what';
  if (name === 'WHEN') return 'when';
  if (name === 'WHERE') return 'where';
  return 'about'; // Default, will be updated based on parent
}

async function importCategories() {
  try {
    console.log('Starting CSV import process...');
    
    // Read and parse CSV
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync('exports/categories-updated.csv', 'utf-8');
    console.log('CSV file read successfully. Content preview:', fileContent.substring(0, 200) + '...');

    const records = parse(fileContent, {
      columns: header => header.map((h: string) => h.trim()),
      skip_empty_lines: true,
      trim: true
    });

    console.log(`\nParsed ${records.length} records from CSV`);
    console.log('First record:', records[0]);
    console.log('Last record:', records[records.length - 1]);

    // Validate records
    const invalidRecords = records.filter(record => !record['ID'] || !record['Tag Name']);
    if (invalidRecords.length > 0) {
      console.warn(`Found ${invalidRecords.length} invalid records (missing ID or Tag Name)`);
      console.log('Invalid records:', invalidRecords);
    }

    // Create category map for easy lookup and ID mapping
    const categoryMap = new Map<string, Category>();
    const idMap: Record<string, string> = {};
    
    // First pass: create all categories with new UUIDs
    console.log('\nFirst pass: Creating category objects with new UUIDs...');
    let processedCount = 0;
    
    for (const record of records) {
      try {
        const oldId = record['ID']?.toString().trim() || '';
        const name = record['Tag Name']?.toString().trim() || '';
        if (!oldId || !name) {
          console.warn('Skipping invalid record (missing ID or Tag Name):', record);
          continue;
        }
        const newId = uuidv4();
        idMap[oldId] = newId;
        const category: Category = {
          id: newId,
          name: name,
          dimension: determineDimension(name),
          parentId: record['parent_ID'] === 'NULL' || !record['parent_ID'] ? null : record['parent_ID'].toString().trim(),
          order: parseInt(record['sort_order']) || 0,
          isReflection: parseInt(oldId) >= 126,
          path: []
        };
        categoryMap.set(oldId, category);
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`Processed ${processedCount} categories...`);
        }
      } catch (error) {
        console.error('Error processing record:', record, error);
      }
    }
    // Write the mapping to a file
    fs.writeFileSync('category-id-map.json', JSON.stringify(idMap, null, 2));
    console.log('Wrote category ID mapping to category-id-map.json');
    
    console.log(`Created ${categoryMap.size} categories in memory`);
    
    // Second pass: build paths and update parentId to new UUIDs
    console.log('\nSecond pass: Building category paths and updating parent references...');
    for (const [oldId, category] of categoryMap.entries()) {
      try {
        if (category.parentId) {
          const parentNewId = idMap[category.parentId];
          if (parentNewId) {
            category.parentId = parentNewId;
            const parent = Array.from(categoryMap.values()).find(cat => cat.id === parentNewId);
            if (parent) {
              category.dimension = parent.dimension;
              category.path = [...parent.path, parent.name];
            } else {
              console.warn(`Parent not found for category ${oldId} (${category.name}), parent ID: ${category.parentId}`);
              category.path = [category.name];
            }
          } else {
            console.warn(`Parent ID ${category.parentId} not found in idMap for category ${oldId} (${category.name})`);
            category.parentId = null;
            category.path = [category.name];
          }
        } else {
          category.path = [category.name];
        }
      } catch (error) {
        console.error('Error building path for category:', category, error);
        category.path = [category.name]; // Fallback
      }
    }
    
    // Import to Firestore with batching
    console.log('\nStarting Firestore import...');
    const categoriesRef = db.collection('categories');
    
    // Check existing documents
    console.log('Checking existing documents...');
    const existingDocs = await categoriesRef.get();
    console.log(`Found ${existingDocs.size} existing documents in Firestore`);
    
    // Process categories in batches to avoid overwhelming Firestore
    const categories = Array.from(categoryMap.values());
    const batchSize = 50; // Process 50 at a time
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(categories.length / batchSize)} (${batch.length} categories)`);
      
      // Process batch with individual error handling
      const batchPromises = batch.map(async (category, index) => {
        try {
          if (!category.id) {
            console.error(`Category at index ${i + index} has empty ID:`, category);
            errorCount++;
            return;
          }

          const docRef = categoriesRef.doc(category.id);
          
          // Use a timeout for each operation
          const docPromise = Promise.race([
            docRef.get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          
          const doc = await docPromise as any;
          
          const isExisting = doc.exists;
          if (isExisting) {
            console.log(`Updating existing category: ${category.id} (${category.name})`);
          } else {
            console.log(`Creating new category: ${category.id} (${category.name})`);
          }

          // Remove id from the data since it's already in the document path
          const { id, ...categoryData } = category;
          
          const setPromise = Promise.race([
            docRef.set({
              ...categoryData,
              createdAt: isExisting ? doc.data()?.createdAt : new Date(),
              updatedAt: new Date()
            }, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Set timeout')), 10000))
          ]);
          
          await setPromise;
          successCount++;
          
        } catch (error) {
          console.error(`Error processing category ${category.id} (${category.name}):`, error);
          errorCount++;
        }
      });
      
      // Wait for batch to complete
      await Promise.allSettled(batchPromises);
      totalProcessed += batch.length;
      
      console.log(`Batch complete. Progress: ${totalProcessed}/${categories.length} (${successCount} success, ${errorCount} errors)`);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < categories.length) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n=== Import Complete ===`);
    console.log(`Total categories processed: ${totalProcessed}`);
    console.log(`Successful imports: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Categories in map: ${categoryMap.size}`);
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Add process event handlers to catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the import with proper error handling
console.log('Starting import process...');
importCategories()
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed with error:', error);
    process.exit(1);
  }); 