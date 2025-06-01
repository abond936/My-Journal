import { useState, useEffect } from 'react';
import { getEntries } from '@/lib/services/entryService';
import { Entry, GetEntriesOptions } from '@/lib/types/entry';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseEntriesOptions extends GetEntriesOptions {
  initialLastDoc?: DocumentSnapshot;
}

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  loadMore: () => Promise<void>;
}

export function useEntries(options: UseEntriesOptions = {}): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(options.initialLastDoc || null);

  const loadEntries = async (lastDocument?: DocumentSnapshot) => {
    try {
      setLoading(true);
      const result = await getEntries({
        ...options,
        lastDoc: lastDocument
      });
      
      if (lastDocument) {
        setEntries(prev => [...prev, ...result.items]);
      } else {
        setEntries(result.items);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch entries'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;
    await loadEntries(lastDoc);
  };

  useEffect(() => {
    let mounted = true;

    async function fetchInitialEntries() {
      try {
        setLoading(true);
        const result = await getEntries(options);
        if (mounted) {
          setEntries(result.items);
          setLastDoc(result.lastDoc);
          setHasMore(result.hasMore);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch entries'));
          setEntries([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchInitialEntries();

    return () => {
      mounted = false;
    };
  }, [options.page, options.limit, options.tag, options.tags, options.type, options.status]);

  return { entries, loading, error, hasMore, lastDoc, loadMore };
} 