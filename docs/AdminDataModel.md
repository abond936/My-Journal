## 5. Data Models
CRITICAL: All admin data MUST follow these models.
----------------------------------------------------------------
### 5.1 Entry Model
```typescript
interface AdminEntry {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  metadata: {
    wordCount: number;
    readTime: number;
    lastPublishedAt?: Date;
    publishCount: number;
  };
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```
----------------------------------------------------------------
### 5.2 Tag Model
```typescript
interface AdminTag {
  id: string;
  name: string;
  dimension: string;
  parentId: string | null;
  order: number;
  entryCount: number;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  metadata: {
    description?: string;
    color?: string;
    icon?: string;
    isSystem: boolean;
  };
  relationships: {
    parent?: string;
    children: string[];
    siblings: string[];
  };
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```
----------------------------------------------------------------
### 5.3 Album Model
```typescript
interface AdminAlbum {
  id: string;
  name: string;
  description: string;
  mediaCount: number;
  tags: string[];
  lastModifiedBy: string;
  lastModifiedAt: Date;
  metadata: {
    coverImageId?: string;
    visibility: 'private' | 'family' | 'public';
    creationDate: Date;
    lastMediaAdded: Date;
  };
  media: {
    id: string;
    order: number;
    addedAt: Date;
    addedBy: string;
  }[];
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```
----------------------------------------------------------------
### 5.4 Question Model
```typescript
interface AdminQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'open_ended' | 'rating' | 'custom';
  category: string;
  tags: string[];
  status: 'draft' | 'active' | 'archived';
  metadata: {
    difficulty: number;
    importance: number;
    usageCount: number;
    lastAsked: Date;
  };
  answers: {
    id: string;
    text: string;
    isCorrect?: boolean;
    feedback?: string;
    usageCount: number;
  }[];
  analytics: {
    totalAnswers: number;
    correctAnswers: number;
    averageRating: number;
    userEngagement: number;
  };
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```
----------------------------------------------------------------
