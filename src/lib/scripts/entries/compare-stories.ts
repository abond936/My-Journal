import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

interface Story {
  Title: string;
  Category: string;
  'Category ID': string;
  Type?: string;
  'Category Level'?: string;
  'Heading Level'?: string;
  Content?: string;
}

function readCSV(filePath: string): Story[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function compareStories() {
  try {
    // Read both CSV files
    const newStoriesPath = path.join(process.cwd(), 'temp', 'newstories1.csv');
    const dbStoriesPath = path.join(process.cwd(), 'exports', 'stories-updated.csv');
    
    const newStories = readCSV(newStoriesPath);
    const dbStories = readCSV(dbStoriesPath);

    // Create maps for quick lookup
    const newStoriesMap = new Map(newStories.map(story => [story.Title, story]));
    const dbStoriesMap = new Map(dbStories.map(story => [story.Title, story]));

    // Find stories that are only in newStories1.csv
    const onlyInNew = newStories.filter(story => !dbStoriesMap.has(story.Title));
    
    // Find stories that are only in the database
    const onlyInDB = dbStories.filter(story => !newStoriesMap.has(story.Title));

    // Write results to files
    const outputDir = path.join(process.cwd(), 'temp', 'comparison');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Write new stories (only in newStories1.csv)
    const newStoriesOutput = stringify(onlyInNew, { header: true });
    fs.writeFileSync(path.join(outputDir, 'new-stories.csv'), newStoriesOutput);

    // Write missing stories (only in database)
    const missingStoriesOutput = stringify(onlyInDB, { header: true });
    fs.writeFileSync(path.join(outputDir, 'missing-stories.csv'), missingStoriesOutput);

    // Generate summary report
    const summary = {
      totalNewStories: newStories.length,
      totalDBStories: dbStories.length,
      onlyInNew: onlyInNew.length,
      onlyInDB: onlyInDB.length,
      commonStories: newStories.length - onlyInNew.length
    };

    // Write summary to file
    const summaryPath = path.join(outputDir, 'comparison-summary.txt');
    const summaryContent = `Story Comparison Summary
========================
Total stories in newStories1.csv: ${summary.totalNewStories}
Total stories in database: ${summary.totalDBStories}
Stories only in newStories1.csv: ${summary.onlyInNew}
Stories only in database: ${summary.onlyInDB}
Stories in both: ${summary.commonStories}

Files generated:
- new-stories.csv: Contains stories that are only in newStories1.csv
- missing-stories.csv: Contains stories that are only in the database
`;
    fs.writeFileSync(summaryPath, summaryContent);

    console.log('Comparison complete! Check the temp/comparison directory for results.');
    console.log('\nSummary:');
    console.log(summaryContent);

  } catch (error) {
    console.error('Error comparing stories:', error);
  }
}

// Run the comparison
compareStories(); 