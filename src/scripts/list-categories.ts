import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Category {
  id: string;
  name: string;
  cLevel: number;
  dLevel: number;
  parentId: string | null;
  order: number;
}

async function listCategories() {
  try {
    // Get all categories
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];

    // Sort categories by level and order
    categories.sort((a, b) => {
      if (a.cLevel !== b.cLevel) return a.cLevel - b.cLevel;
      return a.order - b.order;
    });
    
    // Create a map for quick lookup
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    
    // Find root categories (no parent)
    const rootCategories = categories.filter(cat => !cat.parentId);
    
    // Function to print category and its children
    function printCategory(category: Category, level: number = 0) {
      const indent = '  '.repeat(level);
      const arrow = level > 0 ? '└─ ' : '';
      console.log(`${indent}${arrow}${category.name}`);
      console.log(`${indent}    Level: ${category.cLevel}`);
      console.log(`${indent}    Display Level: ${category.dLevel}`);
      console.log(`${indent}    Order: ${category.order}`);
      console.log(`${indent}    ID: ${category.id}`);
      console.log(`${indent}    Parent ID: ${category.parentId || 'None'}`);
      console.log(''); // Empty line for readability

      // Find and print children
      const children = categories
        .filter(cat => cat.parentId === category.id)
        .sort((a, b) => a.order - b.order);
      
      children.forEach(child => printCategory(child, level + 1));
    }

    // Print all categories starting from roots
    console.log('\nComplete Category Hierarchy:\n');
    rootCategories.forEach(category => printCategory(category));

    // Print heading level analysis
    console.log('\nHeading Level Analysis:');
    const levelCount = new Map<number, number>();
    categories.forEach(cat => {
      levelCount.set(cat.cLevel, (levelCount.get(cat.cLevel) || 0) + 1);
    });
    
    // Sort levels for display
    const sortedLevels = Array.from(levelCount.entries()).sort((a, b) => a[0] - b[0]);
    
    console.log('\nDistribution of Heading Levels:');
    sortedLevels.forEach(([level, count]) => {
      console.log(`H${level}: ${count} items`);
    });

    // Show example of each level
    console.log('\nExamples from each level:');
    sortedLevels.forEach(([level, _]) => {
      const examples = categories
        .filter(cat => cat.cLevel === level)
        .slice(0, 3); // Show up to 3 examples
      
      console.log(`\nH${level} Examples:`);
      examples.forEach(cat => {
        console.log(`  - ${cat.name}`);
      });
    });

    // Print summary
    console.log('\nSummary:');
    console.log(`Total Categories: ${categories.length}`);
    console.log(`Root Categories: ${rootCategories.length}`);
    console.log(`Max Category Level: ${Math.max(...categories.map(c => c.cLevel))}`);
    console.log(`Max Display Level: ${Math.max(...categories.map(c => c.dLevel))}`);

  } catch (error) {
    console.error('Error listing categories:', error);
  }
}

// Run the script
listCategories().catch(console.error); 