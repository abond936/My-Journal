'use client';

import { useState, useEffect } from 'react';
import { getEntries } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import { UIEntry } from '@/lib/types/ui';
import Link from 'next/link';
import CardGrid from '@/components/layouts/CardGrid';
import AccordionLayout from '@/components/layouts/AccordionLayout';
import BlogLayout from '@/components/layouts/BlogLayout';
import { useTag } from '@/lib/contexts/TagContext';
import styles from '@/styles/pages/entries.module.css';

type LayoutType = 'grid' | 'accordion' | 'blog';

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutType>('grid');
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

  const renderLayout = () => {
    if (loading && entries.length === 0) {
      return <div className={styles.loading}>Loading entries...</div>;
    }

    if (error) {
      return <div className={styles.error}>{error}</div>;
    }

    if (!entries.length) {
      return <div className={styles.empty}>No entries found.</div>;
    }

    // Transform entries for layouts
    const uiEntries = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      excerpt: entry.content.substring(0, 150) + '...',
      date: entry.date?.toLocaleDateString(),
      tags: entry.tags,
      imageUrl: entry.media?.[0],
      href: `/entries/${entry.id}`,
      type: entry.type || 'story'
    }));

    // Transform entries for CardGrid
    const gridEntries = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.content.substring(0, 150) + '...',
      date: entry.date?.toLocaleDateString(),
      tags: entry.tags,
      imageUrl: entry.media?.[0],
      href: `/entries/${entry.id}`,
      type: 'entry' as const,
      size: 'medium' as const
    }));

    return (
      <>
        {layout === 'accordion' && <AccordionLayout entries={uiEntries} />}
        {layout === 'blog' && <BlogLayout entries={uiEntries} />}
        {layout === 'grid' && <CardGrid entries={gridEntries} />}
        
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
            <div className={styles.layoutControls}>
              <button
                className={`${styles.layoutButton} ${layout === 'grid' ? styles.active : ''}`}
                onClick={() => setLayout('grid')}
                aria-label="Grid layout"
                title="Grid layout"
              >
                Grid
              </button>
              <button
                className={`${styles.layoutButton} ${layout === 'accordion' ? styles.active : ''}`}
                onClick={() => setLayout('accordion')}
                aria-label="Accordion layout"
                title="Accordion layout"
              >
                Accordion
              </button>
              <button
                className={`${styles.layoutButton} ${layout === 'blog' ? styles.active : ''}`}
                onClick={() => setLayout('blog')}
                aria-label="Blog layout"
                title="Blog layout"
              >
                Blog
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderLayout()}
    </div>
  );
} 