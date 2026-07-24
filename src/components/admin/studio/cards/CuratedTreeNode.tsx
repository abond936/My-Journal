'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDraggable, useDndContext, useDroppable } from '@dnd-kit/core';
import {
  Ellipsis,
  ExternalLink,
  ListPlus,
  Menu,
  Trash2,
  Unlink,
} from 'lucide-react';
import type { Card } from '@/lib/types/card';
import {
  buildCuratedInsertBeforeDropId,
  normalizeCuratedChildIds,
} from '@/lib/utils/curatedCollectionTree';
import { useCuratedTreeDropHighlight } from '@/components/admin/studio/cards/curatedTreeDropHighlightContext';
import styles from '@/app/admin/collections/page.module.css';
import {
  buildCollectionsCardDragData,
  parseCollectionsCardDragId,
} from '@/lib/dnd/collectionsDragContract';

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
  onToggle,
  dragHandle,
}: {
  expanded: boolean;
  onToggle: () => void;
  dragHandle: React.ReactNode;
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
      {dragHandle}
      <span
        className={styles.treePersistedMarker}
        title={expanded ? 'Saved as expanded' : 'Saved as collapsed'}
        aria-hidden="true"
      >
        {expanded ? '⊟' : '⊞'}
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
  expanded,
  hasChildren,
  onToggleExpanded,
  sourceParentId,
  sourceIsRoot,
}: {
  card: Card;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  expanded: boolean;
  hasChildren: boolean;
  onToggleExpanded: () => void;
  sourceParentId?: string;
  sourceIsRoot?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${card.docId}`,
    disabled,
    data: buildCollectionsCardDragData(card.docId, { sourceParentId, sourceIsRoot }),
  });

  const style = {
    transform: undefined as string | undefined,
    opacity: isDragging ? 0 : 1,
    cursor: disabled ? 'not-allowed' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? styles.dragSourceActive : ''}`}
      onClick={onClick}
    >
      {hasChildren ? (
        <TreeExpandControl
          expanded={expanded}
          onToggle={onToggleExpanded}
          dragHandle={
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
              <Menu size={15} aria-hidden="true" />
            </button>
          }
        />
      ) : (
        <>
          <span className={styles.treeExpandSpacer} aria-hidden="true" />
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
            <Menu size={15} aria-hidden="true" />
          </button>
          <span className={styles.treePersistedMarkerSpacer} aria-hidden="true" />
        </>
      )}
      <div className={styles.nodeDragContent}>{children}</div>
    </div>
  );
}

function InsertBeforeDropZone({
  beforeCardId,
  parentId,
}: {
  beforeCardId: string;
  parentId: string | null;
}) {
  const { active, over } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const draggedCardId = parseCollectionsCardDragId(activeStr);
  const highlightId = useCuratedTreeDropHighlight();
  const insertId = buildCuratedInsertBeforeDropId(beforeCardId, parentId);
  const parentDropId = `parent:${beforeCardId}`;
  const overStr = over?.id != null ? String(over.id) : '';
  const nestOnThisRow = highlightId === parentDropId || overStr === parentDropId;
  const { setNodeRef } = useDroppable({
    id: insertId,
    data: {
      domain: 'collections',
      dropKind: 'insert-before',
      parentId,
      beforeCardId,
    },
  });
  const showLine = !nestOnThisRow && beforeCardId !== draggedCardId && highlightId === insertId;
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
  const highlightId = useCuratedTreeDropHighlight();
  const parentDropId = `parent:${parentId}`;
  const { setNodeRef } = useDroppable({
    id: parentDropId,
    data: {
      domain: 'collections',
      dropKind: 'parent',
      parentCardId: parentId,
    },
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
  onAddChildren: (id: string) => void;
  onDeleteCard?: (card: Card) => void | Promise<void>;
  onSelectCard: (id: string) => void | Promise<boolean>;
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
  onAddChildren,
  onDeleteCard,
  onSelectCard,
  selectedCardId,
  disableCuratedDrag = false,
}: CuratedTreeNodeProps) {
  const isCycle = seen.has(node.docId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

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

  const expandControl = hasChildren ? (
    <TreeExpandControl
      expanded={isExpanded}
      onToggle={() => toggleExpanded(node.docId)}
      dragHandle={null}
    />
  ) : (
    <>
      <span className={styles.treeExpandSpacer} aria-hidden="true" />
      <span className={styles.treePersistedMarkerSpacer} aria-hidden="true" />
    </>
  );

  return (
    <li className={styles.treeNode}>
      {node.docId ? (
        disableCuratedDrag ? (
          <ReadOnlyInsertBeforeGap />
        ) : (
          <InsertBeforeDropZone beforeCardId={node.docId} parentId={sourceParentId ?? null} />
        )
      ) : null}
      <div
        className={`${styles.nodeRow} ${selectedCardId === node.docId ? styles.nodeRowSelected : ''}`}
        data-curated-tree-card-id={node.docId}
      >
        {disableCuratedDrag ? (
          <div className={styles.nodeLead}>
            <div className={styles.nodeParentDropZone}>
              {expandControl}
              <StaticTreeRowCard
                className={styles.nodeDragSurface}
                disabled={saving}
                onClick={() => onSelectCard(node.docId)}
              >
                <span className={styles.nodeTitleWrap}>
                  <span className={styles.nodeTitle}>{cardLabel(node)}</span>
                  {hasChildren ? (
                    <span
                      className={styles.nodeCountInline}
                      title={`${childIds.length} child${childIds.length === 1 ? '' : 'ren'}`}
                    >
                      ({childIds.length})
                    </span>
                  ) : null}
                  {showDraftRootBadge ? <span className={styles.nodeDraftBadge}>Draft</span> : null}
                </span>
              </StaticTreeRowCard>
            </div>
          </div>
        ) : (
          <ParentDropZone parentId={node.docId!} className={styles.nodeLead}>
            <DraggableCard
              card={node}
              className={styles.nodeDragSurface}
              disabled={saving}
              onClick={() => onSelectCard(node.docId)}
              sourceParentId={sourceParentId}
              sourceIsRoot={!sourceParentId && node.isCollectionRoot === true}
              expanded={isExpanded}
              hasChildren={hasChildren}
              onToggleExpanded={() => toggleExpanded(node.docId)}
            >
              <span className={styles.nodeTitleWrap}>
                <span className={styles.nodeTitle}>{cardLabel(node)}</span>
                {hasChildren ? (
                  <span
                    className={styles.nodeCountInline}
                    title={`${childIds.length} child${childIds.length === 1 ? '' : 'ren'}`}
                  >
                    ({childIds.length})
                  </span>
                ) : null}
                {showDraftRootBadge ? <span className={styles.nodeDraftBadge}>Draft</span> : null}
              </span>
            </DraggableCard>
          </ParentDropZone>
        )}
        <div className={styles.nodeActions}>
          <div ref={menuRef} className={styles.treeMenuWrap}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              disabled={saving}
              className={styles.treeMenuButton}
              aria-label={`Actions for ${cardLabel(node)}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Ellipsis size={17} aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className={styles.treeMenu} role="menu">
                <button type="button" role="menuitem" onClick={() => {
                  setMenuOpen(false);
                  void onSelectCard(node.docId);
                }}>
                  <ExternalLink size={14} aria-hidden="true" /> Open in Compose
                </button>
                <button type="button" role="menuitem" onClick={() => {
                  setMenuOpen(false);
                  onAddChildren(node.docId);
                }}>
                  <ListPlus size={14} aria-hidden="true" /> Add child card
                </button>
                {sourceParentId || node.isCollectionRoot === true ? (
                  <button type="button" role="menuitem" onClick={() => {
                  setMenuOpen(false);
                    if (sourceParentId) void onDetachChild(node.docId, sourceParentId);
                    else void onClearRoot(node.docId);
                  }}>
                    <Unlink size={14} aria-hidden="true" />
                    {sourceParentId ? 'Detach from parent' : 'Remove collection status'}
                  </button>
                ) : null}
                {onDeleteCard ? (
                  <>
                    <div className={styles.treeMenuSeparator} />
                    <button type="button" role="menuitem" className={styles.treeMenuDanger} onClick={() => {
                      setMenuOpen(false);
                      void onDeleteCard(node);
                    }}>
                      <Trash2 size={14} aria-hidden="true" /> Delete card
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
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
                onAddChildren={onAddChildren}
                onDeleteCard={onDeleteCard}
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
