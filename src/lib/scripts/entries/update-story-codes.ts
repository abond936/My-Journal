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
  'Who-code'?: string;
  'What-code'?: string;
  'When-code'?: string;
}

function readCSV(filePath: string): Story[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function updateStoryCodes() {
  try {
    // Read all necessary files
    const newStoriesPath = path.join(process.cwd(), 'temp', 'newstories.csv');
    const missingStoriesPath = path.join(process.cwd(), 'temp', 'comparison', 'missing-stories.csv');
    const dbStoriesPath = path.join(process.cwd(), 'exports', 'stories-updated.csv');
    
    const newStories = readCSV(newStoriesPath);
    const missingStories = readCSV(missingStoriesPath);
    const dbStories = readCSV(dbStoriesPath);

    // Create a map of all stories to update (from both new and missing)
    const storiesToUpdate = new Map<string, Story>();
    
    // Add stories from newstories.csv
    newStories.forEach(story => {
      storiesToUpdate.set(story.Title, story);
    });
    
    // Add stories from missing-stories.csv
    missingStories.forEach(story => {
      storiesToUpdate.set(story.Title, story);
    });

    // Update database stories with new codes and types
    const updatedDbStories = dbStories.map(dbStory => {
      const updateInfo = storiesToUpdate.get(dbStory.Title);
      if (updateInfo) {
        return {
          ...dbStory,
          'Who-code': updateInfo['Who-code'] || dbStory['Who-code'],
          'What-code': updateInfo['What-code'] || dbStory['What-code'],
          'When-code': updateInfo['When-code'] || dbStory['When-code'],
          'Type': updateInfo.Type || dbStory.Type
        };
      }
      return dbStory;
    });

    // Add new stories that aren't in the database
    const newStoriesToAdd = Array.from(storiesToUpdate.values())
      .filter(story => !dbStories.some(dbStory => dbStory.Title === story.Title));

    // Combine updated database stories with new stories
    const finalStories = [...updatedDbStories, ...newStoriesToAdd];

    // Write the updated stories back to the database file
    const output = stringify(finalStories, { header: true });
    fs.writeFileSync(dbStoriesPath, output);

    // Generate a report
    const report = {
      totalStories: finalStories.length,
      updatedStories: updatedDbStories.length,
      newStoriesAdded: newStoriesToAdd.length,
      storiesWithWhoCode: finalStories.filter(s => s['Who-code']).length,
      storiesWithWhatCode: finalStories.filter(s => s['What-code']).length,
      storiesWithWhenCode: finalStories.filter(s => s['When-code']).length
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'temp', 'update-report.txt');
    const reportContent = `Story Update Report
===================
Total stories in database: ${report.totalStories}
Stories updated with new codes: ${report.updatedStories}
New stories added: ${report.newStoriesAdded}
Stories with Who-code: ${report.storiesWithWhoCode}
Stories with What-code: ${report.storiesWithWhatCode}
Stories with When-code: ${report.storiesWithWhenCode}
`;
    fs.writeFileSync(reportPath, reportContent);

    console.log('Update complete! Check temp/update-report.txt for details.');
    console.log('\nReport:');
    console.log(reportContent);

  } catch (error) {
    console.error('Error updating story codes:', error);
  }
}

// Run the update
updateStoryCodes(); 