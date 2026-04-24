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
import {
  buildSingleCardDeletePrompt,
  fetchCardDeleteParents,
} from '@/lib/utils/cardDeleteWarnings';
import {
  buildStudioCollectionCardDragData,
  isStudioCollectionCardDragData,
} from '@/lib/dnd/studioDragContract';

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

function coverAspectStyle(cover: Card['coverImage'], uniform = false): React.CSSProperties {
  if (uniform) {
    return { aspectRatio: '4 / 3' };
  }
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
  cardIndex: number;
  isSelected: boolean;
  allTags: Tag[];
  secondaryMeta?: { label: string; title?: string } | null;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onBulkPointer: (e: React.MouseEvent | React.KeyboardEvent, cardId: string, cardIndex: number) => void;
  /** If set, cell primary uses this when `studioEmbedCellClickSelects` (else bulk for backward compatibility). */
  onFocusStudio?: (cardId: string) => void;
  onEdit: (cardId: string) => void;
  onDelete: (card: Card) => void;
  studioEmbedCellClickSelects: boolean;
  interactionDisabled: boolean;
  compactStudioGrid: boolean;
}

/** `/admin/card-admin` grid — no dnd-kit (no `DndContext` on that page). */
function CardAdminGridPlainCell({
  card,
  cardIndex,
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
  const handleBulkPointer = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      onBulkPointer(e, card.docId, cardIndex);
    },
    [card.docId, cardIndex, onBulkPointer]
  );

  const handleEdit = useCallback(() => {
    onEdit(card.docId);
  }, [card.docId, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(card);
  }, [card, onDelete]);

  const activatePrimary = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (studioEmbedCellClickSelects) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        handleBulkPointer(e);
        return;
      }
      if (onFocusStudio) onFocusStudio(card.docId);
      else handleBulkPointer(e);
    } else handleEdit();
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
              handleBulkPointer(e);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleBulkPointer(e);
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
              handleDelete();
            }}
            title="Delete"
            aria-label="Delete card"
          >
            🗑️
          </button>
        </div>
      }
      overlayLeftRail={
        undefined
      }
      belowMeta={undefined}
      thumbnail={
        <div
          className={styles.thumbnailWrap}
          style={coverAspectStyle(card.coverImage, compactStudioGrid)}
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
          <div className={styles.metaRow}>
            <span className={chromeStyles.metaBadge}>{card.type}</span>
            <span
              className={
                card.status === 'draft' ? chromeStyles.metaBadgeDraft : chromeStyles.metaBadgePublished
              }
            >
              {card.status}
            </span>
          </div>
          <div className={styles.title} title={card.title}>
            {card.title || 'Untitled'}
          </div>
          <DimensionalTagVerticalChips
            className={styles.tagChipsInline}
            tagIds={card.tags ?? []}
            allTags={allTags}
            disabled={interactionDisabled}
            variant="inline"
            onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
          />
          {secondaryMeta ? (
            <div className={styles.secondaryMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
              {secondaryMeta.label}
            </div>
          ) : null}
          {!compactStudioGrid && captionLine ? (
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

const MemoizedCardAdminGridPlainCell = React.memo(CardAdminGridPlainCell, (prev, next) => {
  return (
    prev.card === next.card &&
    prev.cardIndex === next.cardIndex &&
    prev.isSelected === next.isSelected &&
    prev.allTags === next.allTags &&
    prev.secondaryMeta === next.secondaryMeta &&
    prev.onUpdateCard === next.onUpdateCard &&
    prev.onBulkPointer === next.onBulkPointer &&
    prev.onFocusStudio === next.onFocusStudio &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.studioEmbedCellClickSelects === next.studioEmbedCellClickSelects &&
    prev.interactionDisabled === next.interactionDisabled &&
    prev.compactStudioGrid === next.compactStudioGrid
  );
});

interface CardAdminGridStudioCellProps extends CardAdminGridPlainCellProps {
  studioCuratedTreeDrag: boolean;
  studioCuratedTreeUnparentedRowTarget: boolean;
}

/** Studio Collections attach bank — requires parent `DndContext`. */
function CardAdminGridStudioCell({
  card,
  cardIndex,
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
  const handleBulkPointer = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      onBulkPointer(e, card.docId, cardIndex);
    },
    [card.docId, cardIndex, onBulkPointer]
  );

  const handleEdit = useCallback(() => {
    onEdit(card.docId);
  }, [card.docId, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(card);
  }, [card, onDelete]);

  const { active } = useDndContext();
  const reparentFromCard = isStudioCollectionCardDragData(active?.data.current);

  const rowDnd = useDraggable({
    id: `card:${card.docId}`,
    disabled: interactionDisabled || !studioCuratedTreeDrag,
    data: buildStudioCollectionCardDragData(card.docId),
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
          opacity: rowDnd.isDragging ? 0.92 : 1,
          transform: rowDnd.transform ? CSS.Translate.toString(rowDnd.transform) : undefined,
          borderRadius: rowDnd.isDragging ? 'var(--border-radius-md)' : undefined,
          background: rowDnd.isDragging
            ? 'color-mix(in srgb, var(--layout-background1-color) 92%, var(--color3) 8%)'
            : undefined,
          boxShadow: rowDnd.isDragging
            ? '0 14px 28px color-mix(in srgb, var(--text1-color) 14%, transparent), 0 0 0 1px color-mix(in srgb, var(--color3) 24%, transparent)'
            : undefined,
        }
      : undefined;

  const activatePrimary = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (studioEmbedCellClickSelects) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        handleBulkPointer(e);
        return;
      }
      if (onFocusStudio) onFocusStudio(card.docId);
      else handleBulkPointer(e);
    } else handleEdit();
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
              handleBulkPointer(e);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleBulkPointer(e);
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
              handleDelete();
            }}
            title="Delete"
            aria-label="Delete card"
          >
            🗑️
          </button>
        </div>
      }
      overlayLeftRail={
        undefined
      }
      belowMeta={undefined}
      thumbnail={
        <div
          className={styles.thumbnailWrap}
          style={coverAspectStyle(card.coverImage, compactStudioGrid)}
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
          <div className={styles.metaRow}>
            <span className={chromeStyles.metaBadge}>{card.type}</span>
            <span
              className={
                card.status === 'draft' ? chromeStyles.metaBadgeDraft : chromeStyles.metaBadgePublished
              }
            >
              {card.status}
            </span>
          </div>
          <div className={styles.title} title={card.title}>
            {card.title || 'Untitled'}
          </div>
          <DimensionalTagVerticalChips
            className={styles.tagChipsInline}
            tagIds={card.tags ?? []}
            allTags={allTags}
            disabled={interactionDisabled}
            variant="inline"
            onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
          />
          {secondaryMeta ? (
            <div className={styles.secondaryMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
              {secondaryMeta.label}
            </div>
          ) : null}
          {!compactStudioGrid && captionLine ? (
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

const MemoizedCardAdminGridStudioCell = React.memo(CardAdminGridStudioCell, (prev, next) => {
  return (
    prev.card === next.card &&
    prev.cardIndex === next.cardIndex &&
    prev.isSelected === next.isSelected &&
    prev.allTags === next.allTags &&
    prev.secondaryMeta === next.secondaryMeta &&
    prev.onUpdateCard === next.onUpdateCard &&
    prev.onBulkPointer === next.onBulkPointer &&
    prev.onFocusStudio === next.onFocusStudio &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.studioCuratedTreeDrag === next.studioCuratedTreeDrag &&
    prev.studioCuratedTreeUnparentedRowTarget === next.studioCuratedTreeUnparentedRowTarget &&
    prev.studioEmbedCellClickSelects === next.studioEmbedCellClickSelects &&
    prev.interactionDisabled === next.interactionDisabled &&
    prev.compactStudioGrid === next.compactStudioGrid
  );
});

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

  const handleEdit = useCallback((cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/studio?card=${encodeURIComponent(cardId)}`);
  }, [onSaveScrollPosition, router]);

  const handleDelete = useCallback(async (card: Card) => {
    const { parentTitles, verificationFailed } = await fetchCardDeleteParents(card.docId);
    const prompt = buildSingleCardDeletePrompt({
      title: card.title,
      isCollectionRoot: card.isCollectionRoot,
      childCount: card.childrenIds?.length ?? 0,
      parentTitles,
      verificationFailed,
    });

    if (prompt.blocked) {
      window.alert(prompt.message);
      return;
    }

    if (window.confirm(prompt.message)) {
      try {
        await onDeleteCard(card.docId);
      } catch (err) {
        console.error('Deletion error:', err);
        alert(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    }
  }, [onDeleteCard]);

  const handleBulkPointer = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, cardId: string, cardIndex: number) => {
      onSelectCard(cardId, cardIndex, e);
    },
    [onSelectCard]
  );

  const secondaryMetaById = useMemo(() => {
    if (!getCardSecondaryMeta) return new Map<string, { label: string; title?: string } | null>();
    return new Map(
      cards.map((card) => [card.docId, getCardSecondaryMeta(card) ?? null] as const)
    );
  }, [cards, getCardSecondaryMeta]);

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
            <MemoizedCardAdminGridStudioCell
              key={card.docId}
              card={card}
              cardIndex={index}
              isSelected={selectedCardIds.has(card.docId)}
              allTags={allTags}
              secondaryMeta={secondaryMetaById.get(card.docId) ?? null}
              onUpdateCard={onUpdateCard}
              onBulkPointer={handleBulkPointer}
              onFocusStudio={onStudioFocusCard}
              onEdit={handleEdit}
              onDelete={handleDelete}
              studioCuratedTreeDrag={studioCuratedTreeDrag}
              studioCuratedTreeUnparentedRowTarget={studioCuratedTreeUnparentedRowTarget}
              studioEmbedCellClickSelects={studioEmbedCellClickSelects}
              interactionDisabled={interactionDisabled}
              compactStudioGrid={compactStudioGrid}
            />
          ) : (
            <MemoizedCardAdminGridPlainCell
              key={card.docId}
              card={card}
              cardIndex={index}
              isSelected={selectedCardIds.has(card.docId)}
              allTags={allTags}
              secondaryMeta={secondaryMetaById.get(card.docId) ?? null}
              onUpdateCard={onUpdateCard}
              onBulkPointer={handleBulkPointer}
              onFocusStudio={onStudioFocusCard}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
