import { PhotoMetadata } from './photo';

export interface Card {
  id: string;
  type: 'story' | 'qa' | 'quote' | 'callout' | 'gallery';
  displayMode: 'inline' | 'navigate' | 'static';
  status: 'draft' | 'published';
  
  title: string;
  subtitle?: string;
  excerpt?: string;
  content?: string;
  
  coverImage: PhotoMetadata | null;
  
  // Explicitly separated media arrays for clarity
  contentMedia: PhotoMetadata[]; // For images embedded in rich text content
  galleryMedia: PhotoMetadata[]; // For a 'gallery' type card's image grid
  
  tags: string[];
  inheritedTags: string[];
  tagPaths: string[][]; // Array of ancestor paths for each tag
  
  childrenIds?: string[];
  
  createdAt: number;
  updatedAt: number;
} 