'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import styles from './entry-admin.module.css'; // We can rename this later
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminCardsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Card['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Card['type'] | 'all'>('all');

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    return `/api/cards?${params.toString()}`;
  }, [searchTerm, statusFilter, typeFilter]);

  const { data, error, isLoading } = useSWR<PaginatedResult<Card>>(buildUrl(), fetcher);

  const cards = useMemo(() => data?.items || [], [data]);

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

      <table className={styles.table}>
        <thead>
          <tr>
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
