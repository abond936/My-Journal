# Administration System
Status: ✅ Operational
Last Updated: 2024-03-19
Priority: CRITICAL

## 1. Current State
- Entry Management: ✅ Operational
- Tag Management: ✅ Operational
- Album Management: ✅ Operational
- Question Management: �� In Progress

## 2. Feature Status

### 2.1 Entry Management
Status: ✅ Operational
Location: `src/app/admin/entries/page.tsx`

#### Current Features
- Entry listing
- Search and filtering
- Bulk operations
- Inline edits
- Tag assignment  ??
- Content preview ??
- Search and filter

#### Planned Features
- Advanced search
- Batch editing
- Export functionality
- Analytics dashboard

### 2.2 Tag Management
Status: ✅ Operational
Location: `src/app/admin/tags/page.tsx`

#### Current Features
- Tag hierarchy management
- Tag ordering
- Tag relationships
- Tag cleanup
- Bulk operations
- Search and filter

#### Planned Features
- Tag analytics
- Tag suggestions
- Tag merging
- Tag history

### 2.3 Album Management
Status: ✅ Operational
Location: `src/app/admin/albums/page.tsx`

#### Current Features
- Album creation and editing
- Media organization
- Album metadata management
- Bulk operations
- Search and filter

#### Planned Features
- Media analytics
- Batch upload
- Album templates
- Album sharing

### 2.4 Question Management
Status: 🚧 In Progress
Location: `src/app/admin/questions/page.tsx`

#### Current Features
- Question listing and filtering
- Question creation and editing
- Answer management
- Basic analytics

#### Planned Features
- Advanced analytics
- Question templates
- Answer validation
- User feedback

## 3. Directory Strategy
CRITICAL: This strategy MUST be followed for all new admin features.

### 3.1 Adding New Features
IF adding a new feature THEN:
1. Create feature directory in `src/app/admin/[feature]/`
2. Create corresponding service in `src/lib/services/admin/[feature]Service.ts`
3. Create corresponding hook in `src/lib/hooks/admin/useAdmin[Feature].ts`
4. Update this document with new feature status
5. Add feature to Current State section

### 3.2 Directory Validation
BEFORE committing new directories:
- [ ] Feature directory exists in `src/app/admin/`
- [ ] Service file exists in `src/lib/services/admin/`
- [ ] Hook file exists in `src/lib/hooks/admin/`
- [ ] Feature documented in Administration.md
- [ ] Feature added to Current State

### 3.3 Example Additions
✅ CORRECT:
```
src/app/admin/analytics/
  └── page.tsx
src/lib/services/admin/
  └── analyticsService.ts
src/lib/hooks/admin/
  └── useAdminAnalytics.ts
```

❌ INCORRECT:
```
src/app/admin/analytics.tsx        // Wrong: Should be in directory
src/lib/services/analytics.ts      // Wrong: Should be in admin/
src/lib/hooks/useAnalytics.ts      // Wrong: Should be in admin/
```

## 4. Directory Structure
CRITICAL: All admin components MUST follow this structure.

```
src/app/admin/
├── entries/
│   └── page.tsx
├── tags/
│   ├── page.tsx
│   └── SortableTag.tsx
├── albums/
│   └── page.tsx
├── questions/
│   └── page.tsx
└── layout.tsx

src/lib/services/admin/
├── entryService.ts
├── tagService.ts
├── albumService.ts
└── questionService.ts

src/lib/hooks/admin/
├── useAdminEntry.ts
├── useAdminTag.ts
├── useAdminAlbum.ts
└── useAdminQuestion.ts
```

## 5. Data Models
CRITICAL: All admin data MUST follow these models.

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

## 6. Common Issues
CRITICAL: These issues MUST be avoided.

### 6.1 Data Consistency
❌ DO NOT:
- Skip history tracking
- Skip metadata updates
- Skip validation
- Skip error handling

### 6.2 UI Patterns
❌ DO NOT:
- Mix different UI patterns
- Skip loading states
- Skip error states
- Skip confirmation dialogs

### 6.3 Security
❌ DO NOT:
- Skip permission checks
- Skip audit logging
- Skip input validation
- Skip error handling

## 7. Current Focus
- Implementing Question Management
- Enhancing analytics
- Improving data validation
- Adding batch operations

## 8. Recent Changes
- Added Question Management
- Enhanced data models
- Improved error handling
- Added analytics tracking 