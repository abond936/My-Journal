'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import { useCardContext } from '@/components/providers/CardProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import styles from './card-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { buildDimensionTree } from '@/lib/utils/tagUtils';
import CardAdminList from '@/components/admin/card-admin/CardAdminList';
import BulkEditTagsModal from '@/components/admin/card-admin/BulkEditTagsModal';

const SCROLL_POSITION_KEY = 'adminCardListScrollPos';

export default function AdminCardsPage() {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);

  const { 
    tags: allTags, 
    loading: tagsLoading, 
  } = useTag();

  const {
    cards,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
    searchTerm,
    status,
    cardType,
    setSearchTerm,
    setStatus,
    setCardType,
    setPageLimit,
    isValidating,
  } = useCardContext();

  // Set the desired page limit for the admin section
  useEffect(() => {
    setPageLimit(50);
    // On unmount, reset to the default
    return () => {
      setPageLimit(20);
    };
  }, [setPageLimit]);

  const dimensionalTree = useMemo(() => {
    if (!allTags) return {};
    return buildDimensionTree(allTags);
  }, [allTags]);

  // --- Scroll Restoration ---
  const prevIsValidating = useRef(true);
  
  useEffect(() => {
    if (prevIsValidating.current && !isValidating) {
      const cardId = sessionStorage.getItem('scrollToCardId');
      if (cardId) {
        const element = document.getElementById(`card-${cardId}`);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sessionStorage.removeItem('scrollToCardId');
          }, 100);
        }
      }
    }
    prevIsValidating.current = isValidating;
  }, [isValidating]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedCardIds(new Set());
  }, [searchTerm, status, cardType]);

  const onSaveScrollPosition = useCallback((cardId: string) => {
    sessionStorage.setItem('scrollToCardId', cardId);
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(cards.map(c => c.docId));
      setSelectedCardIds(allIds);
    } else {
      setSelectedCardIds(new Set());
    }
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleBulkUpdate = async (field: keyof Card, value: any) => {
    const confirmMessage = `Are you sure you want to update ${field} for ${selectedCardIds.size} selected cards?`;
    if (!confirm(confirmMessage)) return;
    
    const updates = Array.from(selectedCardIds).map(id => ({
      id,
      update: { [field]: value }
    }));
    
    try {
      await Promise.all(
        updates.map(({ id, update }) =>
          fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          })
        )
      );
      mutate(undefined, { revalidate: true }); // Revalidate from server
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      alert(`An error occurred while updating ${field}. Reverting changes.`);
      mutate(undefined, { revalidate: true }); // Revert on error
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCardIds.size} cards?`)) return;
    
    const idsToDelete = Array.from(selectedCardIds);
    setSelectedCardIds(new Set());
    
    try {
      await Promise.all(idsToDelete.map(id => fetch(`/api/cards/${id}`, { method: 'DELETE' })));
      mutate(undefined, { revalidate: true }); // Revalidate after deleting
    } catch (err) {
      console.error('Error deleting cards:', err);
      alert('An error occurred while deleting cards. Reverting changes.');
      mutate(undefined, { revalidate: true });
    }
  };

  const handleUpdateCard = async (cardId: string, updateData: Partial<Card>) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update card.');
      }
      // Optimistic update can be tricky, so we revalidate from server
      await mutate(undefined, { revalidate: true });
    } catch (err) {
      console.error(`Error updating card ${cardId}:`, err);
      // It's good practice to inform the user and maybe revert UI changes
      alert(`An error occurred while updating the card. Please refresh and try again.`);
      // Re-fetch data to ensure UI consistency
      await mutate(undefined, { revalidate: true });
      throw err; // Re-throw to allow caller to handle it
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete card.');
      }
      // Refresh the list without page reload
      await mutate(undefined, { revalidate: true });
    } catch (err) {
      console.error(`Error deleting card ${cardId}:`, err);
      throw err; // Re-throw to allow caller to handle it
    }
  };

  if (isLoading || tagsLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>{error.message || 'Failed to load cards.'}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cards Management</h1>
      </div>

      <div className={styles.filterSection}>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchBox}
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value as typeof status)}
          className={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={cardType}
          onChange={e => setCardType(e.target.value as typeof cardType)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="story">Story</option>
          <option value="qa">Q&A</option>
          <option value="quote">Quote</option>
          <option value="callout">Callout</option>
          <option value="gallery">Gallery</option>
        </select>
      </div>
      
      <div className={styles.bulkActions}>
        <span>
          {selectedCardIds.size === 0 
            ? "No cards selected" 
            : `${selectedCardIds.size} cards selected`}
        </span>
        <div className={styles.actions}>
          <select
            onChange={e => handleBulkUpdate('status', e.target.value)}
            className={styles.filterSelect}
            defaultValue=""
            disabled={selectedCardIds.size === 0}
          >
            <option value="" disabled>Update Status</option>
            <option value="draft">Set to Draft</option>
            <option value="published">Set to Published</option>
          </select>
          <button 
            onClick={() => setIsBulkTagModalOpen(true)} 
            className={styles.actionButton}
            disabled={selectedCardIds.size === 0}
          >
            Edit Tags
          </button>
          <button 
            onClick={handleBulkDelete} 
            className={`${styles.actionButton} ${styles.deleteButton}`}
            disabled={selectedCardIds.size === 0}
          >
            Delete Selected
          </button>
        </div>
      </div>

      <CardAdminList
        cards={cards}
        selectedCardIds={selectedCardIds}
        allTags={allTags || []}
        onSelectCard={handleSelectCard}
        onSelectAll={handleSelectAll}
        onSaveScrollPosition={onSaveScrollPosition}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
      />

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button onClick={loadMore} disabled={isLoadingMore} className={styles.loadMoreButton}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      <BulkEditTagsModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        cardIds={Array.from(selectedCardIds)}
        onSave={() => mutate(undefined, { revalidate: true })}
      />
    </div>
  );
}
