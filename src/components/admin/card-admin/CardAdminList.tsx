'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/card-admin/card-admin.module.css';

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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 