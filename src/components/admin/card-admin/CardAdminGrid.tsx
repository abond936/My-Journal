'use client';

import React, { useCallback } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './CardAdminGrid.module.css';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';

interface CardAdminGridProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  allTags: Tag[];
  onSelectCard: (cardId: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  studioCuratedTreeDrag?: boolean;
  /** Per-cell `unparented-row:${docId}` droppables (Studio attach bank + curated DnD). */
  studioCuratedTreeUnparentedRowTarget?: boolean;
  /** Primary cell click selects the card instead of navigating to edit. */
  studioEmbedCellClickSelects?: boolean;
  hideBulkSelectRow?: boolean;
  interactionDisabled?: boolean;
  /** Studio attach bank: denser grid (smaller min cell width). */
  compactStudioGrid?: boolean;
}

function coverAspectStyle(cover: Card['coverImage']): React.CSSProperties {
  const w = cover?.width;
  const h = cover?.height;
  if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
    return { aspectRatio: `${w} / ${h}` };
  }
  return { aspectRatio: '4 / 5' };
}

function pickCaption(card: Card): string {
  for (const v of [card.excerpt, card.subtitle]) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

interface CardAdminGridPlainCellProps {
  card: Card;
  isSelected: boolean;
  allTags: Tag[];
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  studioEmbedCellClickSelects: boolean;
  interactionDisabled: boolean;
  compactStudioGrid: boolean;
}

/** `/admin/card-admin` grid — no dnd-kit (no `DndContext` on that page). */
function CardAdminGridPlainCell({
  card,
  isSelected,
  allTags,
  onUpdateCard,
  onSelect,
  onEdit,
  onDelete,
  studioEmbedCellClickSelects,
  interactionDisabled,
  compactStudioGrid,
}: CardAdminGridPlainCellProps) {
  const activatePrimary = () => {
    if (studioEmbedCellClickSelects) onSelect();
    else onEdit();
  };

  const onCheckboxChange = () => {
    onSelect();
  };

  const captionLine = pickCaption(card);

  return (
    <div
      id={`card-${card.docId}`}
      className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
      title={[card.title || 'Untitled', captionLine].filter(Boolean).join('\n')}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (
          t.closest(`.${styles.cellHeaderStart}`) ||
          t.closest(`.${styles.cellHeaderActions}`) ||
          t.closest(`.${styles.tagRail}`) ||
          t.closest(`.${styles.tagSearchFoot}`)
        )
          return;
        activatePrimary();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, textarea, button, [role="listbox"]')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activatePrimary();
        }
      }}
    >
      <div className={styles.cellHeader}>
        <div className={styles.cellHeaderStart} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onCheckboxChange}
            disabled={interactionDisabled}
            aria-label={`Select ${card.title || 'Untitled'}`}
            className={styles.cellHeaderCheckbox}
          />
        </div>
        <div className={styles.cellHeaderMid}>
          <span className={styles.typeBadge}>{card.type}</span>
          <span className={`${styles.statusBadge} ${styles[card.status]}`}>{card.status}</span>
        </div>
        <div className={styles.cellHeaderActions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
            aria-label="Delete card"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className={styles.cellMain}>
        <div className={styles.tagRail}>
          <DimensionalTagVerticalChips
            card={card}
            allTags={allTags}
            disabled={interactionDisabled}
            onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
          />
        </div>
        <div className={styles.imageCol}>
          <div className={styles.thumbnailWrap} style={coverAspectStyle(card.coverImage)}>
            {card.coverImage ? (
              <JournalImage
                src={getDisplayUrl(card.coverImage)}
                alt={card.title || 'Cover'}
                fill
                className={styles.thumbnailNatural}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
              />
            ) : (
              <div className={styles.noCover}>No cover</div>
            )}
          </div>
        </div>
      </div>

      {!compactStudioGrid ? (
        <div className={styles.title} title={card.title}>
          {card.title || 'Untitled'}
        </div>
      ) : null}

      {captionLine ? (
        <div className={styles.caption} title={captionLine}>
          {captionLine}
        </div>
      ) : null}

      <div className={styles.tagSearchFoot}>
        <CardDimensionalTagCommandBar
          card={card}
          allTags={allTags}
          variant="searchOnly"
          disabled={interactionDisabled}
          onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
        />
      </div>
    </div>
  );
}

interface CardAdminGridStudioCellProps extends CardAdminGridPlainCellProps {
  studioCuratedTreeDrag: boolean;
  studioCuratedTreeUnparentedRowTarget: boolean;
}

/** Studio Collections attach bank — requires parent `DndContext`. */
function CardAdminGridStudioCell({
  card,
  isSelected,
  allTags,
  onUpdateCard,
  onSelect,
  onEdit,
  onDelete,
  studioCuratedTreeDrag,
  studioCuratedTreeUnparentedRowTarget,
  studioEmbedCellClickSelects,
  interactionDisabled,
  compactStudioGrid,
}: CardAdminGridStudioCellProps) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');

  const rowDnd = useDraggable({
    id: `card:${card.docId}`,
    disabled: interactionDisabled || !studioCuratedTreeDrag,
    data: { cardId: card.docId },
  });

  const rowShellDrop = useDroppable({
    id: `unparented-row:${card.docId}`,
    disabled: interactionDisabled || !studioCuratedTreeUnparentedRowTarget || !reparentFromCard,
  });

  const setCellRef = useCallback(
    (node: HTMLDivElement | null) => {
      rowDnd.setNodeRef(node);
      rowShellDrop.setNodeRef(node);
    },
    [rowDnd, rowShellDrop]
  );

  const needsCellRef = studioCuratedTreeDrag || studioCuratedTreeUnparentedRowTarget;

  const cellStyle: React.CSSProperties | undefined =
    studioCuratedTreeDrag && (rowDnd.isDragging || rowDnd.transform)
      ? {
          opacity: rowDnd.isDragging ? 0.55 : 1,
          transform: rowDnd.transform ? CSS.Translate.toString(rowDnd.transform) : undefined,
        }
      : undefined;

  const activatePrimary = () => {
    if (studioEmbedCellClickSelects) onSelect();
    else onEdit();
  };

  const onCheckboxChange = () => {
    onSelect();
  };

  const captionLine = pickCaption(card);

  return (
    <div
      ref={needsCellRef ? setCellRef : undefined}
      style={cellStyle}
      id={`card-${card.docId}`}
      className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
      title={[card.title || 'Untitled', captionLine].filter(Boolean).join('\n')}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (
          t.closest(`.${styles.cellHeaderStart}`) ||
          t.closest(`.${styles.cellHeaderActions}`) ||
          t.closest(`.${styles.tagRail}`) ||
          t.closest(`.${styles.tagSearchFoot}`)
        )
          return;
        activatePrimary();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, textarea, button, [role="listbox"]')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activatePrimary();
        }
      }}
    >
      <div className={styles.cellHeader}>
        <div className={styles.cellHeaderStart} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onCheckboxChange}
            disabled={interactionDisabled}
            aria-label={`Select ${card.title || 'Untitled'}`}
            className={styles.cellHeaderCheckbox}
          />
        </div>
        <div className={styles.cellHeaderMid}>
          <span className={styles.typeBadge}>{card.type}</span>
          <span className={`${styles.statusBadge} ${styles[card.status]}`}>{card.status}</span>
        </div>
        <div className={styles.cellHeaderActions} onClick={(e) => e.stopPropagation()}>
          {studioCuratedTreeDrag ? (
            <button
              type="button"
              ref={rowDnd.setActivatorNodeRef}
              className={styles.curatedDragHandle}
              {...rowDnd.listeners}
              {...rowDnd.attributes}
              disabled={interactionDisabled}
              aria-label="Drag into curated tree"
              onClick={(e) => e.stopPropagation()}
            >
              ⋮⋮
            </button>
          ) : null}
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
            aria-label="Delete card"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className={styles.cellMain}>
        <div className={styles.tagRail}>
          <DimensionalTagVerticalChips
            card={card}
            allTags={allTags}
            disabled={interactionDisabled}
            onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
          />
        </div>
        <div className={styles.imageCol}>
          <div className={styles.thumbnailWrap} style={coverAspectStyle(card.coverImage)}>
            {card.coverImage ? (
              <JournalImage
                src={getDisplayUrl(card.coverImage)}
                alt={card.title || 'Cover'}
                fill
                className={styles.thumbnailNatural}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
              />
            ) : (
              <div className={styles.noCover}>No cover</div>
            )}
          </div>
        </div>
      </div>

      {!compactStudioGrid ? (
        <div className={styles.title} title={card.title}>
          {card.title || 'Untitled'}
        </div>
      ) : null}

      {captionLine ? (
        <div className={styles.caption} title={captionLine}>
          {captionLine}
        </div>
      ) : null}

      <div className={styles.tagSearchFoot}>
        <CardDimensionalTagCommandBar
          card={card}
          allTags={allTags}
          variant="searchOnly"
          disabled={interactionDisabled}
          onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
        />
      </div>
    </div>
  );
}

export default function CardAdminGrid({
  cards,
  selectedCardIds,
  onSelectCard,
  onSelectAll,
  onSaveScrollPosition,
  onUpdateCard,
  onDeleteCard,
  allTags,
  studioCuratedTreeDrag = false,
  studioCuratedTreeUnparentedRowTarget = false,
  studioEmbedCellClickSelects = false,
  hideBulkSelectRow = false,
  interactionDisabled = false,
  compactStudioGrid = false,
}: CardAdminGridProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;
  const needsCuratedDndKit = studioCuratedTreeDrag || studioCuratedTreeUnparentedRowTarget;

  const handleEdit = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/card-admin/${cardId}/edit`);
  };

  const handleDelete = async (card: Card) => {
    const params = new URLSearchParams({ childrenIds_contains: card.docId });
    const response = await fetch(`/api/cards?${params.toString()}`);
    const parentCardsResult = response.ok ? await response.json() : { items: [] };
    const parentCards = parentCardsResult.items || [];

    let confirmMessage = 'Are you sure you want to delete this card? This action cannot be undone.';
    if (parentCards.length > 0) {
      const parentTitles = parentCards.map((p: Card) => p.title).join(', ');
      confirmMessage = `WARNING: This card is a child of: ${parentTitles}.\n\nDeleting will remove it from these collections. Proceed?`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        await onDeleteCard(card.docId);
      } catch (err) {
        console.error('Deletion error:', err);
        alert(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    }
  };

  return (
    <div className={styles.container}>
      {cards.length > 0 && !hideBulkSelectRow ? (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      ) : null}
      <div className={compactStudioGrid ? `${styles.grid} ${styles.gridStudioCompact}` : styles.grid}>
        {cards.map((card) =>
          needsCuratedDndKit ? (
            <CardAdminGridStudioCell
              key={card.docId}
              card={card}
              isSelected={selectedCardIds.has(card.docId)}
              allTags={allTags}
              onUpdateCard={onUpdateCard}
              onSelect={() => onSelectCard(card.docId)}
              onEdit={() => handleEdit(card.docId)}
              onDelete={() => handleDelete(card)}
              studioCuratedTreeDrag={studioCuratedTreeDrag}
              studioCuratedTreeUnparentedRowTarget={studioCuratedTreeUnparentedRowTarget}
              studioEmbedCellClickSelects={studioEmbedCellClickSelects}
              interactionDisabled={interactionDisabled}
              compactStudioGrid={compactStudioGrid}
            />
          ) : (
            <CardAdminGridPlainCell
              key={card.docId}
              card={card}
              isSelected={selectedCardIds.has(card.docId)}
              allTags={allTags}
              onUpdateCard={onUpdateCard}
              onSelect={() => onSelectCard(card.docId)}
              onEdit={() => handleEdit(card.docId)}
              onDelete={() => handleDelete(card)}
              studioEmbedCellClickSelects={studioEmbedCellClickSelects}
              interactionDisabled={interactionDisabled}
              compactStudioGrid={compactStudioGrid}
            />
          )
        )}
      </div>
      {cards.length === 0 && (
        <div className={styles.emptyState}>
          <p>No cards found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}
