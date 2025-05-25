import { useState, useEffect } from 'react';
import { Story } from '../journal';

interface UseStoriesOptions {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
}

export function useStories(options: UseStoriesOptions = {}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { page = 1, limit = 10, category, tags } = options;
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(category && { category }),
          ...(tags && { tags: tags.join(',') })
        });

        const response = await fetch(`/api/stories?${queryParams}`);
        if (!response.ok) {
          throw new Error('Failed to fetch stories');
        }

        const data = await response.json();
        setStories(prev => page === 1 ? data.stories : [...prev, ...data.stories]);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [options]);

  return { stories, loading, error, hasMore };
} 