'use client';

import React from 'react';
import { useDraggable, useDndContext, useDroppable } from '@dnd-kit/core';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { useCuratedTreeDropHighlight } from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import styles from '@/app/admin/collections/page.module.css';

function StaticTreeRowCard({
  className,
  children,
  disabled,
  onClick,
}: {
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
}

function ReadOnlyInsertBeforeGap() {
  return (
    <div className={styles.treeInsertBeforeWrap} aria-hidden>
      <div className={styles.treeInsertBeforeZone} />
    </div>
  );
}

function DraggableCard({
  card,
  className,
  children,
  disabled,
  onClick,
  betweenHandleAndTitle,
}: {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  /** Expand/collapse etc. — rendered after the drag handle, before the title block. */
  betweenHandleAndTitle?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: { cardId: card.docId },
  });

  const style = {
    transform: undefined as string | undefined,
    opacity: isDragging ? 0 : 1,
    cursor: disabled ? 'not-allowed' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} onClick={onClick}>
      <button
        type="button"
        className={styles.treeDragHandle}
        aria-label="Drag to move card in curated tree"
        title="Drag to move"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      {betweenHandleAndTitle}
      <div className={styles.nodeDragContent}>{children}</div>
    </div>
  );
}

function InsertBeforeDropZone({ beforeCardId }: { beforeCardId: string }) {
  const { active, over } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const draggedCardId = activeStr.startsWith('card:') ? activeStr.slice(5) : null;
  const highlightId = useCuratedTreeDropHighlight();
  const insertId = `insertBefore:${beforeCardId}`;
  const parentDropId = `parent:${beforeCardId}`;
  const overStr = over?.id != null ? String(over.id) : '';
  /** Same card: nest-on-title vs insert-before-sibling — hide the insert bar when nesting on this row. */
  const nestOnThisRow = highlightId === parentDropId || overStr === parentDropId;
  const { setNodeRef } = useDroppable({
    id: insertId,
    disabled: !reparentFromCard,
  });
  /** Match DnD `over` only (via context). Per-droppable `isOver` can stay true on the source row while `over` is `parent:*` elsewhere, which left the insertion line stuck on the row being dragged. */
  const showLine =
    !nestOnThisRow && beforeCardId !== draggedCardId && highlightId === insertId;
  return (
    <div className={styles.treeInsertBeforeWrap}>
      <div
        ref={setNodeRef}
        className={`${styles.treeInsertBeforeZone} ${showLine ? styles.treeInsertBeforeZoneActive : ''}`}
        title="Drop here to insert before this row (sibling order). Easiest: aim for the gap above this card. Title = nest as last child."
        aria-label="Insert before this row"
      />
    </div>
  );
}

function ParentDropZone({
  parentId,
  className,
  children,
}: {
  parentId: string;
  className: string;
  children: React.ReactNode;
}) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const highlightId = useCuratedTreeDropHighlight();
  const parentDropId = `parent:${parentId}`;
  const { setNodeRef } = useDroppable({
    id: parentDropId,
    disabled: !reparentFromCard,
  });
  const nestActive = highlightId === parentDropId;
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${nestActive ? `${styles.dropTargetActive} ${styles.nodeTitleDropZoneNestActive}` : ''}`}
    >
      {children}
    </div>
  );
}

function cardLabel(card: Card): string {
  return card.title || card.subtitle || 'Untitled';
}

export interface CuratedTreeNodeProps {
  node: Card;
  seen: Set<string>;
  cardById: Map<string, Card>;
  parentByChild: Map<string, string[]>;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  saving: boolean;
  onDetachChild: (id: string, parentId: string) => void;
  onOpenBulkAdd: (parentId: string) => void;
  onSelectCard: (id: string) => void;
  selectedCardId: string | null;
  /** When true, tree rows are not draggable and insert/parent drop targets are not registered. */
  disableCuratedDrag?: boolean;
}

export function CuratedTreeNode({
  node,
  seen,
  cardById,
  parentByChild,
  expandedIds,
  toggleExpanded,
  saving,
  onDetachChild,
  onOpenBulkAdd,
  onSelectCard,
  selectedCardId,
  disableCuratedDrag = false,
}: CuratedTreeNodeProps) {
  const isCycle = seen.has(node.docId);

  if (isCycle) {
    return (
      <li key={`${node.docId}-cycle`} className={styles.treeNode}>
        <div className={styles.nodeRow}>
          <span className={styles.nodeTitle}>Cycle detected</span>
        </div>
      </li>
    );
  }

  const nextSeen = new Set(seen);
  nextSeen.add(node.docId);

  const children = normalizeCuratedChildIds(node.childrenIds)
    .map((id) => cardById.get(id))
    .filter((c): c is Card => Boolean(c));
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.docId);

  const titleClassName = [
    styles.nodeTitleDropZone,
  ]
    .join(' ')
    .trim();

  return (
    <li className={styles.treeNode}>
      {node.docId ? (
        disableCuratedDrag ? (
          <ReadOnlyInsertBeforeGap />
        ) : (
          <InsertBeforeDropZone beforeCardId={node.docId} />
        )
      ) : null}
      <div className={`${styles.nodeRow} ${selectedCardId === node.docId ? styles.nodeRowSelected : ''}`}>
        <div className={styles.nodeLead}>
          {disableCuratedDrag ? (
            <>
              {hasChildren ? (
                <>
                  <button
                    type="button"
                    className={styles.treeExpandButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(node.docId);
                    }}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <span className={styles.treeExpandIcon}>{isExpanded ? '▼' : '►'}</span>
                  </button>
                  <span
                    className={styles.treePersistedMarker}
                    title={isExpanded ? 'Saved as expanded' : 'Saved as collapsed'}
                    aria-hidden="true"
                  >
                    {isExpanded ? '⊟' : '⊞'}
                  </span>
                </>
              ) : null}
              <div className={titleClassName}>
                <StaticTreeRowCard
                  className={styles.nodeDragSurface}
                  disabled={saving}
                  onClick={() => onSelectCard(node.docId)}
                >
                  <span className={styles.nodeTitle}>{cardLabel(node)}</span>
                </StaticTreeRowCard>
              </div>
            </>
          ) : (
            <DraggableCard
              card={node}
              className={styles.nodeDragSurface}
              disabled={saving}
              onClick={() => onSelectCard(node.docId)}
              betweenHandleAndTitle={
                hasChildren ? (
                  <>
                    <button
                      type="button"
                      className={styles.treeExpandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(node.docId);
                      }}
                      aria-expanded={isExpanded}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <span className={styles.treeExpandIcon}>{isExpanded ? '▼' : '►'}</span>
                    </button>
                    <span
                      className={styles.treePersistedMarker}
                      title={isExpanded ? 'Saved as expanded' : 'Saved as collapsed'}
                      aria-hidden="true"
                    >
                      {isExpanded ? '⊟' : '⊞'}
                    </span>
                  </>
                ) : null
              }
            >
              <ParentDropZone parentId={node.docId!} className={titleClassName}>
                <span className={styles.nodeTitle}>{cardLabel(node)}</span>
              </ParentDropZone>
            </DraggableCard>
          )}
        </div>
        <div className={styles.nodeActions}>
          <button
            type="button"
            onClick={() => onOpenBulkAdd(node.docId)}
            disabled={saving}
            className={styles.smallButton}
          >
            Bulk add
          </button>
          {(parentByChild.get(node.docId)?.length ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => void onDetachChild(node.docId, parentByChild.get(node.docId)![0])}
              disabled={saving}
              className={styles.smallButton}
            >
              Unparent
            </button>
          ) : null}
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <ul className={styles.treeList}>
          {children.map((child) => (
            <CuratedTreeNode
              key={child.docId}
              node={child}
              seen={nextSeen}
              cardById={cardById}
              parentByChild={parentByChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              saving={saving}
              onDetachChild={onDetachChild}
              onOpenBulkAdd={onOpenBulkAdd}
              onSelectCard={onSelectCard}
              selectedCardId={selectedCardId}
              disableCuratedDrag={disableCuratedDrag}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
