'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Tag } from '@/lib/types/tag';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * A wrapper component that makes its children draggable and sortable.
 * It connects to the DndContext and provides the necessary props and styles.
 */
function SortableTag({ tag, dropIndicator, children }: { tag: Tag, dropIndicator: DropIndicatorState, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  const isOver = dropIndicator?.overId === tag.id;
  const placement = isOver ? dropIndicator?.placement : null;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Visual Drop Indicator */}
      {placement === 'reparent' && <div style={{ position: 'absolute', inset: 0, border: '2px solid blue', borderRadius: '4px', zIndex: -1 }} />}
      {placement === 'before' && <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: '4px', background: 'blue' }} />}
      {placement === 'after' && <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: '4px', background: 'blue' }} />}

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span {...listeners} style={{ cursor: 'grab', padding: '8px', touchAction: 'none' }}>
          &#x2630;
        </span>
        <div style={{ flexGrow: 1 }}>{children}</div>
      </div>
    </div>
  );
}

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

interface FlattenedTag extends TagWithChildren {
  depth: number;
}

interface TagAdminListProps {
  tags: TagWithChildren[];
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => Promise<Tag | undefined>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateTag: (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag | undefined>;
  onReorder: (activeId: string, overId: string | null, placement: 'before' | 'after' | null) => void;
  onReparent: (activeId: string, overId: string | null) => void;
}

// Type for storing the state of the current drag operation for visual feedback
type DropIndicatorState = {
  activeId: string;
  overId: string;
  placement: 'reparent' | 'before' | 'after';
} | null;

export function TagAdminList({ tags: initialTagTree, onUpdateTag, onDeleteTag, onCreateTag, onReorder, onReparent }: TagAdminListProps) {
  const [tagTree, setTagTree] = useState(initialTagTree);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>(null);

  useEffect(() => {
    setTagTree(initialTagTree);
  }, [initialTagTree]);

  useEffect(() => {
    const initialCollapsed = new Set<string>();
    const findParents = (nodes: TagWithChildren[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          initialCollapsed.add(node.id);
          findParents(node.children);
        }
      }
    }
    findParents(initialTagTree);
    setCollapsedNodes(initialCollapsed);
  }, [initialTagTree]);
  
  const flattenedTree = useMemo(() => {
    const flattened: FlattenedTag[] = [];
    const traverse = (nodes: TagWithChildren[], depth: number) => {
      for (const node of nodes) {
        flattened.push({ ...node, depth });
        if (!collapsedNodes.has(node.id)) {
          traverse(node.children, depth + 1);
        }
      }
    }
    traverse(initialTagTree, 0);
    return flattened;
  }, [initialTagTree, collapsedNodes]);

  const sortedIds = useMemo(() => flattenedTree.map(tag => tag.id), [flattenedTree]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;
    const overId = over?.id as string | null;

    if (!active || !overId || active.id === overId) {
      setDropIndicator(null);
      return;
    }

    // Determine the drop position relative to the target element
    const overNode = over?.rect ? document.elementFromPoint(over.rect.left, over.rect.top) : null;
    const overRect = overNode?.getBoundingClientRect();

    if (!overRect) {
      setDropIndicator(null);
      return;
    }

    const relativeY = event.activatorEvent.clientY - overRect.top;
    const midpoint = overRect.height / 2;

    let placement: 'before' | 'after' = relativeY < midpoint ? 'before' : 'after';
    
    // For now, we are disabling reparenting logic to focus on reordering.
    // We can re-introduce a rule for it later if needed.

    setDropIndicator({ activeId: active.id as string, overId, placement });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (dropIndicator) {
      const { activeId, overId, placement } = dropIndicator;
      
      // Perform optimistic update on the local state
      const activeIndex = flattenedTree.findIndex(t => t.id === activeId);
      const overIndex = flattenedTree.findIndex(t => t.id === overId);
      
      if (activeIndex !== -1 && overIndex !== -1) {
        const newTree = arrayMove(flattenedTree, activeIndex, overIndex);
        // Note: This optimistic update is visual only and does not reconstruct the tree.
        // The final state will come from the server.
      }
      
      onReorder(activeId, overId, placement);
    }

    setDropIndicator(null); // Clear indicator on drop
  };

  const handleDragCancel = () => {
    setDropIndicator(null);
  };

  const handleToggleCollapse = (tagId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  };
  
  return (
    <DndContext 
      sensors={sensors} 
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        {flattenedTree.map(tag => (
          <SortableTag key={tag.id} tag={tag} dropIndicator={dropIndicator}>
            <TagAdminRow
              tag={tag}
              depth={tag.depth}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
              onCreateTag={onCreateTag}
              isCollapsed={collapsedNodes.has(tag.id)}
              onToggleCollapse={handleToggleCollapse}
            />
          </SortableTag>
        ))}
      </SortableContext>
    </DndContext>
  );
}
