'use client';

import { useState } from 'react';
import CardGrid from '@/components/cards/CardGrid';
import styles from '@/styles/themes/Home.module.css';

interface EntryCardData {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
  type?: 'story' | 'reflection';
  size?: 'large' | 'medium' | 'small';
  overlay: boolean;
}

export default function HomeTestPage() {
  const [recentEntries, setRecentEntries] = useState<EntryCardData[]>([
    {
      id: '1',
      title: 'My First Day at the Beach',
      excerpt: 'A beautiful day spent with family, building sandcastles and collecting seashells...',
      date: '2024-03-15',
      tags: ['family', 'vacation', 'summer'],
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
      href: '/entries/1',
      type: 'story',
      size: 'large',
      overlay: true
    },
    {
      id: '2',
      title: 'Learning to Cook',
      excerpt: 'My journey into the world of culinary arts, starting with simple recipes...',
      date: '2024-03-10',
      tags: ['hobby', 'learning'],
      imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352',
      href: '/entries/2',
      type: 'reflection',
      size: 'medium',
      overlay: true
    },
    {
      id: '3',
      title: 'Morning Meditation',
      excerpt: 'Finding peace in the early hours of the day...',
      date: '2024-03-08',
      tags: ['wellness', 'daily'],
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      href: '/entries/3',
      type: 'reflection',
      size: 'small',
      overlay: false
    },
    {
      id: '4',
      title: 'Garden Project',
      excerpt: 'Transforming our backyard into a beautiful garden space...',
      date: '2024-03-05',
      tags: ['project', 'outdoors'],
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b',
      href: '/entries/4',
      type: 'story',
      size: 'medium',
      overlay: false
    },
    {
      id: '5',
      title: 'Book Club Discussion',
      excerpt: 'Thoughts on our latest book club meeting and the fascinating discussions...',
      date: '2024-03-01',
      tags: ['books', 'social'],
      imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
      href: '/entries/5',
      type: 'reflection',
      size: 'small',
      overlay: false
    },
    {
      id: '6',
      title: 'Weekend Hiking Adventure',
      excerpt: 'Exploring new trails and discovering hidden waterfalls...',
      date: '2024-02-28',
      tags: ['adventure', 'outdoors'],
      imageUrl: 'https://images.unsplash.com/photo-1501554728187-ce583db33af7',
      href: '/entries/6',
      type: 'story',
      size: 'large',
      overlay: true
    }
  ]);

  return (
    <div className={styles.homeContainer}>
      <header className={styles.homeHeader}>
        <h1>My Digital Memoir</h1>
        <p className={styles.subtitle}>A collection of personal entries, memories, and experiences</p>
      </header>

      <section className={styles.featuredSection}>
        <h2>Recent Entries</h2>
        <CardGrid
          entries={recentEntries.map(entry => ({
            id: entry.id,
            type: 'entry',
            title: entry.title,
            description: entry.excerpt,
            date: entry.date,
            tags: entry.tags,
            href: entry.href,
            imageUrl: entry.imageUrl
          }))}
          title="Recent Entries"
          description="Here are some of the latest entries in your journal"
        />
      </section>
      
      <section className={styles.browsePrompt}>
        <h2>Explore My Journal</h2>
        <p>
          Navigate through my life experiences by people, places, events, time periods, 
          or themes using the navigation menu.
        </p>
      </section>
    </div>
  );
} 