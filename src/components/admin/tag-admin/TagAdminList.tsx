'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Tag } from '@/lib/types/tag';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import { TagAdminRow } from './TagAdminRow';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  type Collision,
  type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import styles from '@/app/admin/tag-admin/tag-admin.module.css';

type TagRow = TagWithChildren & { depth: number };

function flattenDimensionTree(
  roots: TagWithChildren[] | undefined,
  collapsedNodes: Set<string>,
  depth: number
): TagRow[] {
  const out: TagRow[] = [];
  if (!roots?.length) return out;
  for (const node of roots) {
    out.push({ ...node, depth });
    if (!collapsedNodes.has(node.docId!) && node.children?.length) {
      out.push(...flattenDimensionTree(node.children, collapsedNodes, depth + 1));
    }
  }
  return out;
}

/** Drop semantics for one column’s visual row order (scroll + tree flattened). */
function computeTagAdminDropSemantics(
  activeId: string,
  overId: string,
  activatorEvent: Event | null | undefined,
  isShiftPressed: boolean,
  tagMap: Map<string, TagRow>,
  columnRows: TagRow[]
) {
  const activeTag = tagMap.get(activeId);
  const overTag = tagMap.get(overId);
  if (!activeTag || !overTag) {
    return {
      isReparenting: false,
      isSameParent: false,
      dropIndicator: null as 'before' | 'after' | null,
      isValidDrop: false,
    };
  }

  const ae = activatorEvent;
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

  const activeIndex = columnRows.findIndex((t) => t.docId === activeId);
  const overIndex = columnRows.findIndex((t) => t.docId === overId);
  const dropIndicator: 'before' | 'after' | null =
    activeIndex >= 0 && overIndex >= 0
      ? activeIndex > overIndex
        ? 'before'
        : 'after'
      : null;

  const isValidDrop = isSameParent || isReparenting;
  return { isReparenting, isSameParent, dropIndicator, isValidDrop };
}

/** When several rows match, prefer the one whose center is nearest the pointer (depth tie-break was wrong for reparent). */
function pickClosestCollision(
  args: Parameters<CollisionDetection>[0],
  raw: Collision[]
): Collision[] {
  const { active, pointerCoordinates, droppableRects } = args;
  const filtered = raw.filter((c) => c.id !== active.id);
  if (filtered.length <= 1) return filtered;
  if (!pointerCoordinates) return [filtered[0]!];
  let best = filtered[0]!;
  let bestD = Infinity;
  for (const c of filtered) {
    const rect = droppableRects.get(c.id);
    if (!rect) continue;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d = (pointerCoordinates.x - cx) ** 2 + (pointerCoordinates.y - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return [best];
}

function makeColumnCollisionDetection(): CollisionDetection {
  return (args) => {
    let hits = pickClosestCollision(args, pointerWithin(args));
    if (hits.length > 0) return hits;
    hits = pickClosestCollision(args, rectIntersection(args));
    if (hits.length > 0) return hits;
    return closestCenter(args);
  };
}

/**
 * A wrapper component that makes its children draggable and provides visual feedback.
 */
function SortableTag({
  tag,
  children,
  dragState,
}: {
  tag: TagRow;
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

  const isDimensionLabel = tag.docId?.startsWith('dim-');

  if (isDimensionLabel) {
    return null;
  }

  const isOverTag = dragState.overId === tag.docId;
  const dropIndicator = isOverTag && dragState.isValidDrop && !dragState.isReparenting ? dragState.dropIndicator : null;
  const isReparentTarget = isOverTag && dragState.isReparenting;
  const showReorderHighlight = isOverTag && dragState.isValidDrop && !dragState.isReparenting;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.rowWrapper}
      data-is-dragging={isDragging}
      data-valid-drop={showReorderHighlight ? 'true' : undefined}
      data-drop-indicator={dropIndicator}
      data-reparent-target={isReparentTarget ? 'true' : undefined}
    >
      <span {...attributes} {...listeners} className={styles.dragHandle}>
        &#x2630;
      </span>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
}

/** Used by `/admin/tag-admin` (default layout) and Studio (optional `stackDimensionColumns`). */
interface TagAdminListProps {
  tagTree: TagWithChildren[];
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'docId'>>) => Promise<Tag | undefined>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateTag: (tagData: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt'>) => Promise<Tag | undefined>;
  onReorder: (activeId: string, overId: string, placement: 'before' | 'after') => void;
  onReparent: (activeId: string, overId: string) => void;
  /** When true, each dimension stays in its own full-width row (e.g. resizable Studio tags pane). */
  stackDimensionColumns?: boolean;
}

interface DimensionColumn {
  id: string;
  title: string;
  rows: TagRow[];
}

function TagAdminDimensionColumn({
  col,
  tagMap,
  isShiftPressed,
  dragState,
  setDragState,
  sensors,
  collisionDetection,
  onReorder,
  onReparent,
  collapsedNodes,
  onToggleCollapse,
  onUpdateTag,
  onDeleteTag,
  onCreateTag,
}: {
  col: DimensionColumn;
  tagMap: Map<string, TagRow>;
  isShiftPressed: boolean;
  dragState: {
    activeId: string | null;
    overId: string | null;
    isValidDrop: boolean;
    dropIndicator: 'before' | 'after' | null;
    isReparenting: boolean;
    reparentTarget: string | null;
  };
  setDragState: React.Dispatch<
    React.SetStateAction<{
      activeId: string | null;
      overId: string | null;
      isValidDrop: boolean;
      dropIndicator: 'before' | 'after' | null;
      isReparenting: boolean;
      reparentTarget: string | null;
    }>
  >;
  sensors: ReturnType<typeof useDefaultDndSensors>;
  collisionDetection: CollisionDetection;
  onReorder: TagAdminListProps['onReorder'];
  onReparent: TagAdminListProps['onReparent'];
  collapsedNodes: Set<string>;
  onToggleCollapse: (tagId: string) => void;
  onUpdateTag: TagAdminListProps['onUpdateTag'];
  onDeleteTag: TagAdminListProps['onDeleteTag'];
  onCreateTag: TagAdminListProps['onCreateTag'];
}) {
  const columnRows = col.rows;
  const sortedIds = useMemo(() => columnRows.map((r) => r.docId!), [columnRows]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setDragState((prev) => ({
        ...prev,
        activeId: active.id as string,
      }));
    },
    [setDragState]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) {
        setDragState((prev) => ({
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
        setDragState((prev) => ({
          ...prev,
          overId: null,
          isValidDrop: false,
          dropIndicator: null,
          isReparenting: false,
          reparentTarget: null,
        }));
        return;
      }

      const { isReparenting, isSameParent, dropIndicator, isValidDrop } = computeTagAdminDropSemantics(
        active.id as string,
        over.id as string,
        event.activatorEvent,
        isShiftPressed,
        tagMap,
        columnRows
      );

      setDragState({
        activeId: active.id as string,
        overId: over.id as string,
        isValidDrop,
        dropIndicator: isSameParent ? dropIndicator : null,
        isReparenting,
        reparentTarget: isReparenting ? (over.id as string) : null,
      });
    },
    [columnRows, isShiftPressed, setDragState, tagMap]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
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

      const { isReparenting, isSameParent, dropIndicator: placement } = computeTagAdminDropSemantics(
        active.id as string,
        over.id as string,
        event.activatorEvent,
        isShiftPressed,
        tagMap,
        columnRows
      );

      if (isReparenting) {
        onReparent(active.id as string, over.id as string);
      } else if (isSameParent && placement && active.id !== over.id) {
        onReorder(active.id as string, over.id as string, placement);
      }

      setDragState({
        activeId: null,
        overId: null,
        isValidDrop: false,
        dropIndicator: null,
        isReparenting: false,
        reparentTarget: null,
      });
    },
    [columnRows, isShiftPressed, onReparent, onReorder, setDragState, tagMap]
  );

  return (
    <section className={styles.dimensionColumn}>
      <h2 className={styles.dimensionColumnHeading}>{col.title}</h2>
      <div className={styles.dimensionColumnDndRoot}>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
        >
          <div className={styles.dimensionColumnScroll}>
          {columnRows.length === 0 ? (
            <p className={styles.dimensionColumnEmpty}>No tags yet</p>
          ) : (
            <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
              {columnRows.map((tag) => (
                <SortableTag key={tag.docId} tag={tag} dragState={dragState}>
                  <TagAdminRow
                    tag={tag}
                    depth={tag.depth}
                    onUpdateTag={onUpdateTag}
                    onDeleteTag={onDeleteTag}
                    onCreateTag={onCreateTag}
                    isCollapsed={collapsedNodes.has(tag.docId!)}
                    onToggleCollapse={onToggleCollapse}
                  />
                </SortableTag>
              ))}
            </SortableContext>
          )}
          </div>
        </DndContext>
      </div>
    </section>
  );
}

export function TagAdminList({
  tagTree,
  onUpdateTag,
  onDeleteTag,
  onCreateTag,
  onReorder,
  onReparent,
  stackDimensionColumns = false,
}: TagAdminListProps) {
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

  const [isShiftPressed, setIsShiftPressed] = useState(false);

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
      tagTree.map((dim) => ({
        id: dim.docId!,
        title: dim.name,
        rows: flattenDimensionTree(dim.children, collapsedNodes, 0),
      })),
    [tagTree, collapsedNodes]
  );

  const flattenedTree = useMemo(() => columns.flatMap((col) => col.rows), [columns]);
  const tagMap = useMemo(() => new Map(flattenedTree.map((tag) => [tag.docId!, tag])), [flattenedTree]);

  const columnCollisionDetection = useMemo(() => makeColumnCollisionDetection(), []);

  const sensors = useDefaultDndSensors();

  const handleToggleCollapse = useCallback((tagId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  return (
    <div>
      {isShiftPressed && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: '#28a745',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          🔄 Reparenting Mode Active (Release Shift to exit)
        </div>
      )}
      <div
        className={
          stackDimensionColumns
            ? `${styles.dimensionGrid} ${styles.dimensionGridSingleColumn}`
            : styles.dimensionGrid
        }
      >
        {columns.map((col) => (
          <TagAdminDimensionColumn
            key={col.id}
            col={col}
            tagMap={tagMap}
            isShiftPressed={isShiftPressed}
            dragState={dragState}
            setDragState={setDragState}
            sensors={sensors}
            collisionDetection={columnCollisionDetection}
            onReorder={onReorder}
            onReparent={onReparent}
            collapsedNodes={collapsedNodes}
            onToggleCollapse={handleToggleCollapse}
            onUpdateTag={onUpdateTag}
            onDeleteTag={onDeleteTag}
            onCreateTag={onCreateTag}
          />
        ))}
      </div>
    </div>
  );
}
