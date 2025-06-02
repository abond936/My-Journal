// Heirarchical categorization system

export interface Tag {
  id: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  order?: number;
  description?: string;
  entryCount?: number;
  albumCount?: number;

  //   createdAt: Date;
  //updatedAt: Date;

  // Planned Properties
  // path: string[];          //  For hierarchical queries
  //entryCount: number;       //  For analytics
  //description: string;      //  For better organization
  //color: string;            //  For visual distinction
} 