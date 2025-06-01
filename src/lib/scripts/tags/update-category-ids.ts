import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Read and parse the categories CSV to create a lookup map
function readCategoriesLookup(categoriesPath: string): Map<string, string> {
  const csvContent = fs.readFileSync(categoriesPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  const lookup = new Map<string, string>();
  records.forEach((record: any) => {
    lookup.set(record['Tag Name'], record['ID']);
  });
  return lookup;
}

// Main function to update category IDs
function updateCategoryIds() {
  try {
    // Define file paths
    const storiesPath = path.join(process.cwd(), 'temp', 'newstories.csv');
    const categoriesPath = path.join(process.cwd(), 'exports', 'categories-updated.csv');
    const outputPath = path.join(process.cwd(), 'temp', 'newstories1.csv');

    // Read and parse the stories CSV
    const storiesContent = fs.readFileSync(storiesPath, 'utf-8');
    const stories = parse(storiesContent, { columns: true, skip_empty_lines: true });

    // Create category lookup map
    const categoriesLookup = readCategoriesLookup(categoriesPath);

    // Track unmatched categories
    const unmatchedCategories = new Map<string, number>();

    // Update category IDs
    const updatedStories = stories.map((story: any) => {
      const categoryId = categoriesLookup.get(story.Category);
      if (!categoryId) {
        unmatchedCategories.set(story.Category, (unmatchedCategories.get(story.Category) || 0) + 1);
      }
      return {
        ...story,
        'Category ID': categoryId || 'no match'
      };
    });

    // Write the updated stories to new CSV
    const output = stringify(updatedStories, { header: true });
    fs.writeFileSync(outputPath, output);

    // Print unmatched categories report
    console.log('\nUnmatched Categories Report:');
    console.log('---------------------------');
    console.log('Category Name | Count');
    console.log('---------------------------');
    const unmatchedArray = [...unmatchedCategories.entries()]
      .sort((a, b) => b[1] - a[1]); // Sort by count descending
    unmatchedArray.forEach(([category, count]) => {
      console.log(`${category} | ${count}`);
    });
    console.log('---------------------------');
    console.log(`Total unmatched categories: ${unmatchedCategories.size}`);
    console.log(`Total stories with unmatched categories: ${[...unmatchedCategories.values()].reduce((a, b) => a + b, 0)}`);

    // Write unmatched categories to CSV file
    const unmatchedCsvPath = path.join(process.cwd(), 'temp', 'unmatched-categories.csv');
    const unmatchedCsvHeader = 'Category,Count\n';
    const unmatchedCsvRows = unmatchedArray.map(([category, count]) => `"${category.replace(/"/g, '""')}",${count}`).join('\n');
    fs.writeFileSync(unmatchedCsvPath, unmatchedCsvHeader + unmatchedCsvRows);
    console.log(`\nUnmatched categories have been saved to: ${unmatchedCsvPath}`);

    console.log('\nCategory IDs have been updated and saved to:', outputPath);
  } catch (error) {
    console.error('Error updating category IDs:', error);
  }
}

// Run the script
updateCategoryIds(); 