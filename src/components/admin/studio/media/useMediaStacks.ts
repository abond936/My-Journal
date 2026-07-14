'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaStack } from '@/lib/types/mediaStack';
import { buildStackByIdMap } from '@/lib/utils/mediaStackDisplayUtils';

export function useMediaStacks(enabled = true) {
  const [stacks, setStacks] = useState<MediaStack[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStacks = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media/stacks', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as { stacks?: MediaStack[]; message?: string };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      setStacks(payload.stacks ?? []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refreshStacks();
  }, [refreshStacks]);

  const stackById = useMemo(() => buildStackByIdMap(stacks), [stacks]);

  const createStack = useCallback(
    async (mediaIds: string[], heroMediaId?: string) => {
      const response = await fetch('/api/admin/media/stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds, heroMediaId, kind: 'manual' }),
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as { stack?: MediaStack; message?: string };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      await refreshStacks();
      return payload.stack!;
    },
    [refreshStacks]
  );

  const dissolveStack = useCallback(
    async (stackId: string) => {
      const response = await fetch(`/api/admin/media/stacks/${encodeURIComponent(stackId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      await refreshStacks();
    },
    [refreshStacks]
  );

  return {
    stacks,
    stackById,
    loading,
    refreshStacks,
    createStack,
    dissolveStack,
  };
}
