'use client';

import { useState, useEffect } from 'react';
import { JournalPage } from '@/lib/journal';
import { getAllJournalPages } from '@/lib/journal';
import CardGrid from '@/components/cards/CardGrid';
import StoryCard from '@/components/StoryCard';
import styles from '@/styles/themes/Home.module.css';

interface StoryCardData {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
}

export default function Home() {
  const [recentStories, setRecentStories] = useState<StoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadStories() {
      try {
        const stories = await getAllJournalPages();
        // Sort by date if available, otherwise by title
        const sortedStories = stories.sort((a, b) => {
          const dateA = a.heading.metadata?.date;
          const dateB = b.heading.metadata?.date;
          if (dateA && dateB) {
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }
          return a.heading.title.localeCompare(b.heading.title);
        });

        // Transform JournalPage data into StoryCardData format
        const transformedStories: StoryCardData[] = sortedStories.slice(0, 6).map(story => ({
          id: story.id,
          title: story.heading.title,
          excerpt: story.content.substring(0, 150) + '...', // First 150 characters as excerpt
          date: story.heading.metadata?.date || 'No date',
          tags: story.heading.metadata?.tags || [],
          href: `/edit/${story.id}`,
        }));

        setRecentStories(transformedStories);
      } catch (error) {
        console.error("Error loading stories:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStories();
  }, []);
  
  return (
    <div className={styles.homeContainer}>
      <header className={styles.homeHeader}>
        <h1>My Digital Memoir</h1>
        <p className={styles.subtitle}>A collection of personal stories, memories, and experiences</p>
      </header>

      <section className={styles.featuredSection}>
        <h2>Recent Stories</h2>
        
        {loading ? (
          <div className={styles.loading}>Loading stories...</div>
        ) : (
          <CardGrid
            entries={recentStories.map(story => ({
              id: story.id,
              type: 'entry',
              title: story.title,
              description: story.excerpt,
              date: story.date,
              tags: story.tags,
              href: story.href,
              imageUrl: story.imageUrl
            }))}
            title="Recent Stories"
            description="Here are some of your recent stories"
          />
        )}
      </section>
      
      <section className={styles.browsePrompt}>
        <h2>Explore My Story</h2>
        <p>
          Navigate through my life experiences by people, places, events, time periods, 
          or themes using the navigation menu.
        </p>
      </section>
    </div>
  );
} 