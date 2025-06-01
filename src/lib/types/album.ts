export interface Album {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  tags: string[];
  mediaCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
} 