import { db } from '../src/lib/firebase';
import { collection, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';

interface Story {
  id: string;
  type: 'story' | 'reflection';
  tags: {
    about: string;
    who: string;
    what: string;
    when: string;
    where: string;
  };
}

interface Category {
  id: string;
  name: string;
  dimension: 'about' | 'who' | 'what' | 'when' | 'where';
  parentId: string | null;
  order: number;
  isReflection: boolean;
}

// Cache for categories to avoid repeated lookups
const categoryCache = new Map<string, Category>();

async function getCategory(id: string): Promise<Category | null> {
  if (categoryCache.has(id)) {
    return categoryCache.get(id)!;
  }
  
  const categoryRef = doc(db, 'categories', id);
  const categoryDoc = await getDoc(categoryRef);
  
  if (!categoryDoc.exists()) {
    return null;
  }
  
  const category = categoryDoc.data() as Category;
  categoryCache.set(id, category);
  return category;
}

async function getInheritedTags(categoryId: string): Promise<string[]> {
  const inherited: string[] = [];
  let currentId = categoryId;
  
  while (currentId) {
    const category = await getCategory(currentId);
    if (!category) break;
    
    inherited.push(category.name);
    currentId = category.parentId || '';
  }
  
  return inherited.reverse();
}

async function updateStoryTags() {
  try {
    // Get all stories
    const storiesRef = collection(db, 'stories');
    const storiesSnapshot = await getDocs(storiesRef);
    
    // Process each story
    for (const storyDoc of storiesSnapshot.docs) {
      const story = storyDoc.data() as Story;
      
      // Update story type
      const type = story.type || 'story';
      
      // Get inherited tags for each dimension
      const [aboutInherited, whoInherited, whatInherited, whenInherited, whereInherited] = await Promise.all([
        story.tags.about ? getInheritedTags(story.tags.about) : [],
        story.tags.who ? getInheritedTags(story.tags.who) : [],
        story.tags.what ? getInheritedTags(story.tags.what) : [],
        story.tags.when ? getInheritedTags(story.tags.when) : [],
        story.tags.where ? getInheritedTags(story.tags.where) : []
      ]);
      
      // Update tags with inheritance
      const updatedTags = {
        about: {
          selected: story.tags.about || '',
          inherited: aboutInherited
        },
        who: {
          selected: story.tags.who || '',
          inherited: whoInherited
        },
        what: {
          selected: story.tags.what || '',
          inherited: whatInherited
        },
        when: {
          selected: story.tags.when || '',
          inherited: whenInherited
        },
        where: {
          selected: story.tags.where || '',
          inherited: whereInherited
        }
      };
      
      // Update the document
      await updateDoc(storyDoc.ref, {
        type,
        tags: updatedTags
      });
      
      console.log(`Updated story: ${storyDoc.id}`);
    }
    
    console.log('All stories updated successfully');
  } catch (error) {
    console.error('Error updating stories:', error);
  }
}

// Run the update
updateStoryTags(); 