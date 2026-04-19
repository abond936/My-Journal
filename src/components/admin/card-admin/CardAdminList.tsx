'use client';

import React, { useCallback, useState } from 'react';
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
import EditModal from './EditModal';
import MacroTagSelector from './MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';

const COLUMN_WIDTHS_KEY = 'cardAdminColumnWidths';
const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 40,
  cover: 90,
  title: 200,
  type: 100,
  status: 100,
  display: 100,
  content: 80,
  gallery: 80,
  children: 80,
  dimensionTags: 600,
  actions: 280
};

function loadColumnWidths(): typeof DEFAULT_COLUMN_WIDTHS {
  if (typeof window === 'undefined') return { ...DEFAULT_COLUMN_WIDTHS };
  const raw = localStorage.getItem(COLUMN_WIDTHS_KEY);
  if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const merged = { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
    if (!parsed.dimensionTags && (parsed.who || parsed.what || parsed.when || parsed.where)) {
      merged.dimensionTags =
        (parsed.who ?? 150) + (parsed.what ?? 150) + (parsed.when ?? 150) + (parsed.where ?? 150);
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
  onSelectCard: (cardId: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

export default function CardAdminList({
  cards,
  selectedCardIds,
  allTags,
  onSelectCard,
  onSelectAll,
  onSaveScrollPosition,
  onUpdateCard,
  onDeleteCard,
}: CardAdminListProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;
  const [tagsEditCard, setTagsEditCard] = useState<Card | null>(null);
  const [savingTags, setSavingTags] = useState(false);

  // Map of tagId -> tag name for quick lookup
  const tagMap = React.useMemo(() => new Map(allTags.map(t => [t.docId!, t.name])), [allTags]);

  // Column width management
  const [columnWidths, setColumnWidths] = useState(loadColumnWidths);

  const handleColumnResize = useCallback((columnId: keyof typeof DEFAULT_COLUMN_WIDTHS, width: number) => {
    setColumnWidths(prev => {
      const updated = { ...prev, [columnId]: width };
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);
  const actionsColumnWidth = Math.max(columnWidths.actions, 280);

  const handleEditClick = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/card-admin/${cardId}/edit`);
  };

  const selectedTagObjectsForModal = React.useMemo(() => {
    if (!tagsEditCard) return [];
    const selected = new Set(tagsEditCard.tags || []);
    return allTags.filter((tag) => selected.has(tag.docId));
  }, [allTags, tagsEditCard]);

  const openTagsEditor = useCallback(
    async (card: Card) => {
      setSavingTags(true);
      try {
        const response = await fetch(`/api/cards/${card.docId}`, { cache: 'no-store' });
        if (!response.ok) {
          setTagsEditCard(card);
          return;
        }
        const latest = (await response.json()) as Card;
        setTagsEditCard({
          ...card,
          ...latest,
          docId: card.docId,
        });
      } catch {
        setTagsEditCard(card);
      } finally {
        setSavingTags(false);
      }
    },
    []
  );

  const resolvedTagDimensionById = React.useMemo(
    () => buildResolvedTagDimensionMap(allTags),
    [allTags]
  );

  const getDirectTagsByDimension = useCallback(
    (card: Card, dimension: 'who' | 'what' | 'when' | 'where') =>
      (card.tags || []).filter((tagId) => resolvedTagDimensionById.get(tagId) === dimension),
    [resolvedTagDimensionById]
  );

  const getMediaSuggestionTags = useCallback(
    (card: Card, dimension: 'who' | 'what' | 'when' | 'where') => {
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
    async (card: Card, dimension: 'who' | 'what' | 'when' | 'where') => {
      const suggestions = getMediaSuggestionTags(card, dimension);
      if (!suggestions.length) return;
      const nextTags = new Set(card.tags || []);
      suggestions.forEach((tagId) => nextTags.add(tagId));
      await onUpdateCard(card.docId, { tags: Array.from(nextTags) });
    },
    [getMediaSuggestionTags, onUpdateCard]
  );

  return (
    <div className={styles.tableContainer}>
      <table className={styles.entriesTable}>
        <thead>
          <tr>
            <ResizableHeader width={columnWidths.checkbox} onResize={(w) => handleColumnResize('checkbox', w)}>
              <input type="checkbox" checked={isAllSelected} onChange={onSelectAll} />
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.cover}
              onResize={(w) => handleColumnResize('cover', w)}
              thClassName={styles.coverHeaderCell}
            >
              Cover
            </ResizableHeader>
            <ResizableHeader width={columnWidths.title} onResize={(w) => handleColumnResize('title', w)}>
              Title
            </ResizableHeader>
            <ResizableHeader width={columnWidths.type} onResize={(w) => handleColumnResize('type', w)}>
              Type
            </ResizableHeader>
            <ResizableHeader width={columnWidths.status} onResize={(w) => handleColumnResize('status', w)}>
              Status
            </ResizableHeader>
            <ResizableHeader width={columnWidths.display} onResize={(w) => handleColumnResize('display', w)}>
              Display
            </ResizableHeader>
            <ResizableHeader width={columnWidths.content} onResize={(w) => handleColumnResize('content', w)}>
              Content
            </ResizableHeader>
            <ResizableHeader width={columnWidths.gallery} onResize={(w) => handleColumnResize('gallery', w)}>
              Gallery
            </ResizableHeader>
            <ResizableHeader width={columnWidths.children} onResize={(w) => handleColumnResize('children', w)}>
              Children
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.dimensionTags}
              minWidth={320}
              onResize={(w) => handleColumnResize('dimensionTags', w)}
            >
              Tags (Who · What · When · Where)
            </ResizableHeader>
            <ResizableHeader width={actionsColumnWidth} onResize={(w) => handleColumnResize('actions', w)}>
              Actions
            </ResizableHeader>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.docId} id={`card-${card.docId}`} className={selectedCardIds.has(card.docId) ? styles.selectedRow : ''}>
              <td style={{ width: columnWidths.checkbox }}>
                <input
                  type="checkbox"
                  checked={selectedCardIds.has(card.docId)}
                  onChange={() => onSelectCard(card.docId)}
                />
              </td>
              <td className={styles.coverImageCell} style={{ width: columnWidths.cover }}>
                {card.coverImage ? (
                  <JournalImage 
                    src={getDisplayUrl(card.coverImage)} 
                    alt="Cover"
                    className={styles.coverThumbnail}
                    width={256}
                    height={256}
                    sizes={`${columnWidths.cover}px`}
                  />
                ) : (
                  <span className={styles.noCover}>—</span>
                )}
              </td>
              <td style={{ width: columnWidths.title }}>
                <EditableTitleCell card={card} onUpdate={onUpdateCard} />
              </td>
              <td style={{ width: columnWidths.type }}>
                <EditableTypeCell card={card} onUpdate={onUpdateCard} />
              </td>
              <td style={{ width: columnWidths.status }}>
                <EditableStatusCell card={card} onUpdate={onUpdateCard} />
              </td>
              <td style={{ width: columnWidths.display }}>
                <EditableDisplayModeCell card={card} onUpdate={onUpdateCard} />
              </td>
              <td style={{ width: columnWidths.content }}>{card.content ? 'Y' : 'N'}</td>
              <td style={{ width: columnWidths.gallery }}>{card.galleryMedia?.length || 0}</td>
              <td style={{ width: columnWidths.children }}>{card.childrenIds?.length || 0}</td>
              <td className={styles.tableTagCommandCell} style={{ width: columnWidths.dimensionTags }}>
                <CardDimensionalTagCommandBar
                  card={card}
                  allTags={allTags}
                  variant="compact"
                  onUpdateTags={(next) => onUpdateCard(card.docId, { tags: next })}
                />
                <div className={styles.tableMediaDimGrid}>
                  {DIMENSION_ORDER.map((dimension) => {
                    const suggestionIds = getMediaSuggestionTags(card, dimension);
                    const hasSuggestions = suggestionIds.length > 0;
                    return (
                      <div key={dimension} className={styles.tableMediaDimCell}>
                        <div className={styles.tableMediaDimLabel}>{DIMENSION_LABEL[dimension]}</div>
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
                          Apply {dimension}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </td>
              <td style={{ width: actionsColumnWidth, minWidth: actionsColumnWidth }}>
                <button
                  onClick={() => handleEditClick(card.docId)}
                  className={styles.actionButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => void openTagsEditor(card)}
                  className={styles.actionButton}
                  disabled={savingTags}
                >
                  Tags
                </button>
                <button
                  onClick={async () => {
                    // Save scroll position before potential deletion
                    onSaveScrollPosition(card.docId);

                    let parentCards: Card[] = [];
                    let verificationFailed = false;
                    try {
                      const params = new URLSearchParams({
                        childrenIds_contains: card.docId,
                        status: 'all',
                        limit: '200',
                      });
                      const response = await fetch(`/api/cards?${params.toString()}`);
                      if (!response.ok) {
                        verificationFailed = true;
                      } else {
                        const parentCardsResult = (await response.json()) as { items?: Card[] };
                        parentCards = Array.isArray(parentCardsResult.items) ? parentCardsResult.items : [];
                      }
                    } catch {
                      verificationFailed = true;
                    }

                    let confirmMessage = 'Are you sure you want to delete this card? This action cannot be undone.';
                    if (parentCards.length > 0) {
                      const parentTitles = parentCards.map((p: Card) => p.title || '(Untitled)').join(', ');
                      confirmMessage = `WARNING: This card is a child of the following cards: ${parentTitles}.\n\nDeleting it will remove it from these collections. Are you sure you want to proceed?`;
                    } else if (verificationFailed) {
                      confirmMessage =
                        'Could not verify parent cards right now.\n\nYou can still delete; parent cleanup is handled server-side.\n\nProceed with delete?';
                    }

                    if (!window.confirm(confirmMessage)) return;

                    try {
                      await onDeleteCard(card.docId);
                    } catch (err) {
                      console.error('Deletion error:', err);
                      alert(err instanceof Error ? err.message : 'An unknown error occurred.');
                    }
                  }}
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tagsEditCard ? (
        <EditModal
          isOpen={true}
          onClose={() => {
            if (!savingTags) setTagsEditCard(null);
          }}
          title={`Edit Tags: ${tagsEditCard.title || '(No title)'}`}
        >
          <MacroTagSelector
            selectedTags={selectedTagObjectsForModal}
            allTags={allTags}
            startExpanded
            onRequestClose={() => setTagsEditCard(null)}
            onChange={() => {
              // no-op, save goes through onSaveSelection
            }}
            onSaveSelection={async (newIds) => {
              setSavingTags(true);
              try {
                await onUpdateCard(tagsEditCard.docId, { tags: newIds });
                setTagsEditCard(null);
              } finally {
                setSavingTags(false);
              }
            }}
          />
        </EditModal>
      ) : null}
    </div>
  );
} 