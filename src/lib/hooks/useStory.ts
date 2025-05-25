import { useState, useEffect } from 'react';
import { Story } from '../journal';

export function useStory(storyId?: string) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        if (!storyId) {
          setStory(null);
          return;
        }

        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch story');
        }

        const data = await response.json();
        setStory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId]);

  return { story, loading, error };
} 