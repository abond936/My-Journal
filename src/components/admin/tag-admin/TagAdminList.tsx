'use client';

import React, { useMemo, useState } from 'react';
import { Tag } from '@/lib/types/tag';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/app/admin/tag-admin/tag-admin.module.css';

/**
 * A wrapper component that makes its children draggable and provides visual feedback.
 */
function SortableTag({ tag, children }: { tag: Tag & { depth: number }; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.docId! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${tag.depth * 12}px`,
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={styles.rowWrapper} 
      data-is-dragging={isDragging}
    >
      <span {...attributes} {...listeners} className={styles.dragHandle}>
        &#x2630;
      </span>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
}

interface TagAdminListProps {
  tagTree: Tag[];
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'docId'>>) => Promise<Tag | undefined>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateTag: (tagData: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt'>) => Promise<Tag | undefined>;
  onReorder: (activeId: string, overId: string, placement: 'before' | 'after') => void;
  onReparent: (activeId: string, overId: string) => void;
}

export function TagAdminList({ tagTree, onUpdateTag, onDeleteTag, onCreateTag, onReorder, onReparent }: TagAdminListProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const flattenedTree = useMemo(() => {
    const flattened: (Tag & { depth: number, children?: Tag[] })[] = [];
    const traverse = (nodes: Tag[] | undefined, depth: number) => {
      if (!nodes) return;
      for (const node of nodes) {
        flattened.push({ ...node, depth });
        if (!collapsedNodes.has(node.docId!) && node.children) {
          traverse(node.children as Tag[], depth + 1);
        }
      }
    };
    traverse(tagTree, 0);
    return flattened;
  }, [tagTree, collapsedNodes]);

  const sortedIds = useMemo(() => flattenedTree.map(tag => tag.docId!), [flattenedTree]);
  const tagMap = useMemo(() => new Map(flattenedTree.map(tag => [tag.docId!, tag])), [flattenedTree]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTag = tagMap.get(active.docId as string);
    const overTag = tagMap.get(over.docId as string);

    // Only allow reordering between siblings
    if (activeTag?.parentId !== overTag?.parentId) return;

    // Get the indices to determine if we're moving before or after
    const activeIndex = flattenedTree.findIndex(t => t.docId === active.docId);
    const overIndex = flattenedTree.findIndex(t => t.docId === over.docId);
    
    // If moving up, place before; if moving down, place after
    const placement = activeIndex > overIndex ? 'before' : 'after';

    if (activeIndex !== -1 && overIndex !== -1) {
      onReorder(active.docId as string, over.docId as string, placement);
    }
  };

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
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        {flattenedTree.map(tag => (
          <SortableTag key={tag.docId} tag={tag}>
            <TagAdminRow
              tag={tag}
              depth={tag.depth}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
              onCreateTag={onCreateTag}
              isCollapsed={collapsedNodes.has(tag.docId!)}
              onToggleCollapse={handleToggleCollapse}
            />
          </SortableTag>
        ))}
      </SortableContext>
    </DndContext>
  );
}
