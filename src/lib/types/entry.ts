// One of two primary content unit 

import { PhotoMetadata } from '@/lib/services/photos/photoService';

export interface Entry {
  id: string;
  title: string;
  content: string;
  excerpt?: string;  // Added excerpt field
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  type: 'journal' | 'note' | 'photo';
  status: 'draft' | 'published';
  date?: Date;  // Optional date field for when the entry was written/occurred
  publishedAt?: Date;
  authorId: string;
  authorName: string;
  media: PhotoMetadata[];
  visibility: 'public' | 'private';
  coverPhoto: PhotoMetadata | null;

  // Optional dimensions
  who?: string[];      // Array of tag IDs
  what?: string[];     // Array of tag IDs
  when?: string[];     // Array of tag IDs
  where?: string[];    // Array of tag IDs
  reflection?: string[]; // Array of tag IDs

  // Inherited tags for querying
  inheritedTags: string[]; // All tags including ancestors

  // Card layout properties
  size?: 'large' | 'medium' | 'small';  // Added size field for card layout
}

export interface GetEntriesOptions {
  page?: number;
  limit?: number;
  tag?: string;
  tags?: string[];
  type?: 'story' | 'reflection';
  status?: 'draft' | 'published';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type EntryFormData = Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>; 