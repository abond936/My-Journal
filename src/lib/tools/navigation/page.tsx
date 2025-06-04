'use client';

import React, { useState } from 'react';
import CardGrid from '@/components/view/CardGrid';
import SlideOutNavigation from '@/components/view/SlideOutNavigation';
import { Tag } from '@/lib/types/tag';

// Mock data for testing
const mockTags: Tag[] = [
  {
    id: 'who',
    name: 'Who',
    dimension: 'who',
    description: 'People and relationships',
    entryCount: 45,
    albumCount: 12
  },
  {
    id: 'what',
    name: 'What',
    dimension: 'what',
    description: 'Activities and experiences',
    entryCount: 78,
    albumCount: 23
  },
  {
    id: 'when',
    name: 'When',
    dimension: 'when',
    description: 'Time periods and events',
    entryCount: 34,
    albumCount: 8
  },
  {
    id: 'where',
    name: 'Where',
    dimension: 'where',
    description: 'Places and locations',
    entryCount: 56,
    albumCount: 15
  },
  {
    id: 'reflection',
    name: 'Reflection',
    dimension: 'reflection',
    description: 'Thoughts and insights',
    entryCount: 29,
    albumCount: 5
  }
];

// Mock data for "Who" dimension
const whoContent = [
  {
    id: 'family',
    type: 'tag' as const,
    title: 'Family',
    dimension: 'who' as const,
    description: 'Family members and relationships',
    entryCount: 15,
    albumCount: 3,
    href: '/test/navigation?tag=family',
    parentId: 'who'
  },
  {
    id: 'friends',
    type: 'tag' as const,
    title: 'Friends',
    dimension: 'who' as const,
    description: 'Friends and social connections',
    entryCount: 12,
    albumCount: 4,
    href: '/test/navigation?tag=friends',
    parentId: 'who'
  },
  {
    id: 'entry1',
    type: 'entry' as const,
    title: 'Family Dinner',
    description: 'A memorable dinner with the family',
    date: '2024-03-15',
    tags: ['Family', 'Food'],
    href: '/view/entry-view/entry1',
    imageUrl: 'https://source.unsplash.com/random/800x600?family'
  },
  {
    id: 'album1',
    type: 'album' as const,
    title: 'Family Photos 2024',
    description: 'Collection of family moments',
    entryCount: 8,
    date: '2024-03-10',
    tags: ['Family'],
    href: '/view/album-view/album1',
    imageUrl: 'https://source.unsplash.com/random/800x600?family-album'
  }
];

// Mock data for "Family" tag
const familyContent = [
  {
    id: 'entry2',
    type: 'entry' as const,
    title: 'Sunday Brunch',
    description: 'Family brunch at the new cafe',
    date: '2024-03-17',
    tags: ['Family', 'Food'],
    href: '/view/entry-view/entry2',
    imageUrl: 'https://source.unsplash.com/random/800x600?brunch'
  },
  {
    id: 'entry3',
    type: 'entry' as const,
    title: 'Family Vacation',
    description: 'Our trip to the mountains',
    date: '2024-02-20',
    tags: ['Family', 'Travel'],
    href: '/view/entry-view/entry3',
    imageUrl: 'https://source.unsplash.com/random/800x600?vacation'
  },
  {
    id: 'album2',
    type: 'album' as const,
    title: 'Family Reunion 2024',
    description: 'Annual family gathering',
    entryCount: 12,
    date: '2024-01-15',
    tags: ['Family'],
    href: '/view/album-view/album2',
    imageUrl: 'https://source.unsplash.com/random/800x600?reunion'
  }
];

export default function NavigationTestPage() {
  const [currentView, setCurrentView] = useState<'root' | 'who' | 'family'>('root');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'albums' | 'tags'>('tags');

  const handleTagClick = (tag: Tag) => {
    setSelectedTag(tag);
    if (tag.dimension === 'who') {
      setCurrentView('who');
    } else if (tag.id === 'family') {
      setCurrentView('family');
    }
  };

  const handleBack = () => {
    if (currentView === 'family') {
      setCurrentView('who');
    } else if (currentView === 'who') {
      setCurrentView('root');
    }
  };

  const handleTabChange = (tab: 'entries' | 'albums' | 'tags') => {
    setActiveTab(tab);
    // Reset to root view when changing tabs
    setCurrentView('root');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'root':
        return (
          <CardGrid
            entries={mockTags.map(tag => ({
              id: tag.id,
              type: 'tag' as const,
              title: tag.name,
              dimension: tag.dimension,
              description: tag.description,
              entryCount: tag.entryCount,
              albumCount: tag.albumCount,
              href: `/test/navigation?tag=${tag.id}`
            }))}
            title="Browse by Dimension"
            description="Select a dimension to explore related content"
          />
        );
      case 'who':
        return (
          <CardGrid
            entries={whoContent}
            title="Who"
            description="People and relationships"
            onBack={handleBack}
          />
        );
      case 'family':
        return (
          <CardGrid
            entries={familyContent}
            title="Family"
            description="Family members and relationships"
            onBack={handleBack}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Toggle button */}
      <button
        onClick={() => setIsNavigationOpen(true)}
        className="fixed top-4 left-4 z-50 bg-accent-color text-white px-4 py-2 rounded-md shadow-md hover:bg-accent-color-dark transition-colors"
      >
        Open Navigation
      </button>

      {/* Slide-out navigation */}
      <SlideOutNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />

      {/* Main content */}
      <main className="pt-16">
        {renderContent()}
      </main>
    </div>
  );
} 