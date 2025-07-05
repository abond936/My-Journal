# **Card and Tag Ecosystem Documentation**

## **1. System Overview**

The application uses a dimensional hierarchical tag system for organizing journal content. Cards (stories, Q&A, quotes, etc.) are tagged with dimensional tags (who, what, when, where, reflection) that inherit from parent tags, enabling flexible content discovery and filtering.

## **2. Data Models**

### **Card Schema**
```typescript
interface Card {
  // Core content
  docId: string;
  title: string;
  content: string; // HTML with embedded media
  type: 'story' | 'qa' | 'quote' | 'callout' | 'gallery' | 'collection';
  status: 'draft' | 'published';
  displayMode: 'inline' | 'navigate' | 'static';
  
  // Media references
  coverImageId?: string;
  contentMedia?: string[]; // Media IDs embedded in content
  galleryMedia?: GalleryMediaItem[];
  
  // Tag system - DIMENSIONAL HIERARCHICAL
  tags: string[]; // Direct tag selections only
  who: string[]; // Inherited tags for 'who' dimension
  what: string[]; // Inherited tags for 'what' dimension
  when: string[]; // Inherited tags for 'when' dimension
  where: string[]; // Inherited tags for 'where' dimension
  reflection: string[]; // Inherited tags for 'reflection' dimension
  filterTags: Record<string, boolean>; // All inherited tags for queries
  
  // Relationships
  childrenIds?: string[]; // For collection cards
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}
```

### **Tag Schema**
```typescript
interface Tag {
  docId: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string; // Hierarchical relationship
  path: string[]; // Pre-calculated ancestor path for performance
  order?: number; // Display ordering
  description?: string;
  cardCount: number; // Number of cards using this tag
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}
```

## **3. Tag Inheritance System**

### **Hierarchical Structure**
```
Who Dimension:
├── Family
│   ├── Parents
│   │   ├── Mom
│   │   └── Dad
│   └── Children
│       ├── Child1
│       └── Child2
└── Friends
    ├── Close Friends
    └── Work Friends

When Dimension:
├── Years
│   ├── 2024
│   │   ├── January
│   │   └── February
│   └── 2023
└── Life Stages
    ├── Childhood
    ├── Adulthood
    └── Retirement
```

### **Inheritance Rules**
- Child tags inherit their parent's dimension
- When a card is tagged with a child tag, it automatically inherits all ancestor tags
- Inheritance is calculated server-side and stored in dimensional arrays
- Direct tag selection is preserved separately from inherited tags

## **4. Card Creation Flow**

### **4.1 New Card Creation**
```
User Interface → CardFormProvider → API → cardService → Database
```

**Step 1: User Interface**
- User navigates to `/admin/card-admin/new`
- `CardAdminClientPage` loads with `cardId: null`
- `CardFormProvider` initializes with empty card state

**Step 2: Tag Selection**
- User opens `MacroTagSelector` (dimensional tag tree interface)
- User selects tags from dimensional trees (who, what, when, where, reflection)
- Selections stored in `CardFormProvider` state as `cardData.tags`

**Step 3: Form Submission**
- User clicks "Create Card"
- `CardFormProvider.handleSave()` processes form data
- `dehydrateCardForSave()` strips transient fields
- Payload sent to `/api/cards` (POST)

**Step 4: Server Processing**
- `cardService.createCard()` receives direct tag selections
- `calculateDerivedTagData()` processes inheritance:
  ```typescript
  // Input: directTagIds = ['mom', '2024', 'vacation']
  // Output: 
  // - filterTags: { 'mom': true, 'parents': true, 'family': true, '2024': true, 'vacation': true }
  // - dimensionalTags: { who: ['mom', 'parents', 'family'], when: ['2024'], what: ['vacation'] }
  ```

**Step 5: Database Storage**
- Card document created with:
  - `tags: ['mom', '2024', 'vacation']` (direct selections)
  - `who: ['mom', 'parents', 'family']` (inherited)
  - `when: ['2024']` (inherited)
  - `what: ['vacation']` (inherited)
  - `filterTags: { 'mom': true, 'parents': true, 'family': true, '2024': true, 'vacation': true }`

### **4.2 Card Editing Flow**

**Step 1: Card Loading**
- User navigates to `/admin/card-admin/[id]/edit`
- `CardAdminClientPage` fetches card data via SWR
- `CardFormProvider` initializes with existing card data

**Step 2: Tag Display**
- `CardForm.selectedTagObjects` filters `cardData.tags` to show only direct selections
- `MacroTagSelector` displays dimensional trees with direct tags checked
- Inherited tags are visible but not checked (showing hierarchy)

**Step 3: Tag Modification**
- User modifies tag selections in `MacroTagSelector`
- Changes flow: `MacroTagSelector` → `CardForm.handleTagsChange()` → `CardFormProvider.setField()`
- Only direct selections are stored in `cardData.tags`

**Step 4: Save Processing**
- `CardFormProvider.handleSave()` sends direct tags to API
- `cardService.updateCard()` recalculates inheritance
- Database updated with new direct and inherited tag arrays

## **5. Tag Management Flow**

### **5.1 Tag Creation**
```
TagAdmin → API → tagService → Database
```

**Step 1: Tag Admin Interface**
- User navigates to `/admin/tag-admin`
- `TagProvider` loads all tags via SWR
- `TagAdminList` displays hierarchical tag tree

**Step 2: Tag Creation**
- User clicks "+" to add child tag
- `TagAdminRow` opens inline creation form
- User specifies name, dimension, parent

**Step 3: Server Processing**
- `tagService.createTag()` processes tag data
- Inherits dimension from parent if not specified
- Calculates and stores `path` array for performance
- Updates parent's `cardCount` if needed

### **5.2 Tag Hierarchy Management**
- Drag-and-drop reparenting via `TagAdminList`
- Automatic path recalculation for affected subtrees
- Card count updates for all affected tags
- Dimension inheritance validation

## **6. Content Discovery Flow**

### **6.1 Tag-Based Filtering**
```
GlobalSidebar → CardProvider → API → cardService → Database
```

**Step 1: Tag Selection**
- User selects tags in `GlobalSidebar` dimensional trees
- `TagProvider` manages global filter state
- `CardProvider` applies filters to card queries

**Step 2: Query Construction**
- Selected tags converted to dimensional filter:
  ```typescript
  {
    who: ['family'],
    when: ['2024'],
    what: ['vacation']
  }
  ```

**Step 3: Database Query**
- `cardService.getCards()` constructs Firestore query
- Uses `filterTags` field for efficient tag-based filtering
- Returns paginated results with inherited tag matching

### **6.2 Search and Discovery**
- Full-text search across title and content
- Dimensional tag filtering for precise discovery
- Hierarchical tag browsing in sidebar
- Collection-based navigation (planned)

## **7. Data Flow Architecture**

### **7.1 Client-Side State Management**
```
TagProvider (Global)
├── All tags data
├── Tag tree structures
├── Global filter state
└── Tag CRUD operations

CardProvider (Global)
├── Card list data
├── Filter state
├── Pagination state
└── Search state

CardFormProvider (Local)
├── Current card form state
├── Direct tag selections
├── Form validation
└── Save operations
```

### **7.2 Server-Side Processing**
```
API Routes
├── /api/cards (GET/POST)
├── /api/cards/[id] (GET/PUT/PATCH/DELETE)
├── /api/tags (GET/POST)
└── /api/tags/[id] (GET/PATCH/DELETE)

Services
├── cardService (CRUD operations)
├── tagService (Tag operations)
└── calculateDerivedTagData (Inheritance)

Database
├── cards collection
├── tags collection
└── media collection
```

## **8. Key Utilities and Functions**

### **8.1 Tag Processing**
```typescript
// Calculate inheritance from direct tags
calculateDerivedTagData(directTagIds: string[]): {
  filterTags: Record<string, boolean>;
  dimensionalTags: OrganizedTags;
}

// Organize tags by dimension
organizeTagsByDimension(tagIds: string[]): OrganizedTags

// Get only direct tags for UI display
getCoreTagsByDimension(card: Card): OrganizedTags

// Build tag trees for UI
buildTagTree(tags: Tag[]): TagWithChildren[]
createUITreeFromDimensions(tags: Tag[]): TagWithChildren[]
```

### **8.2 Card Processing**
```typescript
// Strip transient fields for database save
dehydrateCardForSave(card: any): CardUpdate

// Extract media IDs from content
extractMediaFromContent(html: string): string[]

// Hydrate cards with media objects
_hydrateCards(cards: Card[]): Card[]
```

## **9. Performance Considerations**

### **9.1 Denormalization Strategy**
- Tags denormalized into cards for query performance
- `filterTags` field enables efficient tag-based queries
- Pre-calculated `path` arrays avoid recursive queries
- Tag counts maintained for UI performance

### **9.2 Query Optimization**
- Firestore limitations handled with server-side filtering
- Batch operations for tag count updates
- Pagination for large result sets
- Caching via SWR for client-side data

## **10. Future Enhancements**

### **10.1 Planned Features**
- Quick Filters (saved tag combinations)
- Enhanced Tag Sidebar (collapsible dimensions)
- Table of Contents (curated collections)
- Advanced search with tag relationships

### **10.2 Architectural Improvements**
- Tag metadata for enhanced categorization
- Sub-dimension support for finer organization
- Tag aliases for flexible naming
- Automated tag suggestions based on content

This documentation provides the complete context for understanding and working with the card and tag ecosystem, from data models through user interactions to system architecture. 