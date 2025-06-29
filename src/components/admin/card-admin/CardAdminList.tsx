'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/card-admin/card-admin.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';

interface CardAdminListProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  allTags: Tag[];
  onSelectCard: (cardId: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveScrollPosition: (cardId: string) => void;
}

export default function CardAdminList({
  cards,
  selectedCardIds,
  allTags,
  onSelectCard,
  onSelectAll,
  onSaveScrollPosition,
}: CardAdminListProps) {
  const router = useRouter();
  const isAllSelected = cards.length > 0 && selectedCardIds.size === cards.length;

  const handleEditClick = (cardId: string) => {
    onSaveScrollPosition(cardId);
    router.push(`/admin/card-admin/${cardId}/edit`);
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.entriesTable}>
        <thead>
          <tr>
            <th><input type="checkbox" checked={isAllSelected} onChange={onSelectAll} /></th>
            <th>Cover</th>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.id} id={`card-${card.id}`} className={selectedCardIds.has(card.id) ? styles.selectedRow : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedCardIds.has(card.id)}
                  onChange={() => onSelectCard(card.id)}
                />
              </td>
              <td className={styles.coverImageCell}>
                {card.coverImage ? (
                  <img 
                    src={getDisplayUrl(card.coverImage)} 
                    alt="Cover"
                    className={styles.coverThumbnail}
                  />
                ) : (
                  <span className={styles.noCover}>—</span>
                )}
              </td>
              <td>{card.title}</td>
              <td>{card.type}</td>
              <td>{card.status}</td>
              <td>
                <div className={styles.tags}>
                  {(card.tags || []).map(tagId => {
                    const tag = allTags.find(t => t.id === tagId);
                    return tag ? <span key={tag.id} className={styles.tag}>{tag.name}</span> : null;
                  })}
                </div>
              </td>
              <td className={styles.actions}>
                <button
                  onClick={() => handleEditClick(card.id)}
                  className={styles.actionButton}
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    // Save scroll position before potential deletion
                    onSaveScrollPosition(card.id);
                    
                    // Check for parent cards
                    const params = new URLSearchParams({ childrenIds_contains: card.id });
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
                        const deleteResponse = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
                        if (!deleteResponse.ok) {
                          throw new Error('Failed to delete card.');
                        }
                        // Refresh the list
                        window.location.reload();
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