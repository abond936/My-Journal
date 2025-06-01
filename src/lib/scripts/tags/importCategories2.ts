import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = require('../my-journal-936-firebase-adminsdk-fbsvc-7fb74a04c2.json');
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
    // Read and parse CSV
    const fileContent = fs.readFileSync('exports/categories-updated.csv', 'utf-8');
    console.log('Raw CSV content:', fileContent.substring(0, 200) + '...');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`\nTotal records parsed: ${records.length}`);

    // Create category map for easy lookup
    const categoryMap = new Map<string, Category>();
    
    // First pass: create all categories
    console.log('\nStarting first pass - creating categories...');
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        console.log(`\nProcessing record ${i + 1}/${records.length}:`, record);
        
        // Validate record data
        const id = record['ID'].toString();
        if (!id) {
          console.error(`Record ${i + 1} has invalid ID:`, record);
          continue;
        }
        
        if (!record['Tag Name']) {
          console.error(`Record ${i + 1} has invalid Tag Name:`, record);
          continue;
        }
        
        const order = parseInt(record['sort_order']);
        if (isNaN(order)) {
          console.error(`Record ${i + 1} has invalid sort_order:`, record);
          continue;
        }
        
        const category: Category = {
          id: id,
          name: record['Tag Name'],
          dimension: determineDimension(record['Tag Name']),
          parentId: record['parent_ID'] === 'NULL' ? null : record['parent_ID'].toString(),
          order: order,
          isReflection: parseInt(id) >= 126,
          path: []
        };
        
        console.log(`Created category ${i + 1}:`, category);
        categoryMap.set(category.id, category);
      } catch (error) {
        console.error(`Error processing record ${i + 1}:`, error);
        console.error('Record data:', record);
      }
    }
    
    console.log(`\nFirst pass complete. Created ${categoryMap.size} categories.`);
    
    // Second pass: build paths
    console.log('\nStarting second pass - building paths...');
    for (const category of categoryMap.values()) {
      try {
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            category.dimension = parent.dimension;
            category.path = [...parent.path, parent.name];
          } else {
            console.warn(`Parent not found for category ${category.id} (${category.name})`);
            category.path = [category.name];
          }
        } else {
          category.path = [category.name];
        }
      } catch (error) {
        console.error(`Error building path for category ${category.id}:`, error);
      }
    }
    
    // Import to Firestore
    const categoriesRef = db.collection('categories');
    
    // First, check what documents exist
    console.log('\nChecking existing documents...');
    const existingDocs = await categoriesRef.get();
    console.log(`Found ${existingDocs.size} existing documents`);
    
    console.log('\nStarting Firestore import...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const category of categoryMap.values()) {
      try {
        if (!category.id) {
          console.error('Found category with invalid ID:', category);
          errorCount++;
          continue;
        }

        const docRef = categoriesRef.doc(category.id);
        const doc = await docRef.get();
        
        if (doc.exists) {
          console.log(`Updating existing category: ${category.id} (${category.name})`);
        } else {
          console.log(`Creating new category: ${category.id} (${category.name})`);
        }

        // Remove id from the data since it's already in the document path
        const { id, ...categoryData } = category;
        
        await docRef.set({
          ...categoryData,
          createdAt: doc.exists ? doc.data()?.createdAt : new Date(),
          updatedAt: new Date()
        }, { merge: true });
        
        successCount++;
      } catch (error) {
        console.error(`Error writing category ${category.id} to Firestore:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nImport complete. Successfully processed ${successCount} categories. Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error importing categories:', error);
    throw error;
  }
}

// Run the import
importCategories(); 