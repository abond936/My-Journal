# Tag System Implementation Plan

## Overview

This document outlines the plan for enhancing the journal's tag system to provide more intuitive content discovery through three main approaches:
1. Quick Filters - Pre-configured and saved tag combinations
2. Enhanced Tag Sidebar - Improved dimensional filtering
3. Table of Contents - Curated navigation through collections

## 1. Data Models

### Enhanced Tag Model
```typescript
interface TagMetadata {
  type?: string;      // e.g., 'chronological', 'life-stage'
  sortValue?: number; // Natural ordering value
  aliases?: string[]; // Alternative names
}

interface Tag {
  id: string;
  name: string;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId?: string;
  path?: string[];    // Array of ancestor IDs
  order?: number;
  description?: string;
  metadata?: TagMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Quick Filters
```typescript
interface QuickFilter {
  id: string;
  name: string;
  description?: string;
  tagSelections: {
    [dimension: string]: string[]; // tagIds
  };
  sortBy?: {
    dimension: string;
    direction: 'asc' | 'desc';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Collections (Table of Contents)
```typescript
interface Collection {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  type: 'manual' | 'dynamic';
  cards?: string[];           // For manual collections
  filter?: QuickFilter;       // For dynamic collections
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 2. User Interface Components

### A. Quick Filter Bar
- Location: Top of content area
- Features:
  - Horizontal scrollable list of filter chips
  - Each chip represents a pre-configured or saved filter
  - Visual indication of active filter
  - "Save Current" button when custom filter active
  - Clear filter button

### B. Enhanced Tag Sidebar
- Location: Left sidebar (existing)
- Enhancements:
  - Collapsible dimension sections
  - Visual indicators for tag relationships
  - "Quick Sets" within dimensions
  - Preview counts for selections
  - Save filter combination option
  - Improved indentation and hierarchy visualization

### C. Collection Navigator (TOC)
- Location: Switchable with tag sidebar
- Features:
  - Hierarchical collection display
  - Visual distinction between manual and dynamic collections
  - Drag-and-drop reordering
  - Expandable/collapsible sections
  - Card preview counts

### D. Enhanced Tag Selector Modal
- Location: Card editing interface
- Tabs:
  1. Quick Sets
     - Pre-configured common tag groups
     - Life stages in 'when'
     - Common locations in 'where'
     - Relationship groups in 'who'
  2. Recent Selections
     - Recently used tag combinations
     - Ability to save as Quick Set
  3. Tree View (existing)
     - Enhanced with sub-dimension grouping
     - Improved visual hierarchy

## 3. Implementation Phases

### Phase 1: Foundation
1. Update Tag Schema
   - Add metadata field
   - Add support for sub-dimensions
   - Update validation

2. Quick Filters
   - Implement data model
   - Create API endpoints
   - Add basic UI components
   - Integrate with existing filter logic

3. Collections Framework
   - Implement data model
   - Create API endpoints
   - Add basic collection management

### Phase 2: Enhanced UI
1. Quick Filter Bar
   - Implement UI component
   - Add save/load functionality
   - Integrate with tag sidebar

2. Enhanced Tag Sidebar
   - Add collapsible sections
   - Implement Quick Sets
   - Add preview counts
   - Improve visual hierarchy

3. Collection Navigator
   - Implement basic TOC view
   - Add manual collection management
   - Implement dynamic collections

### Phase 3: Advanced Features
1. Tag Selector Enhancements
   - Implement Quick Sets tab
   - Add Recent Selections
   - Improve tree view

2. Performance Optimization
   - Implement caching
   - Add batch operations
   - Optimize queries

3. Analytics and Refinement
   - Add usage tracking
   - Refine UX based on usage
   - Optimize performance

## 4. API Endpoints

### Quick Filters
```typescript
// GET /api/quick-filters
// GET /api/quick-filters/[id]
// POST /api/quick-filters
// PATCH /api/quick-filters/[id]
// DELETE /api/quick-filters/[id]
```

### Collections
```typescript
// GET /api/collections
// GET /api/collections/[id]
// POST /api/collections
// PATCH /api/collections/[id]
// DELETE /api/collections/[id]
// POST /api/collections/[id]/cards
// DELETE /api/collections/[id]/cards
// PATCH /api/collections/[id]/order
```

## 5. Services

### QuickFilterService
```typescript
interface QuickFilterService {
  // CRUD operations
  createQuickFilter(filter: QuickFilter): Promise<QuickFilter>;
  updateQuickFilter(id: string, filter: Partial<QuickFilter>): Promise<QuickFilter>;
  deleteQuickFilter(id: string): Promise<void>;
  
  // Application
  applyQuickFilter(filterId: string): Promise<Card[]>;
  saveCurrentAsQuickFilter(name: string, currentFilter: any): Promise<QuickFilter>;
}
```

### CollectionService
```typescript
interface CollectionService {
  // CRUD operations
  createCollection(collection: Collection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<Collection>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  
  // Card management
  addCardsToCollection(collectionId: string, cardIds: string[]): Promise<void>;
  removeCardsFromCollection(collectionId: string, cardIds: string[]): Promise<void>;
  reorderCollectionCards(collectionId: string, orderedCardIds: string[]): Promise<void>;
  
  // Retrieval
  getCollectionCards(collectionId: string): Promise<Card[]>;
  getCollectionTree(): Promise<Collection[]>;
}
```

### Enhanced TagService
```typescript
interface TagService {
  // Existing operations
  // ... current tag service methods ...

  // New operations
  getTagsByMetadata(type: string): Promise<Tag[]>;
  getTagsWithCounts(): Promise<Array<Tag & { count: number }>>;
  updateTagMetadata(id: string, metadata: TagMetadata): Promise<Tag>;
}
```

## 6. State Management

### Extended TagProvider
```typescript
interface TagContextType {
  // Existing context
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  selectedFilterTagIds: string[];
  setFilterTags: (tagIds: string[]) => void;
  
  // Quick Filters
  quickFilters: QuickFilter[];
  selectedQuickFilter?: QuickFilter;
  applyQuickFilter: (filter: QuickFilter) => void;
  saveCurrentAsQuickFilter: (name: string) => Promise<QuickFilter>;
  
  // Collections
  collections: Collection[];
  selectedCollection?: Collection;
  navigateToCollection: (collectionId: string) => void;
}
```

## 7. Migration Strategy

1. No migration needed for existing tag data
2. New features will be added incrementally
3. Collections can be populated gradually
4. Quick Filters can be created as needed

## 8. Testing Strategy

1. Unit Tests
   - Tag operations
   - Filter logic
   - Collection management
   - Data transformations

2. Integration Tests
   - API endpoints
   - Service interactions
   - State management

3. UI Tests
   - Component rendering
   - User interactions
   - Filter applications

4. Performance Tests
   - Large dataset handling
   - Concurrent operations
   - Cache effectiveness 