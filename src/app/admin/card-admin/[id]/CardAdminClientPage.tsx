'use client';

import React from 'react';
import { Card, CardUpdate } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import CardForm from '@/components/admin/card-admin/CardForm';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './page.module.css';
import { useCardContext } from '@/components/providers/CardProvider';
import { PaginatedResult } from '@/lib/types/services';
import { CardFormProvider } from '@/components/providers/CardFormProvider';

const UPDATED_CARD_KEY = 'updatedCardState';

interface CardAdminClientPageProps {
  cardId: string | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CardAdminClientPage({ cardId }: CardAdminClientPageProps) {
  const router = useRouter();
  const { mutate } = useCardContext();
  
  const { data: card, error: cardError, isLoading: isCardLoading } = useSWR<Card | null>(
    cardId ? `/api/cards/${cardId}` : null,
    fetcher
  );

  const { data: tagsData, error: tagsError, isLoading: areTagsLoading } = useSWR<Tag[]>(
    '/api/tags', 
    fetcher
  );
  
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSave = async (cardData: CardUpdate, tags: Tag[]) => {
    try {
      const body = { 
        ...cardData, 
        tagIds: tags.map(t => t.id) // Pass tag IDs for the backend to process
      };

      const url = cardId ? `/api/cards/${cardId}` : '/api/cards';
      const method = cardId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save the card.');
      }

      // Revalidate all data and redirect
      await globalMutate(() => true, undefined, { revalidate: true });
      router.push('/admin/card-admin');

    } catch (error) {
      console.error('Failed to save card:', error);
      throw error; // Re-throw to let the form handle the error
    }
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

  const isLoading = isCardLoading || areTagsLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (cardError || tagsError) {
    return <div>Error loading data. {cardError?.message} {tagsError?.message}</div>;
  }
  
  // This page is also used for creating new cards, so `card` can be null.
  // The CardForm is designed to handle this case.
  const allTags = tagsData || [];

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
          <button type="button" onClick={handleDelete} className={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" form="card-form" className={styles.submitButton}>
            {cardId ? 'Save' : 'Create Card'}
          </button>
        </div>
      </div>
      <CardFormProvider
        initialCard={card}
        allTags={allTags}
        onSave={handleSave}
      >
        <CardForm
          initialCard={card}
          allTags={allTags}
          onDelete={handleDelete}
        />
      </CardFormProvider>
    </div>
  );
} 