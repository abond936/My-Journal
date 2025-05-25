# My Journal - Technical Specification

## Overview

My Journal is a personal journaling application that focuses on creating a fluid, intuitive experience for navigating through stories and images. The core feature is the user experience of seamlessly moving through content, with story management being a crucial supporting feature.

## Architecture

### 1. Frontend
- Next.js 14 with App Router
- React Server Components
- Client Components for interactivity
- Tailwind CSS for styling

### 2. Backend
- Firebase Firestore for database
- Firebase Authentication for user management
- Firebase Storage for media files

### 3. Data Model

#### A. Content Types
```typescript
interface Content {
  id: string;
  type: 'story' | 'reflection';
  title: string;
  content: string;
  tags: {
    about: {
      selected: string;        // The lowest level tag user selected
      inherited: string[];     // Automatically inherited tags
    };
    who: {
      selected: string;
      inherited: string[];
    };
    what: {
      selected: string;
      inherited: string[];
    };
    when: {
      selected: string;
      inherited: string[];
    };
    where: {
      selected: string;
      inherited: string[];
    };
  };
  metadata: {
    date: Date;
    images?: Image[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### B. Categories Collection
```typescript
interface Category {
  id: string;
  name: string;
  dimension: 'about' | 'who' | 'what' | 'when' | 'where';
  parentId: string | null;
  order: number;
  isReflection: boolean;
  path: string[];  // Full path for easy querying
  createdAt: Date;
  updatedAt: Date;
}
```

#### C. Settings Collection
```typescript
interface Settings {
  id: string;
  lifeStages: {
    [stage: string]: {
      startYear: number;
      startMonth: number;
      endYear?: number;
      endMonth?: number;
    };
  };
  updatedAt: Date;
}
```

### 4. Database Structure

#### A. Collections
1. **Content**
   - Main content storage
   - Includes stories and reflections
   - Tagged with categories
   - Includes metadata

2. **Categories**
   - Hierarchical organization
   - Five main dimensions
   - Maintains order
   - Supports inheritance
   - Includes reflection types

3. **Settings**
   - Application configuration
   - Life stage definitions
   - User preferences

#### B. Indexes
```typescript
// Collection: categories
{
  "dimension": "ASCENDING",
  "parentId": "ASCENDING",
  "order": "ASCENDING",
  "isReflection": "ASCENDING"
}

// Collection: content
{
  "type": "ASCENDING",
  "tags.about.selected": "ASCENDING",
  "tags.who.selected": "ASCENDING",
  "tags.what.selected": "ASCENDING",
  "tags.when.selected": "ASCENDING",
  "tags.where.selected": "ASCENDING",
  "metadata.date": "ASCENDING"
}
```

### 5. Data Migration

#### A. Category Import
- Import categories from CSV
- Maintain parent-child relationships
- Set up inheritance
- Validate structure
- Handle reflection types

#### B. Content Update
- Update content with new category structure
- Convert existing categories to new format
- Maintain data integrity
- Handle missing or invalid data
- Update story types

#### C. Settings Setup
- Initialize life stage settings
- Configure date ranges
- Set up default values

### 6. Data Flow

#### A. Read Operations
1. **Fetching Stories**
   - By category
   - By date range
   - By tags
   - With pagination

2. **Fetching Categories**
   - By level
   - By parent
   - With hierarchy

#### B. Write Operations
1. **Story Management**
   - Create/update stories
   - Add/remove tags
   - Manage images

2. **Category Management**
   - Create/update categories
   - Reorder categories
   - Update display levels

### 7. Security

#### A. Authentication
- Firebase Authentication
- Protected routes
- User-specific data

#### B. Security Rules
```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Implementation Details

### 1. Category System

#### A. Level Management
- `cLevel`: Actual category level (1-5)
- `dLevel`: Display level (can differ from cLevel)
- Parent-child relationships
- Order within levels

#### B. Display Options
- Hierarchical view
- Flat view
- Custom grouping
- Collapsible sections

### 2. Story Management

#### A. Content Organization
- Rich text content
- Image support
- Tag system
- Date tracking

#### B. Navigation
- Category-based
- Chronological
- Tag-based
- Search functionality

### 3. Performance Optimization

#### A. Caching
- Client-side caching
- Server-side caching
- Incremental updates

#### B. Query Optimization
- Efficient indexes
- Pagination
- Batch operations

### 4. Migration Strategy

#### A. Phase 1: Schema Update
- Create new collections
- Set up indexes
- Configure security

#### B. Phase 2: Data Migration
- Parse existing content
- Map to new structure
- Validate data

#### C. Phase 3: Testing
- Verify integrity
- Test performance
- Validate security

#### D. Phase 4: Cleanup
- Remove old collections
- Update application
- Deploy changes

## Future Considerations

### 1. Features
- Photo albums
- Advanced search
- Tag management
- Social sharing

### 2. Performance
- Caching strategies
- Query optimization
- Data archiving

### 3. Scaling
- Document splitting
- Batch operations
- Rate limiting

## Best Practices

### 1. Data Modeling
- Keep documents small
- Use references
- Denormalize when needed

### 2. Security
- Validate data
- Use security rules
- Implement rate limiting

### 3. Performance
- Use indexes
- Implement caching
- Optimize queries

## Questions and Considerations

### 1. Database Design
- Do we need separate collections for story and photo tags?
- How to handle life-stage categorization?
- What's the best approach for image references?

### 2. Performance
- How to optimize large dataset loading?
- What's the best caching strategy?
- How to handle real-time updates efficiently?

### 3. User Experience
- How to make navigation more fluid?
- What's the best approach for story editing?
- How to handle image galleries?

## Next Steps

1. Implement pagination for story loading
2. Evaluate template approach
3. Standardize CSS system
4. Set up proper testing
5. Document API endpoints
6. Create deployment pipeline

## Database Schema

### Content Types
- Stories (answers to questions or direct stories)
- Reflections (on individual stories or groups of stories)
- About (special case, index level 0)

### Tag Structure
```typescript
interface Tag {
  id: string;
  name: string;
  dimension: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  order: number;
  isLifeStage?: boolean;  // For when dimension
  isAll?: boolean;        // Special flag for "All" entries
}

interface Content {
  id: string;
  type: 'story' | 'reflection' | 'about';
  title: string;
  content: string;
  tags: {
    who: {
      selected: string;        // The lowest level tag user selected (e.g., "Dad")
      inherited: string[];     // Automatically inherited tags (e.g., ["Parents", "Family"])
    };
    what: {
      selected: string;
      inherited: string[];
    };
    when: {
      lifeStage: {
        selected: string;      // e.g., "Adulthood"
        inherited: string[];   // e.g., ["Life"]
      };
      chronological?: {
        year?: number;
        month?: number;
      };
    };
    where: {
      selected: string;
      inherited: string[];
    };
    reflectionType?: string;   // Only for reflections
  };
  metadata: {
    date: Date;
    images?: Image[];
  };
}
```

### Tag Inheritance and Updates
- Tags automatically inherit parent tags
- Tag structure changes are handled in real-time
- All related content is updated immediately when tag structure changes
- Batch updates are used to ensure consistency

```typescript
async function updateTagStructure(oldTag: Tag, newParent: Tag) {
  // Start a transaction
  const batch = db.batch();
  
  // Update tag
  batch.update(tagRef, { parentId: newParent.id });
  
  // Get all affected content
  const contentWithTag = await getContentByTag(oldTag.id);
  
  // Update each content item
  for (const content of contentWithTag) {
    const newInheritedTags = await calculateInheritedTags(oldTag.id);
    batch.update(contentRef, { 
      'tags.who.inherited': newInheritedTags 
    });
  }
  
  // Commit all changes atomically
  await batch.commit();
}
```

## User Interface

### Layout
```
+----------------+----------------+
|                |                |
|   Left Sidebar |   Main Content |
|   (Tag Tree)   |   Area        |
|                |                |
|   [Sort Controls]              |
|   Primary: [Who ▼]             |
|   Secondary: [What ▼]          |
|   Tertiary: [When ▼]           |
|                                |
|   [View Type]                  |
|   [Card ▼] [List ▼] [Timeline ▼]|
|                                |
|   Who                          |
|   ├─ All                       |
|   ├─ Family                    |
|   └─ ...                       |
|                                |
|   What                         |
|   ├─ All                       |
|   └─ ...                       |
|                                |
|   When                         |
|   ├─ All                       |
|   └─ ...                       |
|                                |
|   Where                        |
|   ├─ All                       |
|   └─ ...                       |
|                                |
+----------------+----------------+
```

### Key Features
1. **Sidebar Organization**
   - All filter and sort controls in the sidebar
   - Collapsible sections for each dimension
   - Breadcrumb navigation for deep tag structures
   - "All" entry for each major category

2. **Content Display Options**
   - Card View: Visual grid layout
   - List View: Compact text-based layout
   - Timeline View: Chronological organization
   - Map View: Location-based organization (optional)

3. **Sorting and Filtering**
   - Primary, secondary, and tertiary sort options
   - Filter by any combination of dimensions
   - Save and load filter combinations
   - Clear individual filters

4. **Mobile Considerations**
   - Collapsible sidebar
   - Touch-friendly controls
   - Responsive layouts
   - Optimized for vertical scrolling

### User Roles
1. **Author**
   - Full access to all features
   - Can modify tag structure
   - Can create and edit content
   - Can manage all settings

2. **Reader**
   - Read-only access
   - Can use all viewing and filtering options
   - No access to editing features

## Implementation Notes
- Real-time updates for tag structure changes
- Batch processing for content updates
- Optimized for single-author use case
- Focus on consistency over performance
- Mobile-first responsive design
- Leverage Google Photos capabilities
- Minimize duplicate data storage

## Editing Capabilities

### 1. Universal Editing Access
- Edit functionality available from any view
- Context-aware editing based on content type
- Quick access to common editing tasks
- Inline editing for immediate changes

### 2. Photo and Album Management
- Direct integration with Google Photos
- Utilize Google Photos metadata where possible
- Store additional metadata in Firestore
- Maintain single source of truth for photos

### 3. View Options
- Toggle display of captions
- Toggle display of tags
- Toggle display of metadata
- Multiple view modes (grid, list, timeline)
- Customizable view preferences

### 4. Story Prompting
- Trigger story creation from photo viewing
- Context-aware prompts based on photo content
- Seamless transition from photo to story creation
- Maintain connection between photos and stories

## Google Photos Integration

### 1. Data Structure
- Primary storage in Google Photos
- Extended metadata in Firestore
- Synchronized metadata between systems
- Minimal duplicate data storage

### 2. Metadata Management
- Utilize Google Photos native metadata
- Extend with custom metadata as needed
- Maintain consistency across platforms
- Handle metadata updates efficiently

### 3. Integration Points
- Photo upload and storage
- Album organization
- Metadata synchronization
- View and edit capabilities

### 4. Considerations
- API rate limits
- Data consistency
- Performance optimization
- Error handling
- Offline capabilities

```typescript
async function updateTagStructure(oldTag: Tag, newParent: Tag) {
  // Start a transaction
  const batch = db.batch();
  
  // Update tag
  batch.update(tagRef, { parentId: newParent.id });
  
  // Get all affected content
  const contentWithTag = await getContentByTag(oldTag.id);
  
  // Update each content item
  for (const content of contentWithTag) {
    const newInheritedTags = await calculateInheritedTags(oldTag.id);
    batch.update(contentRef, { 
      'tags.who.inherited': newInheritedTags 
    });
  }
  
  // Commit all changes atomically
  await batch.commit();
}
```

```typescript
async function updateTagStructure(oldTag: Tag, newParent: Tag) {
  // Start a transaction
  const batch = db.batch();
  
  // Update tag
  batch.update(tagRef, { parentId: newParent.id });
  
  // Get all affected content
  const contentWithTag = await getContentByTag(oldTag.id);
  
  // Update each content item
  for (const content of contentWithTag) {
    const newInheritedTags = await calculateInheritedTags(oldTag.id);
    batch.update(contentRef, { 
      'tags.who.inherited': newInheritedTags 
    });
  }
  
  // Commit all changes atomically
  await batch.commit();
}
```
