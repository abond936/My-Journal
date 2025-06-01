import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = require('./my-journal-936-firebase-adminsdk-fbsvc-7fb74a04c2.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateStories() {
  try {
    console.log('Starting stories update process...');
    
    // Read the category ID mapping
    const idMap = JSON.parse(fs.readFileSync('category-id-map.json', 'utf-8'));
    console.log('Loaded category ID mapping.');
    
    // Read and parse the stories CSV
    console.log('Reading stories CSV file...');
    const fileContent = fs.readFileSync('exports/stories-updated.csv', 'utf-8');
    
    // First, get the headers from the first line
    const firstLine = fileContent.split('\n')[0];
    const headers = firstLine.split(',').map(h => h.trim());
    console.log('Original headers:', headers);
    
    // Parse the CSV with relaxed column count
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    console.log(`Parsed ${records.length} stories from CSV.`);
    
    // Update category IDs in the stories CSV
    const updatedRecords = records.map(record => {
      const oldCategoryId = record['category_id'];
      if (oldCategoryId && idMap[oldCategoryId]) {
        record['category_id'] = idMap[oldCategoryId];
      }
      return record;
    });
    
    // Write the updated CSV back to disk with headers and proper formatting
    const csvStringify = (obj: any) => {
      return headers.map(header => {
        const value = obj[header] || ''; // Use empty string for missing values
        // Escape commas and quotes in the value
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',');
    };

    const updatedCsv = [
      headers.join(','), // Write headers first
      ...updatedRecords.map(csvStringify)
    ].join('\n');
    
    fs.writeFileSync('exports/stories-updated.csv', updatedCsv);
    console.log('Updated stories CSV written to exports/stories-updated.csv');
    
    // Update stories in Firestore
    console.log('Updating stories in Firestore...');
    const storiesRef = db.collection('stories');
    const batchSize = 50;
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updatedRecords.length; i += batchSize) {
      const batch = updatedRecords.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatedRecords.length / batchSize)} (${batch.length} stories)`);
      
      const batchPromises = batch.map(async (record) => {
        try {
          const storyId = record['id'];
          if (!storyId) {
            console.error('Story missing ID:', record);
            errorCount++;
            return;
          }
          const docRef = storiesRef.doc(storyId);
          const { id, ...storyData } = record;
          await docRef.set(storyData, { merge: true });
          successCount++;
        } catch (error) {
          console.error(`Error updating story ${record['id']}:`, error);
          errorCount++;
        }
      });
      
      await Promise.allSettled(batchPromises);
      totalProcessed += batch.length;
      console.log(`Batch complete. Progress: ${totalProcessed}/${updatedRecords.length} (${successCount} success, ${errorCount} errors)`);
      
      if (i + batchSize < updatedRecords.length) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n=== Stories Update Complete ===`);
    console.log(`Total stories processed: ${totalProcessed}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Fatal error during stories update:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Run the update
console.log('Starting stories update process...');
updateStories()
  .then(() => {
    console.log('Stories update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Stories update failed with error:', error);
    process.exit(1);
  }); 