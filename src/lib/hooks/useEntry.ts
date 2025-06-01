import { useState, useEffect } from 'react';
import { getEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';

// Mock data for testing
const mockEntry: Entry = {
  id: 'test-entry-1',
  title: 'Test Entry',
  content: '<p>This is a test entry with some <strong>rich text</strong> content.</p><p>It includes multiple paragraphs and <em>formatting</em>.</p>',
  tags: ['test', 'example'],
  type: 'story',
  status: 'published',
  visibility: 'public',
  createdAt: new Date(),
  updatedAt: new Date(),
  date: new Date(),
  media: [],
  inheritedTags: ['test', 'example']
};

export function useEntry(id: string) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchEntry = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getEntry(id);
        
        if (isMounted) {
          setEntry(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch entry'));
          setLoading(false);
        }
      }
    };

    fetchEntry();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { entry, loading, error };
} 