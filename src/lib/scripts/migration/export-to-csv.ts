import { db } from '../lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

interface Category {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
}

interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  metadata: {
    date?: Date | Timestamp;
    tags?: string[];
    images?: {
      url: string;
      caption?: string;
      order: number;
    }[];
  };
}

function formatDate(date: Date | Timestamp | undefined): string {
  if (!date) return '';
  try {
    const dateObj = date instanceof Date ? date : date.toDate();
    return dateObj.toISOString();
  } catch (error) {
    console.warn('Invalid date found:', date);
    return '';
  }
}

function getCategoryPath(category: Category, categories: Category[]): string {
  const path: string[] = [category.name];
  let currentCategory = category;
  
  while (currentCategory.parentId) {
    const parent = categories.find(cat => cat.id === currentCategory.parentId);
    if (!parent) break;
    path.unshift(parent.name);
    currentCategory = parent;
  }
  
  return path.join(' > ');
}

function generateReadableId(name: string): string {
  if (!name) return 'unnamed';
  
  // Convert to lowercase and replace special characters with spaces
  let readable = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  
  // Replace multiple spaces with a single space
  readable = readable.replace(/\s+/g, ' ');
  
  // Take first 3-4 words, max 30 characters
  const words = readable.split(' ');
  let result = '';
  let charCount = 0;
  
  for (const word of words) {
    if (charCount + word.length > 30) break;
    if (result) result += '-';
    result += word;
    charCount += word.length + 1; // +1 for the hyphen
  }
  
  return result;
}

async function exportToCSV() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    // Export Categories
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categories = categoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Log the raw document data
      console.log('Raw category doc:', { 
        docId: doc.id,
        data: data,
        hasId: 'id' in data,
        idValue: data.id
      });
      
      // Create category object with doc.id as the id
      return {
        id: doc.id, // Use the document ID from Firestore
        name: data.name || '',
        cLevel: data.cLevel || 0,
        dLevel: data.dLevel || 0,
        parentId: data.parentId || null,
        order: data.order || 0
      };
    }) as Category[];

    console.log('First few processed categories:', categories.slice(0, 3));

    // Create a map of Firestore IDs to readable IDs
    const idMap = new Map<string, string>();
    categories.forEach(cat => {
      idMap.set(cat.id, generateReadableId(cat.name));
    });

    // Create category CSV with headers
    const categoryCSV = [
      ['Readable ID', 'Firestore ID', 'Name', 'Category Level', 'Display Level', 'Parent Readable ID', 'Parent Name', 'Order', 'Full Path'].join(','),
      ...categories.map(cat => {
        const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : null;
        const readableId = idMap.get(cat.id) || 'unnamed';
        const parentReadableId = parent ? (idMap.get(parent.id) || 'unnamed') : '';
        
        // Log category processing
        console.log('Processing category:', { 
          id: cat.id, 
          readableId, 
          parentId: cat.parentId, 
          parentReadableId,
          name: cat.name
        });
        
        return [
          readableId,
          cat.id,
          `"${cat.name.replace(/"/g, '""')}"`,
          cat.cLevel,
          cat.dLevel,
          parentReadableId,
          parent ? `"${parent.name.replace(/"/g, '""')}"` : '',
          cat.order,
          `"${getCategoryPath(cat, categories).replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    fs.writeFileSync(path.join(exportsDir, 'categories.csv'), categoryCSV);

    // Export Stories
    const storiesSnapshot = await getDocs(collection(db, 'stories'));
    const stories = storiesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Log the raw document data
      console.log('Raw story doc:', { 
        docId: doc.id,
        data: data,
        hasId: 'id' in data,
        idValue: data.id
      });
      
      // Create story object with doc.id as the id
      return {
        id: doc.id, // Use the document ID from Firestore
        title: data.title || '',
        content: data.content || '',
        categoryId: data.categoryId || '',
        metadata: {
          date: data.metadata?.date,
          tags: data.metadata?.tags || [],
          images: data.metadata?.images || []
        }
      };
    }) as Story[];

    console.log('First few processed stories:', stories.slice(0, 3));

    // Create story CSV with headers
    const storyCSV = [
      ['Readable ID', 'Firestore ID', 'Title', 'Category Readable ID', 'Category Name', 'Category Level', 'Date', 'Tags'].join(','),
      ...stories.map(story => {
        const category = categories.find(cat => cat.id === story.categoryId);
        const readableId = generateReadableId(story.title);
        const categoryReadableId = category ? (idMap.get(category.id) || 'unnamed') : 'Unknown';
        
        // Log story processing
        console.log('Processing story:', { 
          id: story.id, 
          readableId, 
          categoryId: story.categoryId, 
          categoryReadableId,
          title: story.title
        });
        
        return [
          readableId,
          story.id,
          `"${story.title.replace(/"/g, '""')}"`,
          categoryReadableId,
          category ? `"${category.name.replace(/"/g, '""')}"` : 'Unknown',
          category ? category.cLevel : 'Unknown',
          formatDate(story.metadata?.date),
          story.metadata?.tags ? `"${story.metadata.tags.join(';')}"` : ''
        ].join(',');
      })
    ].join('\n');

    fs.writeFileSync(path.join(exportsDir, 'stories.csv'), storyCSV);

    // Create a mapping file to help with reassignment
    const mappingCSV = [
      ['Story Readable ID', 'Story Title', 'Current Category Readable ID', 'Current Category Name', 'Current Category Level', 'Current Category Path', 'Suggested Parent Readable ID', 'Suggested Parent Name'].join(','),
      ...stories.map(story => {
        const category = categories.find(cat => cat.id === story.categoryId);
        const parentCategory = category?.parentId ? categories.find(cat => cat.id === category.parentId) : null;
        const storyReadableId = generateReadableId(story.title);
        const categoryReadableId = category ? (idMap.get(category.id) || 'unnamed') : 'Unknown';
        const parentReadableId = parentCategory ? (idMap.get(parentCategory.id) || 'unnamed') : '';
        
        // Log mapping processing
        console.log('Processing mapping:', { 
          storyId: story.id, 
          storyReadableId, 
          categoryId: story.categoryId, 
          categoryReadableId,
          parentId: category?.parentId,
          parentReadableId,
          title: story.title
        });
        
        return [
          storyReadableId,
          `"${story.title.replace(/"/g, '""')}"`,
          categoryReadableId,
          category ? `"${category.name.replace(/"/g, '""')}"` : 'Unknown',
          category ? category.cLevel : 'Unknown',
          category ? `"${getCategoryPath(category, categories).replace(/"/g, '""')}"` : 'Unknown',
          parentReadableId,
          parentCategory ? `"${parentCategory.name.replace(/"/g, '""')}"` : ''
        ].join(',');
      })
    ].join('\n');

    fs.writeFileSync(path.join(exportsDir, 'story-category-mapping.csv'), mappingCSV);

    console.log('Export completed successfully!');
    console.log('Files created in the exports directory:');
    console.log('- categories.csv: All categories with their levels and relationships');
    console.log('- stories.csv: All stories with their current category assignments');
    console.log('- story-category-mapping.csv: A mapping file to help with reassignment');

  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

exportToCSV(); 