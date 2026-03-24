'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Tag } from '@/lib/types/tag';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import { TagAdminRow } from './TagAdminRow';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/app/admin/tag-admin/tag-admin.module.css';

function flattenDimensionTree(
  roots: TagWithChildren[] | undefined,
  collapsedNodes: Set<string>,
  depth: number
): (TagWithChildren & { depth: number })[] {
  const out: (TagWithChildren & { depth: number })[] = [];
  if (!roots?.length) return out;
  for (const node of roots) {
    out.push({ ...node, depth });
    if (!collapsedNodes.has(node.docId!) && node.children?.length) {
      out.push(...flattenDimensionTree(node.children, collapsedNodes, depth + 1));
    }
  }
  return out;
}

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
  tagTree: TagWithChildren[];
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

  const columns = useMemo(
    () =>
      tagTree.map(dim => ({
        id: dim.docId!,
        title: dim.name,
        rows: flattenDimensionTree(dim.children, collapsedNodes, 0),
      })),
    [tagTree, collapsedNodes]
  );

  const flattenedTree = useMemo(() => columns.flatMap(col => col.rows), [columns]);

  const sortedIds = useMemo(() => flattenedTree.map(tag => tag.docId!), [flattenedTree]);
  const tagMap = useMemo(() => new Map(flattenedTree.map(tag => [tag.docId!, tag])), [flattenedTree]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setDragState(prev => ({
      ...prev,
      activeId: active.id as string,
    }));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
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

    // Reparenting: Shift held on pointer *or* tracked from keyboard (activator alone misses Shift-after-mousedown)
    const ae = event.activatorEvent;
    const shiftFromActivator = Boolean(
      ae && 'shiftKey' in ae && (ae as MouseEvent | KeyboardEvent).shiftKey
    );
    const reparentMode = isShiftPressed || shiftFromActivator;

    const sameParentId = (activeTag.parentId || '') === (overTag.parentId || '');
    const sameRootDimension =
      !activeTag.parentId &&
      !overTag.parentId &&
      (activeTag.dimension || '') === (overTag.dimension || '');
    const isSameParent = sameParentId && (activeTag.parentId ? true : sameRootDimension);
    const isReparenting = reparentMode && activeTag.docId !== overTag.docId;
    
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
      onReparent(active.id as string, over.id as string);
    }
    // Handle reordering (same parent)
    else if (
      (activeTag.parentId || '') === (overTag.parentId || '') &&
      (activeTag.parentId || (activeTag.dimension || '') === (overTag.dimension || ''))
    ) {
      const placement = dragState.dropIndicator;
      
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
          <div className={styles.dimensionGrid}>
            {columns.map(col => (
              <section key={col.id} className={styles.dimensionColumn}>
                <h2 className={styles.dimensionColumnHeading}>{col.title}</h2>
                <div className={styles.dimensionColumnScroll}>
                  {col.rows.length === 0 ? (
                    <p className={styles.dimensionColumnEmpty}>No tags yet</p>
                  ) : (
                    col.rows.map(tag => (
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
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
