'use client';

import React from 'react';
import { Card, CardUpdate } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import CardForm from '@/components/admin/card-admin/CardForm';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './page.module.css';
import { PaginatedResult } from '@/lib/types/services';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import CardEditPageChrome from './CardEditPageChrome';
import { getSafeReaderReturnTo } from '@/lib/utils/readerReturnTo';

const UPDATED_CARD_KEY = 'updatedCardState';

interface CardAdminClientPageProps {
  cardId: string | null;
}

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then((res) => res.json());

export default function CardAdminClientPage({ cardId }: CardAdminClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readerReturnTo = getSafeReaderReturnTo(searchParams.get('returnTo'));
  
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
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const handleSave = async (cardData: CardUpdate) => {
    try {
      const url = cardId ? `/api/cards/${cardId}` : '/api/cards';
      const method = cardId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
        cache: 'no-store',
      });

      const savedData = await response.json();

      if (!response.ok) {
        throw new Error('Failed to save the card.');
      }

      // Update cache with server response; skip revalidate to avoid stale refetch overwriting
      mutateCard(savedData, false);

      // Invalidate list/search caches and revalidate so they refetch fresh data
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
        undefined,
        { revalidate: true }
      );
      
      // If a new card was created, navigate to its new edit page.
      if (!cardId) {
        router.push(`/admin/card-admin/${savedData.docId}`);
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

  const handleDuplicate = async () => {
    if (!cardId) return;
    if (!window.confirm('Create a copy of this card? The duplicate will be saved as a draft.')) return;

    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/cards/${cardId}/duplicate`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to duplicate card.');
      }
      const newCard = await response.json();
      const editUrl =
        readerReturnTo != null
          ? `/admin/card-admin/${newCard.docId}/edit?returnTo=${encodeURIComponent(readerReturnTo)}`
          : `/admin/card-admin/${newCard.docId}/edit`;
      router.push(editUrl);
    } catch (err) {
      console.error('Duplicate error:', err);
      alert(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsDuplicating(false);
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
    <div className={styles.editPage}>
      <CardFormProvider
        initialCard={card ?? null}
        allTags={tagsData || []}
        onSave={handleSave}
      >
        <CardEditPageChrome
          cardId={cardId}
          readerReturnTo={readerReturnTo}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          isDeleting={isDeleting}
          isDuplicating={isDuplicating}
        />
        <CardForm />
      </CardFormProvider>
    </div>
  );
} 