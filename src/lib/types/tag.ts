// Heirarchical categorization system

export interface Tag {
  id: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  path?: string[]; // For hierarchical queries, array of ancestor IDs
  order?: number;
  description?: string;
  entryCount?: number;
  albumCount?: number;

  //   createdAt: Date;
  //updatedAt: Date;

  // Planned Properties
  //entryCount: number;       //  For analytics
  //description: string;      //  For better organization
  //color: string;            //  For visual distinction
} 