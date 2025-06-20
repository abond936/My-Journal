'use client';

import React, { useState } from 'react';
import { Card } from '@/lib/types/card';
import CardForm from '@/components/admin/card-admin/CardForm';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from '@/components/admin/card-admin/CardForm.module.css'; // Re-use styles for buttons

interface CardAdminClientPageProps {
  cardId: string | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CardAdminClientPage({ cardId }: CardAdminClientPageProps) {
  const router = useRouter();
  const { data: card, error, isLoading } = useSWR<Card | null>(
    cardId ? `/api/cards/${cardId}` : null,
    fetcher
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSave = async (cardData: Partial<Card>) => {
    try {
      let response;
      if (cardId) {
        // Update existing card
        response = await fetch(`/api/cards/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardData),
        });
      } else {
        // Create new card
        response = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save the card.');
      }

      // Redirect to the main admin page on success
      router.push('/admin/card-admin');
      router.refresh(); // Invalidate client cache
    } catch (error) {
      console.error('Failed to save card:', error);
    }
  };

  const handleCancel = () => {
    router.push('/admin/card-admin');
  };

  const handleDelete = async () => {
    if (!cardId) return;

    setIsDeleting(true);
    try {
      const params = new URLSearchParams({ childrenIds_contains: cardId });
      const response = await fetch(`/api/cards?${params.toString()}`);
      if (!response.ok) throw new Error('Could not verify parent cards.');
      
      const parentCardsResult: PaginatedResult<Card> = await response.json();
      const parentCards = parentCardsResult.items;

      let confirmMessage = 'Are you sure you want to delete this card? This action cannot be undone.';
      if (parentCards.length > 0) {
        const parentTitles = parentCards.map(p => p.title).join(', ');
        confirmMessage = `WARNING: This card is a child of the following cards: ${parentTitles}.\\n\\nDeleting it will remove it from these collections. Are you sure you want to proceed?`;
      }

      if (window.confirm(confirmMessage)) {
        const deleteResponse = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete card.');
        }
        router.push('/admin/card-admin');
        router.refresh();
      }
    } catch (err) {
      console.error('Deletion error:', err);
      alert(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div>Error loading card data.</div>;
  }
  
  return (
    <div>
      <div className={styles.formHeader}>
        <h1>{cardId ? 'Edit Card' : 'Create New Card'}</h1>
        <div className={styles.actions}>
          {cardId && (
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteOutlineButton}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={handleCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" form="card-form" className={styles.submitButton}>
            {cardId ? 'Save' : 'Create Card'}
          </button>
        </div>
      </div>
      <CardForm
        initialCard={card || null}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    </div>
  );
} 