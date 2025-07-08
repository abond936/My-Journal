'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Tag } from '@/lib/types/tag';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, UniqueIdentifier, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/app/admin/tag-admin/tag-admin.module.css';

/**
 * A wrapper component that makes its children draggable and provides visual feedback.
 */
function SortableTag({ 
  tag, 
  children, 
  dragState 
}: { 
  tag: Tag & { depth: number }; 
  children: React.ReactNode;
  dragState: {
    activeId: string | null;
    overId: string | null;
    isValidDrop: boolean;
    dropIndicator: 'before' | 'after' | null;
    isReparenting: boolean;
    reparentTarget: string | null;
  };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.docId! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${tag.depth * 12}px`,
  };
  
  // Check if this is an artificial dimension label
  const isDimensionLabel = tag.docId?.startsWith('dim-');
  
  // Hide dimension labels completely (including drag handles)
  if (isDimensionLabel) {
    return null;
  }
  
  // Determine if this tag is a valid drop zone and show appropriate indicators
  const isOverTag = dragState.overId === tag.docId;
  const isValidDrop = isOverTag && dragState.isValidDrop;
  const dropIndicator = isOverTag && dragState.isValidDrop && !dragState.isReparenting ? dragState.dropIndicator : null;
  const isReparentTarget = isOverTag && dragState.isReparenting;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={styles.rowWrapper} 
      data-is-dragging={isDragging}
      data-valid-drop={isOverTag ? isValidDrop : undefined}
      data-drop-indicator={dropIndicator}
      data-reparent-target={isReparentTarget}
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
  const [dragState, setDragState] = useState<{
    activeId: string | null;
    overId: string | null;
    isValidDrop: boolean;
    dropIndicator: 'before' | 'after' | null;
    isReparenting: boolean;
    reparentTarget: string | null;
  }>({
    activeId: null,
    overId: null,
    isValidDrop: false,
    dropIndicator: null,
    isReparenting: false,
    reparentTarget: null,
  });

  // Add visual indicator for reparenting mode
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Listen for Shift key changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    console.log('🔍 DragStart - active object:', active);
    console.log('🔍 DragStart - active.id:', active.id);
    console.log('🔍 DragStart - active.docId:', (active as any).docId);
    setDragState(prev => ({
      ...prev,
      activeId: active.id as string,
    }));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    console.log('🔍 DragOver - active:', active);
    console.log('🔍 DragOver - over:', over);
    console.log('🔍 DragOver - active.id:', active.id);
    console.log('🔍 DragOver - over.id:', over?.id);
    
    if (!over) {
      setDragState(prev => ({
        ...prev,
        overId: null,
        isValidDrop: false,
        dropIndicator: null,
        isReparenting: false,
        reparentTarget: null,
      }));
      return;
    }

    const activeTag = tagMap.get(active.id as string);
    const overTag = tagMap.get(over.id as string);

    if (!activeTag || !overTag) {
      setDragState(prev => ({
        ...prev,
        overId: null,
        isValidDrop: false,
        dropIndicator: null,
        isReparenting: false,
        reparentTarget: null,
      }));
      return;
    }

    // Check if Shift key is pressed for reparenting mode
    const isShiftPressed = event.activatorEvent?.shiftKey || false;
    
    // Check if this is a valid drop (same parent for reordering)
    const isSameParent = activeTag.parentId === overTag.parentId;
    const isReparenting = isShiftPressed && activeTag.docId !== overTag.docId;
    
    // DEBUG: Log parent detection details
    console.log('🔍 Parent Detection Debug:', {
      activeTagId: activeTag.docId,
      activeTagParentId: activeTag.parentId,
      overTagId: overTag.docId,
      overTagParentId: overTag.parentId,
      isSameParent,
      isReparenting,
      isShiftPressed,
      activeTagName: activeTag.name,
      overTagName: overTag.name
    });
    
    // Determine drop indicator position for reordering
    const activeIndex = flattenedTree.findIndex(t => t.docId === active.id);
    const overIndex = flattenedTree.findIndex(t => t.docId === over.id);
    const dropIndicator = activeIndex > overIndex ? 'before' : 'after';

    setDragState({
      activeId: active.id as string,
      overId: over.id as string,
      isValidDrop: isSameParent || isReparenting,
      dropIndicator: isSameParent ? dropIndicator : null,
      isReparenting,
      reparentTarget: isReparenting ? over.id as string : null,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🔍 DragEnd - active:', active);
    console.log('🔍 DragEnd - over:', over);
    console.log('🔍 DragEnd - active.id:', active.id);
    console.log('🔍 DragEnd - over.id:', over?.id);
    console.log('🔍 DragEnd - dragState:', dragState);
    
    if (!over) {
      // Reset drag state
      setDragState({
        activeId: null,
        overId: null,
        isValidDrop: false,
        dropIndicator: null,
        isReparenting: false,
        reparentTarget: null,
      });
      return;
    }

    const activeTag = tagMap.get(active.id as string);
    const overTag = tagMap.get(over.id as string);

    if (!activeTag || !overTag) {
      // Reset drag state
      setDragState({
        activeId: null,
        overId: null,
        isValidDrop: false,
        dropIndicator: null,
        isReparenting: false,
        reparentTarget: null,
      });
      return;
    }

    // Handle reparenting
    if (dragState.isReparenting && dragState.reparentTarget) {
      console.log('🔍 Calling onReparent with:', {
        activeId: active.id,
        overId: over.id
      });
      onReparent(active.id as string, over.id as string);
    }
    // Handle reordering (same parent)
    else if (activeTag.parentId === overTag.parentId) {
      const placement = dragState.dropIndicator;
      
      console.log('🔍 About to call onReorder with:', {
        activeId: active.id,
        overId: over.id,
        placement: placement
      });
      
      if (placement && active.id !== over.id) {
        onReorder(active.id as string, over.id as string, placement);
      }
    }

    // Reset drag state
    setDragState({
      activeId: null,
      overId: null,
      isValidDrop: false,
      dropIndicator: null,
      isReparenting: false,
      reparentTarget: null,
    });
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
    <div>
      {isShiftPressed && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#28a745',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🔄 Reparenting Mode Active (Release Shift to exit)
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
      >
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {flattenedTree.map(tag => (
            <SortableTag key={tag.docId} tag={tag} dragState={dragState}>
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
    </div>
  );
}
