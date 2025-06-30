# Children/Parent Card System Evolution

## Overview

This document outlines the plan for evolving the card parent-child system to support:
- Multiple parents per card
- Ordered children within each parent
- Backward compatibility with existing data
- Gradual migration path

## Current System

### Data Model
```typescript
interface Card {
  // ... other fields ...
  childrenIds?: string[];  // Simple array of child card IDs
  type: 'story' | 'qa' | 'quote' | 'callout' | 'gallery' | 'collection';
}
```

### Limitations
1. Cards can only be assigned to one parent
2. Child ordering is implicit in array order
3. No direct way to find a card's parent
4. Moving cards requires full parent-child relationship update

## Enhanced System

### Data Model
```typescript
interface Card {
  // ... other fields ...
  
  // Existing (for backward compatibility)
  childrenIds?: string[];
  
  // New fields
  parentIds?: string[];                    // Array of parent card IDs
  parentOrders?: Record<string, number>;   // { parentId: orderNumber }
  
  // Optional metadata about parent-child relationship
  parentMetadata?: {
    [parentId: string]: {
      order: number;
      addedAt: number;
      relationship?: string;  // e.g., 'chapter', 'event', 'subsection'
    }
  };
}
```

### Benefits
1. Cards can belong to multiple parent cards
2. Explicit ordering within each parent
3. Bidirectional parent-child navigation
4. Easy card movement between parents
5. Rich metadata about relationships

## Implementation Phases

### Phase 1: Schema Update
1. Update `cardSchema` in `src/lib/types/card.ts`:
```typescript
export const cardSchema = z.object({
  // ... existing fields ...
  
  // Keep existing childrenIds
  childrenIds: z.array(z.string()).optional(),
  
  // Add new parent reference fields
  parentIds: z.array(z.string()).optional(),
  parentOrders: z.record(z.number()).optional(),
  parentMetadata: z.record(z.object({
    order: z.number(),
    addedAt: z.number(),
    relationship: z.string().optional()
  })).optional()
});
```

2. Update TypeScript types and interfaces where Card type is used
3. Add validation rules for parent-child relationships

### Phase 2: Service Layer Updates

1. Enhance CardService with new methods:
```typescript
interface CardService {
  // New parent-child methods
  addParent(cardId: string, parentId: string, order?: number): Promise<void>;
  removeParent(cardId: string, parentId: string): Promise<void>;
  updateParentOrder(cardId: string, parentId: string, order: number): Promise<void>;
  getParents(cardId: string): Promise<Card[]>;
  getChildren(cardId: string, ordered?: boolean): Promise<Card[]>;
  
  // Enhanced existing methods to work with both systems
  moveCard(cardId: string, newParentId: string, oldParentId?: string): Promise<void>;
  deleteCard(cardId: string): Promise<void>;  // Handle parent/child cleanup
}
```

2. Implementation maintains both systems:
```typescript
async function addParent(cardId: string, parentId: string, order?: number) {
  const batch = db.batch();
  
  // Update child's parentIds
  const cardRef = db.collection('cards').doc(cardId);
  batch.update(cardRef, {
    parentIds: FieldValue.arrayUnion(parentId),
    [`parentOrders.${parentId}`]: order || 0,
    [`parentMetadata.${parentId}`]: {
      order: order || 0,
      addedAt: Date.now()
    }
  });
  
  // Update parent's childrenIds (backward compatibility)
  const parentRef = db.collection('cards').doc(parentId);
  batch.update(parentRef, {
    childrenIds: FieldValue.arrayUnion(cardId)
  });
  
  await batch.commit();
}
```

### Phase 3: UI Components

1. Enhanced Card Form:
```typescript
function CardForm({ card }: { card: Card }) {
  return (
    <form>
      {/* ... existing fields ... */}
      
      <ParentSelector
        card={card}
        onAddParent={async (parentId) => {
          await cardService.addParent(card.id, parentId);
        }}
        onRemoveParent={async (parentId) => {
          await cardService.removeParent(card.id, parentId);
        }}
      />
      
      <ChildOrderManager
        card={card}
        onReorder={async (updates) => {
          await cardService.updateChildrenOrder(card.id, updates);
        }}
      />
    </form>
  );
}
```

2. Parent Selector Component:
```typescript
function ParentSelector({ card, onAddParent, onRemoveParent }) {
  const [parents, setParents] = useState<Card[]>([]);
  
  return (
    <div className={styles.parentSelector}>
      <h3>Parent Cards</h3>
      
      {/* Current Parents */}
      <div className={styles.currentParents}>
        {parents.map(parent => (
          <div key={parent.id} className={styles.parentCard}>
            <span>{parent.title}</span>
            <button onClick={() => onRemoveParent(parent.id)}>Remove</button>
          </div>
        ))}
      </div>
      
      {/* Add New Parent */}
      <CardSearch
        onSelect={onAddParent}
        filter={card => card.id !== card.id}
      />
    </div>
  );
}
```

3. Child Order Manager with Drag-and-Drop:
```typescript
function ChildOrderManager({ card, onReorder }) {
  const [children, setChildren] = useState<Card[]>([]);
  
  return (
    <div className={styles.childManager}>
      <h3>Child Cards</h3>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="children">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {children.map((child, index) => (
                <Draggable key={child.id} draggableId={child.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <span>{child.title}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

### Phase 4: Data Migration

1. Create migration script:
```typescript
async function migrateParentChildRelationships() {
  const cards = await db.collection('cards').get();
  const batch = db.batch();
  let batchCount = 0;
  
  for (const cardDoc of cards.docs) {
    const card = cardDoc.data();
    if (card.childrenIds?.length) {
      // For each child, add this card as a parent
      for (let i = 0; i < card.childrenIds.length; i++) {
        const childId = card.childrenIds[i];
        const childRef = db.collection('cards').doc(childId);
        
        batch.update(childRef, {
          parentIds: FieldValue.arrayUnion(card.id),
          [`parentOrders.${card.id}`]: i,
          [`parentMetadata.${card.id}`]: {
            order: i,
            addedAt: Date.now()
          }
        });
        
        batchCount++;
        if (batchCount >= 500) {  // Firestore batch limit
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
}
```

2. Run migration in stages:
   - Test on development data
   - Run on staging environment
   - Schedule production migration
   - Verify data integrity after each stage

### Phase 5: Cleanup

After migration is complete and new system is stable:

1. Mark `childrenIds` as deprecated in schema
2. Update documentation
3. Remove backward compatibility code
4. Clean up any unused code paths

## Testing Strategy

1. Unit Tests:
   - Parent-child relationship management
   - Order management
   - Data validation
   - Service method behavior

2. Integration Tests:
   - UI component interaction
   - Data flow through layers
   - Migration script behavior
   - Error handling

3. UI Tests:
   - Drag-and-drop functionality
   - Parent selection
   - Child ordering
   - Error states

4. Migration Tests:
   - Data integrity
   - Backward compatibility
   - Performance impact
   - Error recovery

## Rollback Plan

1. Keep `childrenIds` as source of truth during migration
2. Maintain backup of pre-migration data
3. Create rollback scripts
4. Test rollback procedures
5. Document recovery steps

## Timeline

1. Phase 1 (Schema Update): 1 day
2. Phase 2 (Service Layer): 2-3 days
3. Phase 3 (UI Components): 3-4 days
4. Phase 4 (Migration): 1-2 days
5. Phase 5 (Cleanup): 1 day

Total: 8-11 days with testing and validation 