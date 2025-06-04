'use client';

import { useState, useEffect } from 'react';
import { JournalPage, getAllJournalPages } from '@/lib/services/journalService';
import CardGrid from '@/components/view/CardGrid';
import ContentCard from '@/components/view/ContentCard';
import styles from '@/styles/themes/Home.module.css';

interface EntryContent {
  id: string;
  type: 'entry';
  title: string;
  description: string;
  date?: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
  size?: 'large' | 'medium' | 'small';
  overlay?: boolean;
}

export default function HomePage() {
  const [recentStories, setRecentStories] = useState<EntryContent[]>([]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const stories = await getAllJournalPages();
        const sortedStories = stories.sort((a, b) => {
          const dateA = a.heading.metadata?.date;
          const dateB = b.heading.metadata?.date;
          if (dateA && dateB) {
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }
          return 0;
        });

        // Transform JournalPage data into EntryContent format
        const transformedStories: EntryContent[] = sortedStories.slice(0, 6).map(story => ({
          id: story.id,
          type: 'entry',
          title: story.heading.title,
          description: story.content.substring(0, 150) + '...', // First 150 characters as excerpt
          date: story.heading.metadata?.date,
          tags: story.heading.metadata?.tags,
          href: `/view/entry-view/${story.id}`,
          size: 'medium',
          overlay: false
        }));

        setRecentStories(transformedStories);
      } catch (error) {
        console.error('Error fetching stories:', error);
      }
    };

    fetchStories();
  }, []);

  return (
    <div className={styles.homePage}>
      <header className={styles.header}>
        <h1>Welcome to My Journal</h1>
        <p>A place for stories, reflections, and memories</p>
      </header>

      <section className={styles.recentStories}>
        <h2>Recent Stories</h2>
        <CardGrid
          entries={recentStories}
          title="Recent Stories"
          description="Latest entries from my journal"
        />
      </section>
    </div>
  );
} 