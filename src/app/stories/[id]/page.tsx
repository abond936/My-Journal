'use client';

import React from 'react';
import { useStory } from '@/lib/hooks/useStory';
import BlogTemplate from '@/app/storyTemplates/blog/page';
import AboutTemplate from '@/app/storyTemplates/about/page';

export default function StoryPage({ params }: { params: { id: string } }) {
  const { story, loading, error } = useStory(params.id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!story) return <div>Story not found</div>;

  // Use About template for the About page, Blog template for everything else
  const Template = story.id === 'about' ? AboutTemplate : BlogTemplate;

  return <Template story={story} />;
} 