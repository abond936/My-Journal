import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

interface Category {
  id: string;
  name: string;
  cLevel: number;
  parentId: string | null;
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

async function recommendCategories() {
  try {
    console.log('Starting category recommendation process...');
    
    // Read and parse the categories CSV
    const categoriesContent = fs.readFileSync('exports/categories-updated.csv', 'utf-8');
    const categories = parse(categoriesContent, {
      columns: true,
      skip_empty_lines: true
    }) as Category[];

    console.log(`Loaded ${categories.length} categories`);
    console.log('First few categories:', categories.slice(0, 3));

    // Read and parse the stories CSV
    const storiesContent = fs.readFileSync('exports/stories-updated.csv', 'utf-8');
    const stories = parse(storiesContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Loaded ${stories.length} stories`);
    console.log('First few stories:', stories.slice(0, 3));

    // Create a map of category names to their full paths
    const categoryPaths = new Map<string, string>();
    categories.forEach(category => {
      categoryPaths.set(category.name, getCategoryPath(category, categories));
    });

    // Add recommended categories based on current category level
    const updatedStories = stories.map(story => {
      // Debug the story's category
      console.log('\nProcessing story:', {
        title: story['Title'],
        categoryName: story['Category Name'],
        categoryLevel: story['Category Level']
      });

      const currentCategory = categories.find(cat => cat.name === story['Category Name']);
      
      // Debug category matching
      if (!currentCategory) {
        console.log('No matching category found for:', story['Category Name']);
        console.log('Available category names:', categories.map(c => c.name).slice(0, 5));
      } else {
        console.log('Found matching category:', {
          id: currentCategory.id,
          name: currentCategory.name,
          level: currentCategory.cLevel,
          parentId: currentCategory.parentId
        });
      }

      let recommendedCategory = '';

      if (currentCategory) {
        // If the current category is level 4, recommend its parent
        if (currentCategory.cLevel === 4 && currentCategory.parentId) {
          const parentCategory = categories.find(cat => cat.id === currentCategory.parentId);
          if (parentCategory) {
            recommendedCategory = parentCategory.name;
            console.log('Recommended parent category:', parentCategory.name);
          }
        }
        // If the current category is level 3, keep it as is
        else if (currentCategory.cLevel === 3) {
          recommendedCategory = currentCategory.name;
          console.log('Keeping level 3 category:', currentCategory.name);
        }
        // If the current category is level 2 or 1, recommend a level 3 child if available
        else if (currentCategory.cLevel <= 2) {
          const level3Child = categories.find(cat => 
            cat.parentId === currentCategory.id && cat.cLevel === 3
          );
          if (level3Child) {
            recommendedCategory = level3Child.name;
            console.log('Recommended level 3 child:', level3Child.name);
          } else {
            recommendedCategory = currentCategory.name;
            console.log('No level 3 child found, keeping:', currentCategory.name);
          }
        }
      }

      return {
        ...story,
        'Recommended Category': recommendedCategory
      };
    });

    // Write the updated stories back to CSV
    const headers = Object.keys(updatedStories[0]);
    const csvContent = [
      headers.join(','),
      ...updatedStories.map(story => 
        headers.map(header => {
          const value = story[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    fs.writeFileSync('exports/stories-updated.csv', csvContent);
    console.log('Updated stories CSV written with recommended categories');

  } catch (error) {
    console.error('Error in category recommendation process:', error);
  }
}

recommendCategories(); 