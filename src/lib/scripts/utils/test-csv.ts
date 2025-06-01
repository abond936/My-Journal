import { parse } from 'csv-parse/sync';
import fs from 'fs';

// Read the CSV file
const fileContent = fs.readFileSync('exports/categories-updated.csv', 'utf-8');

// Parse with minimal options
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

console.log('\nTotal number of records:', records.length);
console.log('\nAll records:');
records.forEach((record, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log(JSON.stringify(record, null, 2));
});

// Show first 3 records in detail
console.log('\nFirst 3 records:');
records.slice(0, 3).forEach((record, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log('Raw record:', record);
  console.log('ID value:', record.ID);
  console.log('ID type:', typeof record.ID);
  console.log('Tag Name:', record['Tag Name']);
  console.log('parent_ID:', record.parent_ID);
  console.log('sort_order:', record.sort_order);
});

// Show column names and types
console.log('\nColumn names:', Object.keys(records[0]));
console.log('\nColumn types:');
Object.entries(records[0]).forEach(([key, value]) => {
  console.log(`${key}: ${typeof value}`);
}); 