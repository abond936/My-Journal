import { useCallback, useEffect, useState } from 'react';

function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export function usePersistentTreeExpansion(storageKey: string) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = parseStoredIds(window.localStorage.getItem(storageKey));
    setExpandedIds(new Set(stored));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedIds)));
  }, [expandedIds, hydrated, storageKey]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const initializeIfEmpty = useCallback((ids: string[]) => {
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(ids);
    });
  }, []);

  const expandAll = useCallback((ids: string[]) => {
    setExpandedIds(new Set(ids));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return {
    expandedIds,
    hydrated,
    toggleExpanded,
    initializeIfEmpty,
    expandAll,
    collapseAll,
  };
}
