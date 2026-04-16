'use client';

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { useCuratedTreeDragKind } from '@/components/admin/card-admin/curatedTreeDragContext';
import styles from '@/app/admin/collections/page.module.css';

function DraggableCard({
  card,
  className,
  children,
  disabled,
}: {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: { cardId: card.docId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function InsertBeforeDropZone({ beforeCardId }: { beforeCardId: string }) {
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({
    id: `insertBefore:${beforeCardId}`,
    disabled: dragKind !== 'reparent',
  });
  return (
    <div className={styles.treeInsertBeforeWrap}>
      <div
        ref={setNodeRef}
        className={`${styles.treeInsertBeforeZone} ${isOver ? styles.treeInsertBeforeZoneActive : ''}`}
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
  const dragKind = useCuratedTreeDragKind();
  const { setNodeRef, isOver } = useDroppable({
    id: `parent:${parentId}`,
    disabled: dragKind !== 'reparent',
  });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? styles.dropTargetActive : ''}`}>
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
  parentByChild: Map<string, string>;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  saving: boolean;
  onDetachChild: (id: string) => void;
  onOpenBulkAdd: (parentId: string) => void;
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

  return (
    <li className={styles.treeNode}>
      {node.docId ? <InsertBeforeDropZone beforeCardId={node.docId} /> : null}
      <div className={styles.nodeRow}>
        <div className={styles.nodeLead}>
          {hasChildren ? (
            <>
              <button
                type="button"
                className={styles.treeExpandButton}
                onClick={() => toggleExpanded(node.docId)}
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
          <ParentDropZone parentId={node.docId!} className={styles.nodeTitleDropZone}>
            <DraggableCard
              card={node}
              className={styles.nodeDragSurface}
              disabled={saving}
            >
              <span className={styles.nodeTitle}>{cardLabel(node)}</span>
            </DraggableCard>
          </ParentDropZone>
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
          {parentByChild.has(node.docId) ? (
            <button
              type="button"
              onClick={() => void onDetachChild(node.docId)}
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
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
