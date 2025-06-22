'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTag } from '@/components/providers/TagProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import styles from './card-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useSWR from 'swr';
import { useCards } from '@/lib/hooks/useCards';
import { buildTagTree } from '@/lib/utils/tagUtils';
import CardAdminList from '@/components/admin/card-admin/CardAdminList';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const dimensions: Tag['dimension'][] = ['who', 'what', 'when', 'where', 'reflection'];

const renderCardAdminTagOption = (tag: any, level: number = 0) => {
  const padding = level * 4;
  return (
    <React.Fragment key={tag.id}>
      <option value={tag.id} style={{ paddingLeft: `${padding}px` }}>
        {'—'.repeat(level)} {tag.name}
      </option>
      {tag.children && tag.children.length > 0 && tag.children.map((child: any) => renderCardAdminTagOption(child, level + 1))}
    </React.Fragment>
  );
};

export default function AdminCardsPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Card['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Card['type'] | 'all'>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const tags = searchParams.get('tags')?.split(',');

  const { 
    cards, 
    error, 
    isLoading, 
    isLoadingMore, 
    hasMore, 
    loadMore, 
    mutate: mutateCards,
    updateCardInCache,
    removeCardFromCache,
    saveStateToSession
  } = useCards({
    searchTerm,
    status: statusFilter,
    type: typeFilter,
    tags: tags,
    limit: 50,
  });

  const { tags: allTags, loading: tagsLoading } = useTag();
  // const { data: statsData, error: statsError, mutate: mutateStats } = useSWR('/api/statistics/cards', fetcher);

  const dimensionalTree = useMemo(() => {
    if (!allTags) return [];
    return buildTagTree(allTags);
  }, [allTags]);

  const lastScrollY = useRef(0);

  // Clear selection when filters change to avoid confusion
  useEffect(() => {
    setSelectedCardIds(new Set());
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    // Only attempt to scroll when both cards and tags are fully loaded.
    if (cards.length > 0 && !tagsLoading) {
      const savedScrollPos = sessionStorage.getItem('adminCardListScrollPos');
      if (savedScrollPos) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos, 10));
          sessionStorage.removeItem('adminCardListScrollPos');
        }, 100); // A small delay to allow the DOM to render the full list
      }
    }
  }, [cards, tagsLoading]);

  /* const handleRefreshStats = async () => {
    alert('Requesting statistics refresh... Data will update shortly.');
    await mutateStats();
  }; */

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(cards.map(c => c.id));
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

  const handleBulkUpdate = async (field: keyof Card, value: any, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return;
    
    // Optimistically update the UI
    const updatedCards: Card[] = [];
    cards.forEach(card => {
      if (selectedCardIds.has(card.id)) {
        const updatedCard = { ...card, [field]: value };
        updateCardInCache(updatedCard);
        updatedCards.push(updatedCard);
      }
    });

    try {
      await Promise.all(
        updatedCards.map(card =>
          fetch(`/api/cards/${card.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
        )
      );
      // Optional: revalidate silently in the background after success
      mutateCards();
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      alert(`An error occurred while updating ${field}. Reverting changes.`);
      // Revert optimistic updates on failure
      mutateCards();
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!tagId || !confirm(`Update tags for ${selectedCardIds.size} cards?`)) return;

    const updates = new Map<string, Card>();

    // Prepare and apply optimistic updates
    cards.forEach(card => {
      if (selectedCardIds.has(card.id)) {
        const otherDimensionTags = (card.tags || []).filter(tId => {
          const tag = allTags.find(t => t.id === tId);
          return tag && tag.dimension !== dimension;
        });
        const newTags = [...otherDimensionTags, tagId];
        const updatedCard = { ...card, tags: newTags };
        updates.set(card.id, updatedCard);
        updateCardInCache(updatedCard);
      }
    });

    try {
      await Promise.all(
        Array.from(updates.values()).map(card =>
          fetch(`/api/cards/${card.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: card.tags }),
          })
        )
      );
      // Optional: revalidate silently in the background after success
      mutateCards();
    } catch (err) {
      console.error('Error updating bulk tags:', err);
      alert('An error occurred while updating tags. Reverting changes.');
      mutateCards(); // Revert
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCardIds.size} cards?`)) return;
    
    const idsToDelete = Array.from(selectedCardIds);
    
    // Optimistically update the UI
    idsToDelete.forEach(id => removeCardFromCache(id));
    setSelectedCardIds(new Set());
    
    try {
      await Promise.all(idsToDelete.map(id => fetch(`/api/cards/${id}`, { method: 'DELETE' })));
      // No need to revalidate on delete, the items are already gone
    } catch (err) {
      console.error('Error deleting cards:', err);
      alert('An error occurred while deleting cards. Reverting changes.');
      mutateCards(); // Revert optimistic updates
    }
  };

  const handleEditClick = () => {
    console.log('--- Saving state to session ---');
    sessionStorage.setItem('adminCardListScrollPos', window.scrollY.toString());
    saveStateToSession();
  };

  if (isLoading || tagsLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>{error.message || 'Failed to load cards.'}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cards Management</h1>
        {/* <div className={styles.stats}>
          {statsError ? (
            <div>Error loading stats.</div>
          ) : !statsData ? (
            <div>Loading stats...</div>
          ) : (
            <>
              <div>Total: {statsData.totalCount}</div>
              <div>Stories: {statsData.types?.story || 0}</div>
              <div>Galleries: {statsData.types?.gallery || 0}</div>
              <div>Q&As: {statsData.types?.qa || 0}</div>
              <div>Published: {statsData.statuses?.published || 0}</div>
              <div>Drafts: {statsData.statuses?.draft || 0}</div>
              <button onClick={handleRefreshStats} className={styles.refreshButton}>Refresh Stats</button>
            </>
          )}
        </div> */}
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
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="story">Story</option>
          <option value="gallery">Gallery</option>
          <option value="qa">Q&A</option>
          <option value="quote">Quote</option>
        </select>
      </div>

      {selectedCardIds.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedCardIds.size} cards selected</span>
          <div className={styles.actions}>
            <select
              onChange={e => handleBulkUpdate('type', e.target.value, `Update type for ${selectedCardIds.size} cards?`)}
              className={styles.filterSelect}
              defaultValue=""
            >
              <option value="" disabled>Update Type</option>
              <option value="story">Set to Story</option>
              <option value="gallery">Set to Gallery</option>
              <option value="qa">Set to Q&A</option>
              <option value="quote">Set to Quote</option>
            </select>
            <select
              onChange={e => handleBulkUpdate('status', e.target.value, `Update status for ${selectedCardIds.size} cards?`)}
              className={styles.filterSelect}
              defaultValue=""
            >
              <option value="" disabled>Update Status</option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <div className={styles.bulkTagActions}>
              {dimensionalTree.map(rootTag => (
                <div key={rootTag.id} className={styles.dimensionGroup}>
                  <label>{rootTag.name}</label>
                  <select
                    onChange={e => handleBulkTagUpdate(rootTag.dimension!, e.target.value)}
                    className={styles.dimensionSelect}
                    defaultValue=""
                  >
                    <option value="" disabled>{`Update ${rootTag.name}`}</option>
                    {rootTag.children.map(tag => renderCardAdminTagOption(tag))}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={handleBulkDelete} className={styles.deleteButton}>Delete Selected</button>
          </div>
        </div>
      )}

      <table className={styles.entriesTable}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={cards.length > 0 && selectedCardIds.size === cards.length}
              />
            </th>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedCardIds.has(card.id)}
                  onChange={() => handleSelectCard(card.id)}
                />
              </td>
              <td>{card.title || 'Untitled'}</td>
              <td>{card.type}</td>
              <td>
                <span className={`${styles.status} ${styles[card.status]}`}>
                  {card.status}
                </span>
              </td>
              <td>{new Date(card.updatedAt).toLocaleDateString()}</td>
              <td>
                <div className={styles.actionButtons}>
                  <button onClick={() => handleDelete(card.id)} className={styles.actionButton} aria-label="Delete">🗑️</button>
                  <button onClick={() => handleHide(card.id)} className={styles.actionButton} aria-label="Hide">🙈</button>
                  <button onClick={() => handleShow(card.id)} className={styles.actionButton} aria-label="Show">👁️</button>
                  <Link href={`/view/${card.id}?returnTo=/admin/card-admin`} className={styles.actionButton} target="_blank" rel="noopener noreferrer">👁️‍🗨️</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button onClick={loadMore} disabled={isLoadingMore} className={styles.loadMoreButton}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
