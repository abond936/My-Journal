import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, getDocs } from 'firebase/firestore';

interface Heading {
  level: number;
  text: string;
  content: string;
  children: Heading[];
}

interface Category {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  metadata: {
    date?: Date;
    tags?: string[];
    images?: {
      url: string;
      caption?: string;
      order: number;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

function extractContent(element: Element): string {
  let content = '';
  const paragraphs = element.querySelectorAll('p');
  paragraphs.forEach(p => {
    content += p.textContent + '\n\n';
  });
  return content.trim();
}

function extractHeadings(html: string): Heading[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const headings: Heading[] = [];
  const stack: Heading[] = [];

  // Get all headings
  const headingElements = document.querySelectorAll('h1, h2, h3, h4');
  
  headingElements.forEach((element) => {
    const level = parseInt(element.tagName[1]);
    const text = element.textContent?.trim() || '';
    
    // Get content until next heading
    let content = '';
    let nextElement = element.nextElementSibling;
    while (nextElement && !nextElement.matches('h1, h2, h3, h4')) {
      content += nextElement.textContent + '\n\n';
      nextElement = nextElement.nextElementSibling;
    }
    
    const heading: Heading = {
      level,
      text,
      content: content.trim(),
      children: []
    };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      headings.push(heading);
    } else {
      stack[stack.length - 1].children.push(heading);
    }

    stack.push(heading);
  });

  return headings;
}

async function createCategories(headings: Heading[], parentId: string | null = null, order = 0): Promise<Map<string, string>> {
  const categoryMap = new Map<string, string>();
  
  for (const heading of headings) {
    const category: Category = {
      id: '', // Will be set by Firestore
      name: heading.text,
      cLevel: heading.level,
      dLevel: heading.level, // Initially same as cLevel
      parentId,
      order: order++,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'categories'), category);
    categoryMap.set(heading.text, docRef.id);

    if (heading.children.length > 0) {
      const childMap = await createCategories(heading.children, docRef.id, 0);
      childMap.forEach((value, key) => categoryMap.set(key, value));
    }
  }

  return categoryMap;
}

async function createStories(headings: Heading[], categoryMap: Map<string, string>): Promise<void> {
  for (const heading of headings) {
    if (heading.content) {
      const categoryId = categoryMap.get(heading.text);
      if (!categoryId) {
        console.warn(`No category found for heading: ${heading.text}`);
        continue;
      }

      const story: Story = {
        id: '', // Will be set by Firestore
        title: heading.text,
        content: heading.content,
        categoryId,
        metadata: {
          date: new Date(), // You might want to extract this from content
          tags: [], // You might want to extract these from content
          images: [] // You might want to extract these from content
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'stories'), story);
    }

    if (heading.children.length > 0) {
      await createStories(heading.children, categoryMap);
    }
  }
}

// Main execution
async function main() {
  const htmlPath = path.join(process.cwd(), 'temp', 'My Jounral - Website.htm');

  try {
    console.log('Reading HTML file...');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    console.log('Extracting headings and content...');
    const headings = extractHeadings(html);
    
    // Clear existing categories and stories
    console.log('Clearing existing data...');
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const storiesSnapshot = await getDocs(collection(db, 'stories'));
    
    const batch = writeBatch(db);
    categoriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    storiesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log('Creating categories...');
    const categoryMap = await createCategories(headings);
    
    console.log('Creating stories...');
    await createStories(headings, categoryMap);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

main().catch(console.error); 