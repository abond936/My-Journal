'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useTag } from '@/components/providers/TagProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { PaginatedResult } from '@/lib/types/services';
import styles from './entry-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const dimensions: Tag['dimension'][] = ['who', 'what', 'when', 'where', 'reflection'];

const renderCardAdminTagOption = (tag: any, level: number = 0) => {
  const padding = level * 10;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Card['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Card['type'] | 'all'>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  
  const { tags, tagsByDimension, dimensionalTree } = useTag();

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    return `/api/cards?${params.toString()}`;
  }, [searchTerm, statusFilter, typeFilter]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<Card>>(buildUrl(), fetcher);

  const cards = useMemo(() => data?.items || [], [data]);

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
    try {
      await Promise.all(
        Array.from(selectedCardIds).map(id => 
          fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
        )
      );
      mutate(); // Revalidate the data
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      alert(`An error occurred while updating ${field}.`);
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!tagId || !confirm(`Update tags for ${selectedCardIds.size} cards?`)) return;
    try {
      await Promise.all(Array.from(selectedCardIds).map(async cardId => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        
        const otherDimensionTags = (card.tags || []).filter(tId => {
          const tag = tags.find(t => t.id === tId);
          return tag && tag.dimension !== dimension;
        });

        const newTags = [...otherDimensionTags, tagId];
        
        await fetch(`/api/cards/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags }),
        });
      }));
      mutate(); // Revalidate the data
    } catch (err) {
      console.error('Error updating bulk tags:', err);
      alert('An error occurred while updating tags.');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCardIds.size} cards?`)) return;
    try {
      await Promise.all(Array.from(selectedCardIds).map(id => fetch(`/api/cards/${id}`, { method: 'DELETE' })));
      mutate();
      setSelectedCardIds(new Set());
    } catch (err) {
      console.error('Error deleting cards:', err);
    }
  };

  const stats = useMemo(() => {
    const typeCounts = cards.reduce((acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1;
      return acc;
    }, {} as Record<Card['type'], number>);

    return {
      total: cards.length,
      ...typeCounts,
      drafts: cards.filter(c => c.status === 'draft').length,
      published: cards.filter(c => c.status === 'published').length,
    };
  }, [cards]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>{error.message || 'Failed to load cards.'}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cards Management</h1>
        <div className={styles.stats}>
          <div>Total: {stats.total}</div>
          <div>Stories: {stats.story || 0}</div>
          <div>Galleries: {stats.gallery || 0}</div>
          <div>Q&As: {stats.qa || 0}</div>
          <div>Published: {stats.published || 0}</div>
          <div>Drafts: {stats.drafts || 0}</div>
        </div>
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
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={cards.length > 0 && selectedCardIds.size === cards.length}
              />
            </th>
            <th>Title</th>
            <th>Type</th>
            <th>Display Mode</th>
            <th>Status</th>
            <th>Created</th>
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
              <td>{card.displayMode}</td>
              <td>
                <span className={`${styles.status} ${styles[card.status]}`}>
                  {card.status}
                </span>
              </td>
              <td>{new Date(card.createdAt).toLocaleDateString()}</td>
              <td>
                <Link href={`/cards/${card.id}?returnTo=/admin/card-admin`} className={styles.actionButton} target="_blank" rel="noopener noreferrer">
                  View
                </Link>
                <Link href={`/admin/card-admin/${card.id}`} className={styles.actionButton}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
