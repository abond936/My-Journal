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
  
  // Fetch initial data using SWR. This is the single source of truth.
  const { 
    data: card, 
    error: cardError, 
    isLoading: isCardLoading, 
    mutate: mutateCard 
  } = useSWR<Card | null>(
    cardId ? `/api/cards/${cardId}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const { 
    data: tagsData, 
    error: tagsError, 
    isLoading: areTagsLoading 
  } = useSWR<Tag[]>(
    '/api/tags', 
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSave = async (cardData: CardUpdate) => {
    try {
      const url = cardId ? `/api/cards/${cardId}` : '/api/cards';
      const method = cardId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });

      const savedData = await response.json();

      if (!response.ok) {
        throw new Error('Failed to save the card.');
      }

      // Update the local SWR cache with the saved data without re-fetching.
      mutateCard(savedData, false);
      
      // If a new card was created, navigate to its new edit page.
      if (!cardId) {
        router.push(`/admin/card-admin/${savedData.id}`);
      }

    } catch (error) {
      console.error('Failed to save card:', error);
      throw error;
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
        confirmMessage = `WARNING: This card is a child of the following cards: ${parentTitles}.\n\nDeleting it will remove it from these collections. Are you sure you want to proceed?`;
      }

      if (window.confirm(confirmMessage)) {
        const deleteResponse = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete card.');
        }
        // Save the card ID for scroll position restoration
        sessionStorage.setItem('scrollToCardId', cardId);
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

  const handleCancel = () => {
    // If we have a card ID, it means we're editing an existing card, so we can just navigate away
    if (cardId) {
      router.push('/admin/card-admin');
      return;
    }

    // For new cards, confirm before leaving
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/admin/card-admin');
    }
  };

  const isLoading = isCardLoading || areTagsLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (cardError || tagsError) {
    return <div>Error loading data. {cardError?.message} {tagsError?.message}</div>;
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
          <button 
            type="button" 
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="card-form" 
            className={styles.submitButton}
          >
            {cardId ? 'Save' : 'Create Card'}
          </button>
        </div>
      </div>
      <CardFormProvider
        initialCard={card}
        allTags={tagsData || []}
        onSave={handleSave}
      >
        <CardForm
          onDelete={handleDelete}
        />
      </CardFormProvider>
    </div>
  );
} 