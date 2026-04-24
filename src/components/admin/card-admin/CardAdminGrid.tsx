'use client';

import React, { useCallback, useMemo } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { formatCoreTagsTooltipLines } from '@/lib/utils/tagDisplay';
import {
  buildResolvedTagDimensionMap,
  buildTagByIdMap,
  getCoreTagsByDimensionFromTagIds,
} from '@/lib/utils/tagDimensionResolve';
import styles from './CardAdminGrid.module.css';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import AdminGridCellChrome from '@/components/admin/common/AdminGridCellChrome';
import chromeStyles from '@/components/admin/common/AdminGridCellChrome.module.css';
import { adminChromeSelector, ADMIN_GRID_CHROME } from '@/components/admin/common/adminGridChromeAttr';
import { eventTargetToElement } from '@/lib/utils/domEventTarget';

interface CardAdminGridProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  allTags: Tag[];
  getCardSecondaryMeta?: (card: Card) => { label: string; title?: string } | null;
  onSelectCard: (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  studioCuratedTreeDrag?: boolean;
  /** Per-cell `unparented-row:${docId}` droppables (Studio attach bank + curated DnD). */
  studioCuratedTreeUnparentedRowTarget?: boolean;
  /** Primary cell click selects the card instead of navigating to edit. */
  studioEmbedCellClickSelects?: boolean;
  /**
   * When set with `studioEmbedCellClickSelects`, checkbox still toggles `onSelectCard` (bulk);
   * cell/keyboard primary activation focuses this id (e.g. Studio compose) instead of bulk toggling.
   */
  onStudioFocusCard?: (cardId: string) => void;
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

/** Cover hover: title, caption, then full Who/What/When/Where tag lines. */
function buildCardThumbnailTooltip(card: Card, allTags: Tag[]): string {
  const resolvedDimension = buildResolvedTagDimensionMap(allTags);
  const core = getCoreTagsByDimensionFromTagIds(card.tags ?? [], resolvedDimension);
  const tagById = buildTagByIdMap(allTags);
  const tagLines = formatCoreTagsTooltipLines(core, (id) => tagById.get(id)?.name ?? id);
  const captionLine = pickCaption(card);
  return [card.title || 'Untitled', captionLine || null, tagLines].filter(Boolean).join('\n\n');
}

function isCardGridChromeInteractiveTarget(target: EventTarget | null): boolean {
  const t = eventTargetToElement(target);
  if (!t) return false;
  return Boolean(
    t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopStart)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopEnd)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.tagRail)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.tagSearchFoot))
  );
}

interface CardAdminGridPlainCellProps {
  card: Card;
  isSelected: boolean;
  allTags: Tag[];
  secondaryMeta?: { label: string; title?: string } | null;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onBulkPointer: (e: React.MouseEvent | React.KeyboardEvent) => void;
  /** If set, cell primary uses this when `studioEmbedCellClickSelects` (else bulk for backward compatibility). */
  onFocusStudio?: () => void;
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
  secondaryMeta,
  onUpdateCard,
  onBulkPointer,
  onFocusStudio,
  onEdit,
  onDelete,
  studioEmbedCellClickSelects,
  interactionDisabled,
  compactStudioGrid,
}: CardAdminGridPlainCellProps) {
  const activatePrimary = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (studioEmbedCellClickSelects) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        onBulkPointer(e);
        return;
      }
      if (onFocusStudio) onFocusStudio();
      else onBulkPointer(e);
    } else onEdit();
  };

  const captionLine = pickCaption(card);
  const thumbnailTooltip = useMemo(
    () => buildCardThumbnailTooltip(card, allTags),
    [card, allTags]
  );

  const onImageColumnClick = (e: React.MouseEvent) => {
    const t = eventTargetToElement(e.target);
    if (t?.closest('a, button, input, textarea')) return;
    activatePrimary(e);
    e.stopPropagation();
  };

  return (
    <AdminGridCellChrome
      selected={isSelected}
      rootProps={{
        id: `card-${card.docId}`,
        title: thumbnailTooltip,
        onClick: (e) => {
          if (isCardGridChromeInteractiveTarget(e.target)) return;
          activatePrimary(e);
        },
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          const t = eventTargetToElement(e.target);
          if (t?.closest('input, textarea, button, [role="listbox"]')) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activatePrimary(e);
          }
        },
      }}
      overlayTopStart={
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            readOnly
            checked={isSelected}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBulkPointer(e);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onBulkPointer(e);
              }
            }}
            disabled={interactionDisabled}
            aria-label={`Select ${card.title || 'Untitled'}`}
            className={chromeStyles.checkbox}
          />
        </div>
      }
      overlayTopEnd={
        <div onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={chromeStyles.deleteBtn}
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
      }
      overlayLeftRail={
        <DimensionalTagVerticalChips
          tagIds={card.tags ?? []}
          allTags={allTags}
          disabled={interactionDisabled}
          onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
        />
      }
      overlayBottom={
        <>
          <span className={chromeStyles.metaBadge}>{card.type}</span>
          <span
            className={
              card.status === 'draft' ? chromeStyles.metaBadgeDraft : chromeStyles.metaBadgePublished
            }
          >
            {card.status}
          </span>
        </>
      }
      thumbnail={
        <div
          className={styles.thumbnailWrap}
          style={coverAspectStyle(card.coverImage)}
          title={thumbnailTooltip}
          onClick={onImageColumnClick}
        >
          {card.coverImage ? (
            <JournalImage
              src={getDisplayUrl(card.coverImage)}
              alt={card.title || 'Cover'}
              fill
              className={styles.thumbnailNatural}
              sizes={
                compactStudioGrid
                  ? '(max-width: 768px) 95vw, min(360px, 40vw)'
                  : '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px'
              }
            />
          ) : (
            <div className={styles.noCover}>No cover</div>
          )}
        </div>
      }
      belowThumbnail={
        <>
          <div className={styles.title} title={card.title}>
            {card.title || 'Untitled'}
          </div>
          {secondaryMeta ? (
            <div className={styles.secondaryMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
              {secondaryMeta.label}
            </div>
          ) : null}
          {captionLine ? (
            <div className={styles.caption} title={captionLine}>
              {captionLine}
            </div>
          ) : null}
          <div className={styles.tagSearchFoot} data-admin-chrome={ADMIN_GRID_CHROME.tagSearchFoot}>
            <CardDimensionalTagCommandBar
              card={card}
              allTags={allTags}
              variant="searchOnly"
              disabled={interactionDisabled}
              onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
            />
          </div>
        </>
      }
    />
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
  secondaryMeta,
  onUpdateCard,
  onBulkPointer,
  onFocusStudio,
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

  const activatePrimary = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (studioEmbedCellClickSelects) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        onBulkPointer(e);
        return;
      }
      if (onFocusStudio) onFocusStudio();
      else onBulkPointer(e);
    } else onEdit();
  };

  const captionLine = pickCaption(card);
  const thumbnailTooltip = useMemo(
    () => buildCardThumbnailTooltip(card, allTags),
    [card, allTags]
  );

  const onImageColumnClick = (e: React.MouseEvent) => {
    const t = eventTargetToElement(e.target);
    if (t?.closest('a, button, input, textarea')) return;
    activatePrimary(e);
    e.stopPropagation();
  };

  return (
    <AdminGridCellChrome
      selected={isSelected}
      rootProps={{
        ref: needsCellRef ? setCellRef : undefined,
        style: cellStyle,
        id: `card-${card.docId}`,
        title: thumbnailTooltip,
        onClick: (e) => {
          if (isCardGridChromeInteractiveTarget(e.target)) return;
          activatePrimary(e);
        },
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          const t = eventTargetToElement(e.target);
          if (t?.closest('input, textarea, button, [role="listbox"]')) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activatePrimary(e);
          }
        },
      }}
      overlayTopStart={
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            readOnly
            checked={isSelected}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBulkPointer(e);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onBulkPointer(e);
              }
            }}
            disabled={interactionDisabled}
            aria-label={`Select ${card.title || 'Untitled'}`}
            className={chromeStyles.checkbox}
          />
        </div>
      }
      overlayTopEnd={
        <div onClick={(e) => e.stopPropagation()}>
          {studioCuratedTreeDrag ? (
            <button
              type="button"
              ref={rowDnd.setActivatorNodeRef}
              className={chromeStyles.curatedDragHandle}
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
            className={chromeStyles.deleteBtn}
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
      }
      overlayLeftRail={
        <DimensionalTagVerticalChips
          tagIds={card.tags ?? []}
          allTags={allTags}
          disabled={interactionDisabled}
          onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
        />
      }
      overlayBottom={
        <>
          <span className={chromeStyles.metaBadge}>{card.type}</span>
          <span
            className={
              card.status === 'draft' ? chromeStyles.metaBadgeDraft : chromeStyles.metaBadgePublished
            }
          >
            {card.status}
          </span>
        </>
      }
      thumbnail={
        <div
          className={styles.thumbnailWrap}
          style={coverAspectStyle(card.coverImage)}
          title={thumbnailTooltip}
          onClick={onImageColumnClick}
        >
          {card.coverImage ? (
            <JournalImage
              src={getDisplayUrl(card.coverImage)}
              alt={card.title || 'Cover'}
              fill
              className={styles.thumbnailNatural}
              sizes={
                compactStudioGrid
                  ? '(max-width: 768px) 95vw, min(360px, 40vw)'
                  : '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px'
              }
            />
          ) : (
            <div className={styles.noCover}>No cover</div>
          )}
        </div>
      }
      belowThumbnail={
        <>
          <div className={styles.title} title={card.title}>
            {card.title || 'Untitled'}
          </div>
          {secondaryMeta ? (
            <div className={styles.secondaryMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
              {secondaryMeta.label}
            </div>
          ) : null}
          {captionLine ? (
            <div className={styles.caption} title={captionLine}>
              {captionLine}
            </div>
          ) : null}
          <div className={styles.tagSearchFoot} data-admin-chrome={ADMIN_GRID_CHROME.tagSearchFoot}>
            <CardDimensionalTagCommandBar
              card={card}
              allTags={allTags}
              variant="searchOnly"
              disabled={interactionDisabled}
              onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
            />
          </div>
        </>
      }
    />
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
  getCardSecondaryMeta,
  studioCuratedTreeDrag = false,
  studioCuratedTreeUnparentedRowTarget = false,
  studioEmbedCellClickSelects = false,
  onStudioFocusCard,
  hideBulkSelectRow = false,
  interactionDisabled = false,
  compactStudioGrid = false,
}: CardAdminGridProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;
  const needsCuratedDndKit = studioCuratedTreeDrag || studioCuratedTreeUnparentedRowTarget;

  const handleEdit = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/studio?card=${encodeURIComponent(cardId)}`);
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
        {cards.map((card, index) =>
          needsCuratedDndKit ? (
            <CardAdminGridStudioCell
              key={card.docId}
              card={card}
              isSelected={selectedCardIds.has(card.docId)}
              allTags={allTags}
              secondaryMeta={getCardSecondaryMeta?.(card) ?? null}
              onUpdateCard={onUpdateCard}
              onBulkPointer={(e) => onSelectCard(card.docId, index, e)}
              onFocusStudio={onStudioFocusCard ? () => onStudioFocusCard(card.docId) : undefined}
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
              secondaryMeta={getCardSecondaryMeta?.(card) ?? null}
              onUpdateCard={onUpdateCard}
              onBulkPointer={(e) => onSelectCard(card.docId, index, e)}
              onFocusStudio={onStudioFocusCard ? () => onStudioFocusCard(card.docId) : undefined}
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
