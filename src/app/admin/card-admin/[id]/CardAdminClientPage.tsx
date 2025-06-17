'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import CardForm from '@/components/admin/card-admin/CardForm';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div>Error loading card data.</div>;
  }
  
  return (
    <div>
      <h1>{card ? `Edit Card: ${card.title}` : 'Create New Card'}</h1>
      <CardForm initialCard={card || null} onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
} 