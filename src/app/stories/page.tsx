'use client';

import React from 'react';
import { useStories } from '@/lib/hooks/useStories';
import CardGrid from '@/components/CardGrid';
import styles from '@/styles/pages/stories.module.css';

export default function StoriesPage() {
  const { stories, loading, error } = useStories();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <main className={styles.storiesPage}>
      <h1>Stories</h1>
      <CardGrid stories={stories} />
    </main>
  );
} 