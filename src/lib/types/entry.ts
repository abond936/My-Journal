// One of two primary content unit 

export interface Entry {

  id: string;
  title: string;
  content: string;
  excerpt?: string;  // Added excerpt field
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  type: 'story' | 'reflection';
  status: 'draft' | 'published';
  date?: Date;  // Optional date field for when the entry was written/occurred

 
  //author: string;               If multiple authors allowed
  media?: string[];               // For photo/video attachments
  visibility?: 'private' | 'family' | 'public';  // For access control

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