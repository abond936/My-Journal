'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Tag } from '@/lib/types/tag';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

type TagCounts = { [tagId: string]: { entries: number, albums: number } };

interface TagAdminListProps {
  tags: TagWithChildren[]; // The component now expects the pre-built tree
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => Promise<Tag | undefined>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateTag: (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag | undefined>;
  onReorder: (activeId: string, overId: string | null) => void;
  onReparent: (activeId: string, overId: string | null) => void;
}

export function TagAdminList({ tags: tagTree, onUpdateTag, onDeleteTag, onCreateTag, onReorder, onReparent }: TagAdminListProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Flatten the tree for DND kit, but only the visible nodes
  const flattenedTree = useMemo(() => {
    const flattened: TagWithChildren[] = [];
    const traverse = (nodes: TagWithChildren[]) => {
      for (const node of nodes) {
        flattened.push(node);
        if (!collapsedNodes.has(node.id)) {
          traverse(node.children);
        }
      }
    }
    traverse(tagTree);
    return flattened;
  }, [tagTree, collapsedNodes]);

  const sortedIds = useMemo(() => flattenedTree.map(tag => tag.id), [flattenedTree]);
  
  // Default to all nodes with children being collapsed
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
    findParents(tagTree);
    setCollapsedNodes(initialCollapsed);
  }, [tagTree]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const deltaX = event.delta.x;
    
    // Simple heuristic: if dragged significantly to the right, consider it a reparenting action.
    if (deltaX > 50) {
      onReparent(active.id as string, over.id as string);
    } else {
      onReorder(active.id as string, over.id as string);
    }
  };

  const handleToggleCollapse = (tagId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const renderNode = (node: TagWithChildren) => {
    const isCollapsed = collapsedNodes.has(node.id);
    return (
      <div key={node.id}>
        <TagAdminRow
          tag={node}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
          onCreateTag={onCreateTag}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        {!isCollapsed && node.children.length > 0 && (
           <div style={{ paddingLeft: '20px' }}>
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        {tagTree.map(node => renderNode(node))}
      </SortableContext>
    </DndContext>
  );
}
