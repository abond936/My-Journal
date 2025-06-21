// Heirarchical categorization system

export interface Tag {
  id: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  path?: string[];             // For hierarchical queries, array of ancestor IDs
  order?: number;
  description?: string;
  entryCount?: number;         // Change to cardCount
  albumCount?: number;         // Delete

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;

  // Planned Properties
  // color: string;            //  For visual distinction
} 