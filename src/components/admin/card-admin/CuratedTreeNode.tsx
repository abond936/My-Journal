'use client';

import React from 'react';
import { useDraggable, useDndContext, useDroppable } from '@dnd-kit/core';
import type { Card } from '@/lib/types/card';
import { normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { useCuratedTreeDropHighlight } from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import styles from '@/app/admin/collections/page.module.css';
import {
  buildStudioCollectionCardDragData,
  isStudioCollectionCardDragData,
  parseCollectionCardDragId,
} from '@/lib/dnd/studioDragContract';

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

function TreeExpandControl({
  expanded,
  childCount,
  onToggle,
}: {
  expanded: boolean;
  childCount: number;
  onToggle: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.treeExpandButton}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse children' : 'Expand children'}
        title={expanded ? 'Collapse children' : 'Expand children'}
      >
        <span className={styles.treeExpandIcon}>{expanded ? '▼' : '▶'}</span>
      </button>
      <span
        className={styles.treePersistedMarker}
        title={expanded ? 'Saved as expanded' : 'Saved as collapsed'}
        aria-hidden="true"
      >
        {expanded ? '⊟' : '⊞'}
      </span>
      <span className={styles.treeChildCountBadge} title={`${childCount} child${childCount === 1 ? '' : 'ren'}`}>
        {childCount}
      </span>
    </>
  );
}

function DraggableCard({
  card,
  className,
  children,
  disabled,
  onClick,
  sourceParentId,
  sourceIsRoot,
}: {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  sourceParentId?: string;
  sourceIsRoot?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: buildStudioCollectionCardDragData(card.docId, { sourceParentId, sourceIsRoot }),
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
      <div className={styles.nodeDragContent}>{children}</div>
    </div>
  );
}

function InsertBeforeDropZone({ beforeCardId }: { beforeCardId: string }) {
  const { active, over } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);
  const draggedCardId = isStudioCollectionCardDragData(active?.data.current)
    ? active.data.current.cardId
    : parseCollectionCardDragId(activeStr);
  const highlightId = useCuratedTreeDropHighlight();
  const insertId = `insertBefore:${beforeCardId}`;
  const parentDropId = `parent:${beforeCardId}`;
  const overStr = over?.id != null ? String(over.id) : '';
  const nestOnThisRow = highlightId === parentDropId || overStr === parentDropId;
  const { setNodeRef } = useDroppable({
    id: insertId,
    disabled: !reparentFromCard,
  });
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
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);
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
  sourceParentId?: string;
  seen: Set<string>;
  cardById: Map<string, Card>;
  parentByChild: Map<string, string[]>;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  saving: boolean;
  onDetachChild: (id: string, parentId: string) => void;
  onClearRoot: (id: string) => void;
  onSelectCard: (id: string) => void;
  selectedCardId: string | null;
  disableCuratedDrag?: boolean;
}

function CuratedTreeNodeComponent({
  node,
  sourceParentId,
  seen,
  cardById,
  parentByChild,
  expandedIds,
  toggleExpanded,
  saving,
  onDetachChild,
  onClearRoot,
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

  const childIds = normalizeCuratedChildIds(node.childrenIds);
  const childEntries = childIds.map((id) => ({
    id,
    card: cardById.get(id) ?? null,
  }));
  const hasChildren = childIds.length > 0;
  const isExpanded = expandedIds.has(node.docId);
  const showDraftRootBadge = !sourceParentId && node.isCollectionRoot === true && node.status === 'draft';

  const titleClassName = [styles.nodeTitleDropZone].join(' ').trim();
  const expandControl = hasChildren ? (
    <TreeExpandControl
      expanded={isExpanded}
      childCount={childIds.length}
      onToggle={() => toggleExpanded(node.docId)}
    />
  ) : null;

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
              {expandControl}
              <div className={titleClassName}>
                <StaticTreeRowCard
                  className={styles.nodeDragSurface}
                  disabled={saving}
                  onClick={() => onSelectCard(node.docId)}
                >
                  <span className={styles.nodeTitleWrap}>
                    <span className={styles.nodeTitle}>{cardLabel(node)}</span>
                    {showDraftRootBadge ? <span className={styles.nodeDraftBadge}>Draft</span> : null}
                  </span>
                </StaticTreeRowCard>
              </div>
            </>
          ) : (
            <>
              {expandControl}
              <DraggableCard
                card={node}
                className={styles.nodeDragSurface}
                disabled={saving}
                onClick={() => onSelectCard(node.docId)}
                sourceParentId={sourceParentId}
                sourceIsRoot={!sourceParentId && node.isCollectionRoot === true}
              >
                <ParentDropZone parentId={node.docId!} className={titleClassName}>
                  <span className={styles.nodeTitleWrap}>
                    <span className={styles.nodeTitle}>{cardLabel(node)}</span>
                    {showDraftRootBadge ? <span className={styles.nodeDraftBadge}>Draft</span> : null}
                  </span>
                </ParentDropZone>
              </DraggableCard>
            </>
          )}
        </div>
        <div className={styles.nodeActions}>
          {sourceParentId || node.isCollectionRoot === true ? (
            <button
              type="button"
              onClick={() =>
                sourceParentId ? void onDetachChild(node.docId, sourceParentId) : void onClearRoot(node.docId)
              }
              disabled={saving}
              className={styles.smallButton}
              aria-label={sourceParentId ? 'Remove from this parent' : 'Remove root status'}
              title={sourceParentId ? 'Remove from this parent' : 'Remove root status'}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <ul className={styles.treeList}>
          {childEntries.map(({ id, card }) =>
            card ? (
              <CuratedTreeNode
                key={card.docId}
                node={card}
                sourceParentId={node.docId}
                seen={nextSeen}
                cardById={cardById}
                parentByChild={parentByChild}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
                saving={saving}
                onDetachChild={onDetachChild}
                onClearRoot={onClearRoot}
                onSelectCard={onSelectCard}
                selectedCardId={selectedCardId}
                disableCuratedDrag={disableCuratedDrag}
              />
            ) : (
              <li key={`${node.docId}-missing-${id}`} className={styles.treeNode}>
                <div className={styles.treeMissingChildRow}>
                  Missing child card
                </div>
              </li>
            )
          )}
        </ul>
      ) : null}
    </li>
  );
}

export const CuratedTreeNode = CuratedTreeNodeComponent;
