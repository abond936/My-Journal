'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/card-admin/card-admin.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import EditableTitleCell from './EditableTitleCell';
import EditableDisplayModeCell from './EditableDisplayModeCell';
import EditableTypeCell from './EditableTypeCell';
import EditableStatusCell from './EditableStatusCell';
import ResizableHeader from './ResizableHeader';
import { getCoreTagsByDimension } from '@/lib/utils/tagDisplay';

const COLUMN_WIDTHS_KEY = 'cardAdminColumnWidths';
const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 40,
  cover: 60,
  title: 200,
  type: 100,
  status: 100,
  display: 100,
  content: 80,
  gallery: 80,
  children: 80,
  who: 150,
  what: 150,
  when: 150,
  where: 150,
  reflection: 150,
  actions: 120
};

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

// Helper function to get tags for a dimension
const getDimensionTags = (card: Card, dimension: 'who' | 'what' | 'when' | 'where' | 'reflection', allTags: Tag[]) => {
  const dimensionTagIds = card[dimension] || [];
  return dimensionTagIds
    .map(id => allTags.find(t => t.docId === id))
    .filter((tag): tag is Tag => tag !== undefined);
};

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

  // Map of tagId -> tag name for quick lookup
  const tagMap = React.useMemo(() => new Map(allTags.map(t => [t.docId!, t.name])), [allTags]);

  // Column width management
  const [columnWidths, setColumnWidths] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS;
    const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
    return saved ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COLUMN_WIDTHS;
  });

  const handleColumnResize = useCallback((columnId: keyof typeof DEFAULT_COLUMN_WIDTHS, width: number) => {
    setColumnWidths(prev => {
      const updated = { ...prev, [columnId]: width };
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleEditClick = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/card-admin/${cardId}/edit`);
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.entriesTable}>
        <thead>
          <tr>
            <ResizableHeader width={columnWidths.checkbox} onResize={(w) => handleColumnResize('checkbox', w)}>
              <input type="checkbox" checked={isAllSelected} onChange={onSelectAll} />
            </ResizableHeader>
            <ResizableHeader width={columnWidths.cover} onResize={(w) => handleColumnResize('cover', w)}>
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
            <ResizableHeader width={columnWidths.who} onResize={(w) => handleColumnResize('who', w)}>
              Who
            </ResizableHeader>
            <ResizableHeader width={columnWidths.what} onResize={(w) => handleColumnResize('what', w)}>
              What
            </ResizableHeader>
            <ResizableHeader width={columnWidths.when} onResize={(w) => handleColumnResize('when', w)}>
              When
            </ResizableHeader>
            <ResizableHeader width={columnWidths.where} onResize={(w) => handleColumnResize('where', w)}>
              Where
            </ResizableHeader>
            <ResizableHeader width={columnWidths.reflection} onResize={(w) => handleColumnResize('reflection', w)}>
              Reflection
            </ResizableHeader>
            <ResizableHeader width={columnWidths.actions} onResize={(w) => handleColumnResize('actions', w)}>
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
                  <Image 
                    src={getDisplayUrl(card.coverImage)} 
                    alt="Cover"
                    className={styles.coverThumbnail}
                    width={60}
                    height={60}
                    sizes="60px"
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
              {
                (() => {
                  const core = getCoreTagsByDimension(card);
                  const render = (ids: string[]) => ids.map(id => (
                    <span key={id} className={styles.tag}>{tagMap.get(id) ?? id}</span>
                  ));
                  return (
                    <>
                      <td style={{ width: columnWidths.who }}>
                        <div className={styles.tags}>{render(core.who)}</div>
                      </td>
                      <td style={{ width: columnWidths.what }}>
                        <div className={styles.tags}>{render(core.what)}</div>
                      </td>
                      <td style={{ width: columnWidths.when }}>
                        <div className={styles.tags}>{render(core.when)}</div>
                      </td>
                      <td style={{ width: columnWidths.where }}>
                        <div className={styles.tags}>{render(core.where)}</div>
                      </td>
                      <td style={{ width: columnWidths.reflection }}>
                        <div className={styles.tags}>{render(core.reflection)}</div>
                      </td>
                    </>
                  );
                })()
              }
              <td style={{ width: columnWidths.actions }}>
                <button
                  onClick={() => handleEditClick(card.docId)}
                  className={styles.actionButton}
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    // Save scroll position before potential deletion
                    onSaveScrollPosition(card.docId);
                    
                    // Check for parent cards
                    const params = new URLSearchParams({ childrenIds_contains: card.docId });
                    const response = await fetch(`/api/cards?${params.toString()}`);
                    if (!response.ok) {
                      alert('Could not verify parent cards.');
                      return;
                    }
                    
                    const parentCardsResult = await response.json();
                    const parentCards = parentCardsResult.items;

                    let confirmMessage = 'Are you sure you want to delete this card? This action cannot be undone.';
                    if (parentCards.length > 0) {
                      const parentTitles = parentCards.map((p: Card) => p.title).join(', ');
                      confirmMessage = `WARNING: This card is a child of the following cards: ${parentTitles}.\n\nDeleting it will remove it from these collections. Are you sure you want to proceed?`;
                    }

                    if (window.confirm(confirmMessage)) {
                      try {
                        await onDeleteCard(card.docId);
                      } catch (err) {
                        console.error('Deletion error:', err);
                        alert(err instanceof Error ? err.message : 'An unknown error occurred.');
                      }
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
    </div>
  );
} 