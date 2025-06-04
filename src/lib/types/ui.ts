import { Entry as DbEntry } from './entry';

// UI-specific types for layout components
export interface UIEntry {
  id: string;
  title: string;
  excerpt: string | null;  // Placeholder until we implement excerpts in the database
  date: string | null;     // Placeholder for migrated entries, will be set for new entries
  tags?: string[];
  // imageUrl?: string;    // Commented out until image system is implemented
  href: string;
  type?: 'story' | 'reflection';
}

// Helper function to transform database entries to UI entries
export function transformToUIEntry(entry: DbEntry): UIEntry {
  return {
    id: entry.id,
    title: entry.title,
    excerpt: null,  // Placeholder until we implement excerpts
    date: entry.date?.toLocaleDateString() || null,  // Use date if available, otherwise null
    tags: entry.tags,
    href: `/view/entry-view/${entry.id}`,
    type: entry.type
  };
} 