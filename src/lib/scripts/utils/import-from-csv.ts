import { db } from '../../config/firebase';
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CategoryUpdate {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
}

interface StoryUpdate {
  id: string;
  categoryId: string;
}

async function importFromCSV() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');

    // Read and parse the updated categories CSV
    const categoriesCSV = fs.readFileSync(path.join(exportsDir, 'categories-updated.csv'), 'utf-8');
    const categoryUpdates = parse(categoriesCSV, {
      columns: true,
      skip_empty_lines: true
    }) as CategoryUpdate[];

    // Read and parse the updated stories CSV
    const storiesCSV = fs.readFileSync(path.join(exportsDir, 'stories-updated.csv'), 'utf-8');
    const storyUpdates = parse(storiesCSV, {
      columns: true,
      skip_empty_lines: true
    }) as StoryUpdate[];

    // Start a batch write
    const batch = writeBatch(db);

    // Update categories
    for (const category of categoryUpdates) {
      const categoryRef = doc(db, 'categories', category.id);
      batch.update(categoryRef, {
        name: category.name,
        cLevel: Number(category.cLevel),
        dLevel: Number(category.dLevel),
        parentId: category.parentId || null,
        order: Number(category.order)
      });
    }

    // Update stories
    for (const story of storyUpdates) {
      const storyRef = doc(db, 'stories', story.id);
      batch.update(storyRef, {
        categoryId: story.categoryId
      });
    }

    // Commit the batch
    await batch.commit();

    console.log('Import completed successfully!');
    console.log(`Updated ${categoryUpdates.length} categories and ${storyUpdates.length} stories.`);

  } catch (error) {
    console.error('Error importing data:', error);
  }
}

importFromCSV(); 