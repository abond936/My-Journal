'use client';

import React, { useMemo, useState } from 'react';
import { Tag } from '@/lib/types/tag';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/app/admin/tag-admin/tag-admin.module.css';

// Type for storing the state of the current drag operation for visual feedback
type DropIndicatorState = {
  overId: UniqueIdentifier;
  type: 'reorder-before' | 'reorder-after' | 'reparent';
} | null;

/**
 * A wrapper component that makes its children draggable and provides visual feedback.
 */
function SortableTag({ tag, dropIndicator, children }: { tag: Tag & { depth: number }; dropIndicator: DropIndicatorState; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${tag.depth * 24}px`,
  };

  const isOver = dropIndicator?.overId === tag.id;
  const showReparentIndicator = isOver && dropIndicator?.type === 'reparent';
  
  return (
    <div ref={setNodeRef} style={style} className={styles.rowWrapper} data-is-dragging={isDragging} data-reparent-target={showReparentIndicator}>
      {isOver && dropIndicator?.type === 'reorder-before' && <div className={`${styles.dropLine} ${styles.top}`} />}
      <span {...attributes} {...listeners} className={styles.dragHandle}>
        &#x2630;
      </span>
      <div style={{ flexGrow: 1 }}>{children}</div>
      {isOver && dropIndicator?.type === 'reorder-after' && <div className={`${styles.dropLine} ${styles.bottom}`} />}
    </div>
  );
}

interface TagAdminListProps {
  tags: Tag[];
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => Promise<Tag | undefined>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateTag: (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag | undefined>;
  onReorder: (activeId: string, overId: string, placement: 'before' | 'after') => void;
  onReparent: (activeId: string, overId: string) => void;
}

export function TagAdminList({ tags: initialTagTree, onUpdateTag, onDeleteTag, onCreateTag, onReorder, onReparent }: TagAdminListProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>(null);

  const flattenedTree = useMemo(() => {
    const flattened: (Tag & { depth: number, children?: Tag[] })[] = [];
    const traverse = (nodes: Tag[], depth: number) => {
      for (const node of nodes) {
        flattened.push({ ...node, depth });
        if (!collapsedNodes.has(node.id) && node.children) {
          traverse(node.children as Tag[], depth + 1);
        }
      }
    };
    traverse(initialTagTree, 0);
    return flattened;
  }, [initialTagTree, collapsedNodes]);

  const sortedIds = useMemo(() => flattenedTree.map(tag => tag.id), [flattenedTree]);
  const tagMap = useMemo(() => new Map(flattenedTree.map(tag => [tag.id, tag])), [flattenedTree]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropIndicator(null);
      return;
    }

    const overNodeRect = over.rect;
    // Use clientY to get position relative to viewport, which is more reliable with scrolling
    const clientY = 'clientY' in event.activatorEvent ? event.activatorEvent.clientY : 0;
    const dropPoint = clientY - overNodeRect.top;
    const dropZoneHeight = overNodeRect.height;
    
    // Define thresholds for reordering vs. reparenting
    const reorderThreshold = dropZoneHeight * 0.25;

    let type: DropIndicatorState['type'] = 'reparent';
    if (dropPoint < reorderThreshold) {
      type = 'reorder-before';
    } else if (dropPoint > dropZoneHeight - reorderThreshold) {
      type = 'reorder-after';
    }

    const activeTag = tagMap.get(active.id as string);
    const overTag = tagMap.get(over.id as string);

    // Prevent reordering with a non-sibling
    if (type !== 'reparent' && activeTag?.parentId !== overTag?.parentId) {
      setDropIndicator(null);
      return;
    }
    
    setDropIndicator({ overId: over.id, type });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (dropIndicator) {
      const { type, overId } = dropIndicator;
      const activeId = event.active.id as string;

      if (type === 'reparent') {
        onReparent(activeId, overId as string);
      } else {
        const placement = type === 'reorder-before' ? 'before' : 'after';
        onReorder(activeId, overId as string, placement);
      }
    }
    setDropIndicator(null);
  };

  const handleDragCancel = () => setDropIndicator(null);

  const handleToggleCollapse = (tagId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
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
