'use client';

import React from 'react';
import JournalImage from '@/components/common/JournalImage';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './CardAdminGrid.module.css';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';

interface CardAdminGridProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  allTags: Tag[];
  onSelectCard: (cardId: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

interface CardAdminGridCellProps {
  card: Card;
  isSelected: boolean;
  allTags: Tag[];
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CardAdminGridCell({
  card,
  isSelected,
  allTags,
  onUpdateCard,
  onSelect,
  onEdit,
  onDelete,
}: CardAdminGridCellProps) {
  return (
    <div
      id={`card-${card.docId}`}
      className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(`.${styles.checkboxWrap}`) || (e.target as HTMLElement).closest(`.${styles.deleteBtn}`)) return;
        onEdit();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, textarea, button, [role="listbox"]')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className={styles.checkboxWrap} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select ${card.title || 'Untitled'}`}
        />
      </div>
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
      <div className={styles.thumbnailWrap}>
        {card.coverImage ? (
          <JournalImage
            src={getDisplayUrl(card.coverImage)}
            alt={card.title || 'Cover'}
            fill
            className={styles.thumbnail}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
          />
        ) : (
          <div className={styles.noCover}>No cover</div>
        )}
        <div className={styles.badges}>
          <span className={styles.typeBadge}>{card.type}</span>
          <span className={`${styles.statusBadge} ${styles[card.status]}`}>{card.status}</span>
        </div>
      </div>
      <div className={styles.title} title={card.title}>
        {card.title || 'Untitled'}
      </div>
      <div className={styles.inlineEditorWrap}>
        <CardDimensionalTagCommandBar
          card={card}
          allTags={allTags}
          variant="compact"
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
}: CardAdminGridProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;

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
      {cards.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      )}
      <div className={styles.grid}>
        {cards.map((card) => (
          <CardAdminGridCell
            key={card.docId}
            card={card}
            isSelected={selectedCardIds.has(card.docId)}
            allTags={allTags}
            onUpdateCard={onUpdateCard}
            onSelect={() => onSelectCard(card.docId)}
            onEdit={() => handleEdit(card.docId)}
            onDelete={() => handleDelete(card)}
          />
        ))}
      </div>
      {cards.length === 0 && (
        <div className={styles.emptyState}>
          <p>No cards found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}
