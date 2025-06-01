export interface Tag {
  id: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  order?: number;
  description?: string;
  entryCount?: number;
  albumCount?: number;
} 