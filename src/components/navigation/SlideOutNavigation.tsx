'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import CardGrid from '@/components/cards/CardGrid';
import styles from '@/lib/styles/components/navigation/SlideOutNavigation.module.css';

interface SlideOutNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'entries' | 'albums' | 'tags';

// Mock data for demonstration
const mockEntries = [
  {
    id: 'entry1',
    type: 'entry' as const,
    title: 'Family Dinner',
    description: 'A memorable dinner with the family',
    date: '2024-03-15',
    tags: ['Family', 'Food'],
    href: '/entries/entry1',
    imageUrl: 'https://source.unsplash.com/random/800x600?family'
  },
  {
    id: 'entry2',
    type: 'entry' as const,
    title: 'Sunday Brunch',
    description: 'Family brunch at the new cafe',
    date: '2024-03-17',
    tags: ['Family', 'Food'],
    href: '/entries/entry2',
    imageUrl: 'https://source.unsplash.com/random/800x600?brunch'
  }
];

const mockAlbums = [
  {
    id: 'album1',
    type: 'album' as const,
    title: 'Family Photos 2024',
    description: 'Collection of family moments',
    entryCount: 8,
    date: '2024-03-10',
    tags: ['Family'],
    href: '/albums/album1',
    imageUrl: 'https://source.unsplash.com/random/800x600?family-album'
  },
  {
    id: 'album2',
    type: 'album' as const,
    title: 'Family Reunion 2024',
    description: 'Annual family gathering',
    entryCount: 12,
    date: '2024-01-15',
    tags: ['Family'],
    href: '/albums/album2',
    imageUrl: 'https://source.unsplash.com/random/800x600?reunion'
  }
];

const mockTags = [
  {
    id: 'who',
    type: 'tag' as const,
    title: 'Who',
    dimension: 'who' as const,
    description: 'People and relationships',
    entryCount: 45,
    albumCount: 12,
    href: '/tags/who'
  },
  {
    id: 'what',
    type: 'tag' as const,
    title: 'What',
    dimension: 'what' as const,
    description: 'Activities and experiences',
    entryCount: 78,
    albumCount: 23,
    href: '/tags/what'
  }
];

export default function SlideOutNavigation({ isOpen, onClose }: SlideOutNavigationProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tags');
  const pathname = usePathname();

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'entries':
        return (
          <CardGrid
            items={mockEntries}
            title="Recent Entries"
            description="Your latest journal entries"
          />
        );
      case 'albums':
        return (
          <CardGrid
            items={mockAlbums}
            title="Your Albums"
            description="Collections of related content"
          />
        );
      case 'tags':
        return (
          <CardGrid
            items={mockTags}
            title="Browse by Dimension"
            description="Explore content by category"
          />
        );
    }
  };

  return (
    <div className={`${styles.slideOut} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close navigation"
        >
          ×
        </button>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'entries' ? styles.active : ''}`}
            onClick={() => handleTabChange('entries')}
          >
            Entries
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'albums' ? styles.active : ''}`}
            onClick={() => handleTabChange('albums')}
          >
            Albums
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'tags' ? styles.active : ''}`}
            onClick={() => handleTabChange('tags')}
          >
            Tags
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
} 