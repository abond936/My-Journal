'use client';

import { useState, useEffect } from 'react';
import { getEntries } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import Link from 'next/link';
import CardGrid from '@/components/cards/CardGrid';
import { useTag } from '@/lib/contexts/TagContext';
import styles from '@/lib/styles/app/entries.module.css';

// Function to get a placeholder image based on entry ID
const getPlaceholderImage = (id: string) => {
  // Using picsum.photos for random images, but seeded with the entry ID
  // This ensures the same entry always gets the same image
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/800/600`;
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const { selectedTag } = useTag();

  const fetchEntries = async (isInitial = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getEntries({
        limit: 12,
        tag: selectedTag,
        lastDoc: isInitial ? null : lastDoc
      });

      if (isInitial) {
        setEntries(result.items);
      } else {
        setEntries(prev => [...prev, ...result.items]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchEntries(true);
  }, [selectedTag]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchEntries();
    }
  };

  const renderContent = () => {
    if (loading && entries.length === 0) {
      return <div className={styles.loading}>Loading entries...</div>;
    }

    if (error) {
      return <div className={styles.error}>{error}</div>;
    }

    if (!entries.length) {
      return <div className={styles.empty}>No entries found.</div>;
    }

    // Transform entries for CardGrid
    const gridEntries = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.content.substring(0, 150) + '...',
      date: entry.date?.toLocaleDateString(),
      tags: entry.tags,
      imageUrl: entry.media?.[0] || getPlaceholderImage(entry.id),
      href: `/entries/${entry.id}`,
      type: 'entry' as const,
      size: 'medium' as const
    }));

    return (
      <>
        <CardGrid entries={gridEntries} />
        
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={handleLoadMore}
              className={styles.loadMoreButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.entriesPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>My Entries</h1>
          <div className={styles.headerActions}>
            <Link 
              href="/entries/new" 
              className={styles.newEntryButton}
            >
              New Entry
            </Link>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
} 