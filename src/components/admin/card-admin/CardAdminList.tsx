'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/card-admin/card-admin.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import EditableTitleCell from './EditableTitleCell';
import EditableDisplayModeCell from './EditableDisplayModeCell';
import EditableTypeCell from './EditableTypeCell';
import EditableStatusCell from './EditableStatusCell';
import ResizableHeader from './ResizableHeader';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import {
  buildSingleCardDeletePrompt,
  fetchCardDeleteParents,
} from '@/lib/utils/cardDeleteWarnings';
import {
  buildStudioCollectionCardDragData,
  isStudioCollectionCardDragData,
} from '@/lib/dnd/studioDragContract';

const COLUMN_WIDTHS_KEY = 'cardAdminColumnWidths';
const STUDIO_CURATED_DRAG_COL = 36;
/** Square side = row height; column must be wide enough or the image is cropped horizontally. */
const COVER_COLUMN_MIN = 120;
const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 40,
  cover: 128,
  title: 160,
  /** Stacked: Type, Display, Status */
  typeDisplayStatus: 108,
  /** Stacked: content flag, gallery count, children count */
  contentGalleryChildren: 64,
  /** Tag bar: minimum width; column grows to fill space (see col + `ResizableHeader` `widthMode`). */
  tagBar: 272,
  dimWho: 90,
  dimWhat: 90,
  dimWhen: 90,
  dimWhere: 90,
  /** Stacked: Edit, Delete */
  actions: 80,
};

type ColumnWidths = typeof DEFAULT_COLUMN_WIDTHS;

const DIM_COL: Record<TagDimension, 'dimWho' | 'dimWhat' | 'dimWhen' | 'dimWhere'> = {
  who: 'dimWho',
  what: 'dimWhat',
  when: 'dimWhen',
  where: 'dimWhere',
};

function CardListCoverCell({ card, coverWidth }: { card: Card; coverWidth: number }) {
  const w = Math.max(coverWidth, COVER_COLUMN_MIN);
  return (
    <td className={styles.coverImageCell} style={{ width: w, minWidth: w }}>
      <div className={styles.coverImageCellInner}>
        {card.coverImage ? (
          <JournalImage
            src={getDisplayUrl(card.coverImage)}
            alt="Cover"
            className={styles.coverThumbnailFill}
            fill
            sizes={`${w}px`}
          />
        ) : (
          <span className={styles.noCoverInCell} role="img" aria-label="No cover">
            —
          </span>
        )}
      </div>
    </td>
  );
}

function loadColumnWidths(): ColumnWidths {
  if (typeof window === 'undefined') return { ...DEFAULT_COLUMN_WIDTHS };
  const raw = localStorage.getItem(COLUMN_WIDTHS_KEY);
  if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const merged: ColumnWidths = { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
    merged.cover = Math.max(merged.cover, COVER_COLUMN_MIN);
    const p = parsed as Record<string, number>;
    if (p.type != null && merged.typeDisplayStatus === DEFAULT_COLUMN_WIDTHS.typeDisplayStatus) {
      merged.typeDisplayStatus = Math.max(
        100,
        Math.round(((p.type ?? 100) + (p.display ?? 100) + (p.status ?? 100)) / 1.2)
      );
    }
    if (p.content != null && merged.contentGalleryChildren === DEFAULT_COLUMN_WIDTHS.contentGalleryChildren) {
      merged.contentGalleryChildren = Math.max(
        72,
        Math.round(((p.content ?? 80) + (p.gallery ?? 80) + (p.children ?? 80)) / 2.5)
      );
    }
    if (p.dimensionTags != null && merged.tagBar === DEFAULT_COLUMN_WIDTHS.tagBar) {
      const w = p.dimensionTags as number;
      const per = Math.max(64, Math.round(w / 6));
      merged.tagBar = per * 2;
      merged.dimWho = per;
      merged.dimWhat = per;
      merged.dimWhen = per;
      merged.dimWhere = per;
    }
    return merged;
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

interface CardAdminListProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  allTags: Tag[];
  getCardSecondaryMeta?: (card: Card) => { label: string; title?: string } | null;
  onSelectCard: (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  /** Curated-tree Studio bank: drag handle registers `card:*` for tree / unparent drops. */
  studioCuratedTreeDrag?: boolean;
  /**
   * Registers `unparented-row:${docId}` on each row (same shell targets as Collections title list)
   * so collision detection prefers row-sized hit targets when detaching onto the bank.
   */
  studioCuratedTreeUnparentedRowTarget?: boolean;
  /** Hide the header “select all” checkbox (embedded single-select bank). */
  hideBulkSelectHeader?: boolean;
  /** Disable row drags and dim destructive actions while parent is saving. */
  interactionDisabled?: boolean;
  /**
   * When true, omit Who/What/When/Where media-suggestion columns (e.g. Studio table bank for horizontal space).
   * Tag bar column still shows; apply-suggestions in bulk is available elsewhere on the page if needed.
   */
  hideDimensionMediaSuggestions?: boolean;
}

type CardAdminListPlainRowProps = {
  card: Card;
  rowIndex: number;
  interactionDisabled: boolean;
  columnWidths: ColumnWidths;
  actionsColumnWidth: number;
  selectedCardIds: Set<string>;
  allTags: Tag[];
  secondaryMeta?: { label: string; title?: string } | null;
  tagMap: Map<string, string>;
  onSelectCard: (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  handleEditClick: (cardId: string) => void;
  getMediaSuggestionTags: (card: Card, dimension: TagDimension) => string[];
  applyDimensionSuggestions: (card: Card, dimension: TagDimension) => Promise<void>;
  confirmAndDeleteCard: (card: Card) => Promise<void>;
  hideDimensionMediaSuggestions: boolean;
};

type CardListMainDataCellsProps = {
  card: Card;
  columnWidths: ColumnWidths;
  actionsColumnWidth: number;
  allTags: Tag[];
  tagMap: Map<string, string>;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  handleEditClick: (cardId: string) => void;
  getMediaSuggestionTags: (card: Card, dimension: TagDimension) => string[];
  applyDimensionSuggestions: (card: Card, dimension: TagDimension) => Promise<void>;
  confirmAndDeleteCard: (card: Card) => Promise<void>;
  hideDimensionMediaSuggestions: boolean;
};

function CardListMainDataCells({
  card,
  columnWidths,
  actionsColumnWidth,
  allTags,
  tagMap,
  onUpdateCard,
  handleEditClick,
  getMediaSuggestionTags,
  applyDimensionSuggestions,
  confirmAndDeleteCard,
  hideDimensionMediaSuggestions,
}: CardListMainDataCellsProps) {
  return (
    <>
      <td className={styles.tableStackedCell} style={{ width: columnWidths.typeDisplayStatus }}>
        <div className={styles.tableStackedTds}>
          <EditableTypeCell card={card} onUpdate={onUpdateCard} />
          <EditableDisplayModeCell card={card} onUpdate={onUpdateCard} />
          <EditableStatusCell card={card} onUpdate={onUpdateCard} />
        </div>
      </td>
      <td className={styles.tableStackedCell} style={{ width: columnWidths.contentGalleryChildren }}>
        <div className={styles.tableCgcStack}>
          <div className={styles.tableCgcStackLine}>{card.content ? 'Y' : 'N'}</div>
          <div className={styles.tableCgcStackLine}>{card.galleryMedia?.length || 0}</div>
          <div className={styles.tableCgcStackLine}>{card.childrenIds?.length || 0}</div>
        </div>
      </td>
      <td
        className={styles.tableTagCommandCell}
        style={{ minWidth: columnWidths.tagBar, width: 'auto' }}
      >
        <CardDimensionalTagCommandBar
          card={card}
          allTags={allTags}
          variant="compact"
          tableEmbed
          hideDimensionRowLabels
          onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
        />
      </td>
      {hideDimensionMediaSuggestions
        ? null
        : DIMENSION_ORDER.map((dimension) => {
            const suggestionIds = getMediaSuggestionTags(card, dimension);
            const hasSuggestions = suggestionIds.length > 0;
            const w = columnWidths[DIM_COL[dimension]];
            return (
              <td key={dimension} className={styles.tableDimSuggestionCell} style={{ width: w }}>
                <div className={styles.tagSuggestions}>
                  {hasSuggestions ? (
                    suggestionIds.map((id) => (
                      <span key={id} className={styles.suggestionTag}>
                        {tagMap.get(id) ?? id}
                      </span>
                    ))
                  ) : (
                    <span className={styles.noSuggestion}>None</span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.suggestApplyButton}
                  disabled={!hasSuggestions}
                  onClick={() => void applyDimensionSuggestions(card, dimension)}
                >
                  Apply
                </button>
              </td>
            );
          })}
      <td className={styles.tableStackedCell} style={{ width: actionsColumnWidth, minWidth: actionsColumnWidth }}>
        <div className={styles.tableActionStack}>
          <button type="button" onClick={() => handleEditClick(card.docId)} className={styles.actionButton}>
            Edit
          </button>
          <button
            type="button"
            onClick={() => void confirmAndDeleteCard(card)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
          >
            Delete
          </button>
        </div>
      </td>
    </>
  );
}

type CardAdminListStudioRowProps = CardAdminListPlainRowProps & {
  studioCuratedTreeDrag: boolean;
  studioCuratedTreeUnparentedRowTarget: boolean;
};

/** Card admin `/admin/card-admin` table rows — must not use dnd-kit (no `DndContext` on that page). */
function CardAdminListPlainRow({
  card,
  rowIndex,
  interactionDisabled,
  columnWidths,
  actionsColumnWidth,
  selectedCardIds,
  allTags,
  secondaryMeta,
  tagMap,
  onSelectCard,
  onUpdateCard,
  handleEditClick,
  getMediaSuggestionTags,
  applyDimensionSuggestions,
  confirmAndDeleteCard,
  hideDimensionMediaSuggestions,
}: CardAdminListPlainRowProps) {
  return (
    <tr id={`card-${card.docId}`} className={selectedCardIds.has(card.docId) ? styles.selectedRow : ''}>
      <td style={{ width: columnWidths.checkbox }}>
        <input
          type="checkbox"
          readOnly
          checked={selectedCardIds.has(card.docId)}
          onClick={(e) => !interactionDisabled && onSelectCard(card.docId, rowIndex, e)}
          onKeyDown={(e) => {
            if (interactionDisabled) return;
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectCard(card.docId, rowIndex, e);
            }
          }}
          disabled={interactionDisabled}
        />
      </td>
      <CardListCoverCell card={card} coverWidth={columnWidths.cover} />
      <td className={styles.tableCellTitle} style={{ width: columnWidths.title }}>
        <EditableTitleCell card={card} onUpdate={onUpdateCard} />
        {secondaryMeta ? (
          <div className={styles.tableTitleMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
            {secondaryMeta.label}
          </div>
        ) : null}
      </td>
      <CardListMainDataCells
        card={card}
        columnWidths={columnWidths}
        actionsColumnWidth={actionsColumnWidth}
        allTags={allTags}
        tagMap={tagMap}
        onUpdateCard={onUpdateCard}
        handleEditClick={handleEditClick}
        getMediaSuggestionTags={getMediaSuggestionTags}
        applyDimensionSuggestions={applyDimensionSuggestions}
        confirmAndDeleteCard={confirmAndDeleteCard}
        hideDimensionMediaSuggestions={hideDimensionMediaSuggestions}
      />
    </tr>
  );
}

/** Studio Collections attach bank only — requires parent `DndContext`. */
function CardAdminListStudioRow({
  card,
  rowIndex,
  studioCuratedTreeDrag,
  studioCuratedTreeUnparentedRowTarget,
  interactionDisabled,
  columnWidths,
  actionsColumnWidth,
  selectedCardIds,
  allTags,
  secondaryMeta,
  tagMap,
  onSelectCard,
  onUpdateCard,
  handleEditClick,
  getMediaSuggestionTags,
  applyDimensionSuggestions,
  confirmAndDeleteCard,
  hideDimensionMediaSuggestions,
}: CardAdminListStudioRowProps) {
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

  const setRowRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      rowDnd.setNodeRef(node);
      rowShellDrop.setNodeRef(node);
    },
    [rowDnd, rowShellDrop]
  );

  const needsRowRef = studioCuratedTreeDrag || studioCuratedTreeUnparentedRowTarget;

  const rowStyle: React.CSSProperties | undefined =
    studioCuratedTreeDrag && (rowDnd.isDragging || rowDnd.transform)
      ? {
          opacity: rowDnd.isDragging ? 0.92 : 1,
          transform: rowDnd.transform ? CSS.Translate.toString(rowDnd.transform) : undefined,
          background: rowDnd.isDragging
            ? 'color-mix(in srgb, var(--layout-background1-color) 92%, var(--color3) 8%)'
            : undefined,
          boxShadow: rowDnd.isDragging
            ? '0 14px 28px color-mix(in srgb, var(--text1-color) 14%, transparent), 0 0 0 1px color-mix(in srgb, var(--color3) 24%, transparent)'
            : undefined,
        }
      : undefined;

  return (
    <tr
      ref={needsRowRef ? setRowRef : undefined}
      style={rowStyle}
      id={`card-${card.docId}`}
      className={selectedCardIds.has(card.docId) ? styles.selectedRow : ''}
    >
      {studioCuratedTreeDrag ? (
        <td style={{ width: STUDIO_CURATED_DRAG_COL, padding: '4px', verticalAlign: 'middle' }}>
          <button
            type="button"
            ref={rowDnd.setActivatorNodeRef}
            className={styles.studioCuratedDragHandle}
            {...rowDnd.listeners}
            {...rowDnd.attributes}
            disabled={interactionDisabled}
            aria-label="Drag into curated tree"
          >
            ⋮⋮
          </button>
        </td>
      ) : null}
      <td style={{ width: columnWidths.checkbox }}>
        <input
          type="checkbox"
          readOnly
          checked={selectedCardIds.has(card.docId)}
          onClick={(e) => !interactionDisabled && onSelectCard(card.docId, rowIndex, e)}
          onKeyDown={(e) => {
            if (interactionDisabled) return;
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectCard(card.docId, rowIndex, e);
            }
          }}
          disabled={interactionDisabled}
        />
      </td>
      <CardListCoverCell card={card} coverWidth={columnWidths.cover} />
      <td className={styles.tableCellTitle} style={{ width: columnWidths.title }}>
        <EditableTitleCell card={card} onUpdate={onUpdateCard} />
        {secondaryMeta ? (
          <div className={styles.tableTitleMeta} title={secondaryMeta.title ?? secondaryMeta.label}>
            {secondaryMeta.label}
          </div>
        ) : null}
      </td>
      <CardListMainDataCells
        card={card}
        columnWidths={columnWidths}
        actionsColumnWidth={actionsColumnWidth}
        allTags={allTags}
        tagMap={tagMap}
        onUpdateCard={onUpdateCard}
        handleEditClick={handleEditClick}
        getMediaSuggestionTags={getMediaSuggestionTags}
        applyDimensionSuggestions={applyDimensionSuggestions}
        confirmAndDeleteCard={confirmAndDeleteCard}
        hideDimensionMediaSuggestions={hideDimensionMediaSuggestions}
      />
    </tr>
  );
}

export default function CardAdminList({
  cards,
  selectedCardIds,
  allTags,
  getCardSecondaryMeta,
  onSelectCard,
  onSelectAll,
  onSaveScrollPosition,
  onUpdateCard,
  onDeleteCard,
  studioCuratedTreeDrag = false,
  studioCuratedTreeUnparentedRowTarget = false,
  hideBulkSelectHeader = false,
  interactionDisabled = false,
  hideDimensionMediaSuggestions = false,
}: CardAdminListProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;

  const tagMap = React.useMemo(
    () => new Map(allTags.map((t) => [t.docId!, t.name ?? ''])),
    [allTags]
  );

  const [columnWidths, setColumnWidths] = useState(loadColumnWidths);

  const handleColumnResize = useCallback((columnId: keyof ColumnWidths, width: number) => {
    setColumnWidths((prev) => {
      const w =
        columnId === 'cover' ? Math.max(Math.round(width), COVER_COLUMN_MIN) : width;
      const updated = { ...prev, [columnId]: w };
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);
  const actionsColumnWidth = Math.max(72, columnWidths.actions);

  const handleEditClick = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/studio?card=${encodeURIComponent(cardId)}`);
  };

  const resolvedTagDimensionById = React.useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);

  const getDirectTagsByDimension = useCallback(
    (card: Card, dimension: TagDimension) =>
      (card.tags || []).filter((tagId) => resolvedTagDimensionById.get(tagId) === dimension),
    [resolvedTagDimensionById]
  );

  const getMediaSuggestionTags = useCallback(
    (card: Card, dimension: TagDimension) => {
      const mediaByDimension = {
        who: card.mediaWho || [],
        what: card.mediaWhat || [],
        when: card.mediaWhen || [],
        where: card.mediaWhere || [],
      };
      const currentDimensionTags = new Set(getDirectTagsByDimension(card, dimension));
      return mediaByDimension[dimension].filter((tagId) => !currentDimensionTags.has(tagId));
    },
    [getDirectTagsByDimension]
  );

  const applyDimensionSuggestions = useCallback(
    async (card: Card, dimension: TagDimension) => {
      const suggestions = getMediaSuggestionTags(card, dimension);
      if (!suggestions.length) return;
      const nextTags = new Set(card.tags || []);
      suggestions.forEach((tagId) => nextTags.add(tagId));
      await onUpdateCard(card.docId, { tags: Array.from(nextTags) });
    },
    [getMediaSuggestionTags, onUpdateCard]
  );

  const confirmAndDeleteCard = useCallback(
    async (card: Card) => {
      onSaveScrollPosition(card.docId);

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

      if (!window.confirm(prompt.message)) return;

      try {
        await onDeleteCard(card.docId);
      } catch (err) {
        console.error('Deletion error:', err);
        alert(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    },
    [onDeleteCard, onSaveScrollPosition]
  );

  const needsCuratedDndKit = studioCuratedTreeDrag || studioCuratedTreeUnparentedRowTarget;

  const tableColGroup = useMemo(
    () => (
      <colgroup>
        {studioCuratedTreeDrag ? <col style={{ width: STUDIO_CURATED_DRAG_COL }} /> : null}
        <col style={{ width: columnWidths.checkbox }} />
        <col
          style={{ width: columnWidths.cover, minWidth: Math.max(columnWidths.cover, COVER_COLUMN_MIN) }}
        />
        <col style={{ width: columnWidths.title }} />
        <col style={{ width: columnWidths.typeDisplayStatus }} />
        <col style={{ width: columnWidths.contentGalleryChildren }} />
        <col className={styles.colTagBarFlex} style={{ minWidth: columnWidths.tagBar }} />
        {hideDimensionMediaSuggestions
          ? null
          : DIMENSION_ORDER.map((dim) => (
              <col key={dim} style={{ width: columnWidths[DIM_COL[dim]] }} />
            ))}
        <col style={{ width: actionsColumnWidth }} />
      </colgroup>
    ),
    [
      actionsColumnWidth,
      columnWidths,
      hideDimensionMediaSuggestions,
      studioCuratedTreeDrag,
    ]
  );

  return (
    <div className={styles.tableContainer}>
      <table className={`${styles.entriesTable} ${styles.entriesTableCardList}`}>
        {tableColGroup}
        <thead>
          <tr>
            {studioCuratedTreeDrag ? (
              <th
                style={{
                  width: STUDIO_CURATED_DRAG_COL,
                  textAlign: 'center',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text2-color)',
                }}
              >
                Drag
              </th>
            ) : null}
            <ResizableHeader width={columnWidths.checkbox} onResize={(w) => handleColumnResize('checkbox', w)}>
              {hideBulkSelectHeader ? (
                <span aria-hidden="true" />
              ) : (
                <input type="checkbox" checked={isAllSelected} onChange={onSelectAll} />
              )}
            </ResizableHeader>
            <ResizableHeader
              width={Math.max(columnWidths.cover, COVER_COLUMN_MIN)}
              minWidth={COVER_COLUMN_MIN}
              onResize={(w) => handleColumnResize('cover', w)}
              thClassName={styles.coverHeaderCell}
            >
              Cover
            </ResizableHeader>
            <ResizableHeader width={columnWidths.title} onResize={(w) => handleColumnResize('title', w)}>
              Title
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.typeDisplayStatus}
              onResize={(w) => handleColumnResize('typeDisplayStatus', w)}
            >
              <div className={styles.tableHeaderStack}>
                <span>Type</span>
                <span>Display</span>
                <span>Status</span>
              </div>
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.contentGalleryChildren}
              onResize={(w) => handleColumnResize('contentGalleryChildren', w)}
            >
              <div className={styles.tableHeaderStack}>
                <span>Content</span>
                <span>Gallery</span>
                <span>Children</span>
              </div>
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.tagBar}
              minWidth={200}
              widthMode="minWidth"
              onResize={(w) => handleColumnResize('tagBar', w)}
            >
              <div className={styles.tableHeaderTagBar} aria-label="Tag bar dimensions">
                {DIMENSION_ORDER.map((dim) => (
                  <span key={dim} className={styles.tableHeaderTagBarDim} title={DIMENSION_LABEL[dim]}>
                    {DIMENSION_LABEL[dim]}
                  </span>
                ))}
              </div>
            </ResizableHeader>
            {hideDimensionMediaSuggestions
              ? null
              : DIMENSION_ORDER.map((dim) => (
                  <ResizableHeader
                    key={dim}
                    width={columnWidths[DIM_COL[dim]]}
                    onResize={(w) => handleColumnResize(DIM_COL[dim], w)}
                  >
                    {DIMENSION_LABEL[dim]}
                  </ResizableHeader>
                ))}
            <ResizableHeader width={actionsColumnWidth} onResize={(w) => handleColumnResize('actions', w)}>
              <div className={styles.tableHeaderStack}>
                <span>Edit</span>
                <span>Delete</span>
              </div>
            </ResizableHeader>
          </tr>
        </thead>
        <tbody>
          {cards.map((card, rowIndex) =>
            needsCuratedDndKit ? (
              <CardAdminListStudioRow
                key={card.docId}
                card={card}
                rowIndex={rowIndex}
                studioCuratedTreeDrag={studioCuratedTreeDrag}
                studioCuratedTreeUnparentedRowTarget={studioCuratedTreeUnparentedRowTarget}
                interactionDisabled={interactionDisabled}
                columnWidths={columnWidths}
                actionsColumnWidth={actionsColumnWidth}
                selectedCardIds={selectedCardIds}
                allTags={allTags}
                secondaryMeta={getCardSecondaryMeta?.(card) ?? null}
                tagMap={tagMap}
                onSelectCard={onSelectCard}
                onUpdateCard={onUpdateCard}
                handleEditClick={handleEditClick}
                getMediaSuggestionTags={getMediaSuggestionTags}
                applyDimensionSuggestions={applyDimensionSuggestions}
                confirmAndDeleteCard={confirmAndDeleteCard}
                hideDimensionMediaSuggestions={hideDimensionMediaSuggestions}
              />
            ) : (
              <CardAdminListPlainRow
                key={card.docId}
                card={card}
                rowIndex={rowIndex}
                interactionDisabled={interactionDisabled}
                columnWidths={columnWidths}
                actionsColumnWidth={actionsColumnWidth}
                selectedCardIds={selectedCardIds}
                allTags={allTags}
                secondaryMeta={getCardSecondaryMeta?.(card) ?? null}
                tagMap={tagMap}
                onSelectCard={onSelectCard}
                onUpdateCard={onUpdateCard}
                handleEditClick={handleEditClick}
                getMediaSuggestionTags={getMediaSuggestionTags}
                applyDimensionSuggestions={applyDimensionSuggestions}
                confirmAndDeleteCard={confirmAndDeleteCard}
                hideDimensionMediaSuggestions={hideDimensionMediaSuggestions}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
