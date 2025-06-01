import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

async function restoreStories() {
  try {
    console.log('Starting stories restoration process...');
    
    // Read the original stories.csv to get the correct structure
    const originalContent = fs.readFileSync('exports/stories.csv', 'utf-8');
    const originalRecords = parse(originalContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });
    
    // Get the original headers
    let headers = Object.keys(originalRecords[0]);
    const requiredColumns = ['About', 'Who-code', 'What-code', 'Type'];
    // Add any missing required columns
    requiredColumns.forEach(col => {
      if (!headers.includes(col)) headers.push(col);
    });
    console.log('Final headers:', headers);
    
    // Read the current stories-updated.csv
    const updatedContent = fs.readFileSync('exports/stories-updated.csv', 'utf-8');
    const updatedRecords = parse(updatedContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });
    
    // Create a map of Firestore IDs to updated records
    const updatedMap = new Map();
    updatedRecords.forEach(record => {
      if (record['Firestore ID']) {
        updatedMap.set(record['Firestore ID'], record);
      }
    });
    
    // Merge the records, preserving original structure and required columns
    const mergedRecords = originalRecords.map(record => {
      const updatedRecord = updatedMap.get(record['Firestore ID']);
      const mergedRecord = { ...record };
      if (updatedRecord) {
        // Update with any new values from the updated record
        Object.keys(updatedRecord).forEach(key => {
          if (updatedRecord[key] !== undefined && updatedRecord[key] !== '') {
            mergedRecord[key] = updatedRecord[key];
          }
        });
      }
      // Ensure required columns are present, fill from original if missing in updated
      requiredColumns.forEach(col => {
        if (mergedRecord[col] === undefined) {
          mergedRecord[col] = record[col] || '';
        }
      });
      return mergedRecord;
    });
    
    // Write the merged records back to stories-updated.csv
    const csvContent = [
      headers.join(','), // Write headers
      ...mergedRecords.map(record => 
        headers.map(header => {
          const value = record[header] || '';
          // Escape quotes and wrap in quotes if needed
          const escapedValue = value.toString().replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');
    
    fs.writeFileSync('exports/stories-updated.csv', csvContent);
    console.log('Successfully restored stories-updated.csv with original structure and updated data');
    
  } catch (error) {
    console.error('Error restoring stories:', error);
    throw error;
  }
}

// Run the restoration
console.log('Starting stories restoration process...');
restoreStories()
  .then(() => {
    console.log('Stories restoration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Stories restoration failed with error:', error);
    process.exit(1);
  }); 