/**
 * Basic in-process mutation rate limits (post-review step 8a).
 *
 * Keys are scoped by actor + bucket. Limits apply per runtime instance (serverless /
 * multi-instance deployments are not globally coordinated — acceptable for v1 baseline).
 */

export const MUTATION_RATE_LIMITS = {
  /** Card/tag/media CRUD and most admin writes. */
  standard: { windowMs: 60_000, max: 120 },
  /** Bulk tag/card/media mutations. */
  bulk: { windowMs: 60_000, max: 30 },
  /** Folder/batch/local import pipelines. */
  import: { windowMs: 60_000, max: 10 },
  /** Maintenance/reconcile/backfill operators. */
  maintenance: { windowMs: 60_000, max: 6 },
  /** AI-assisted draft suggestions. */
  ai: { windowMs: 60_000, max: 15 },
} as const;

export type MutationRateLimitBucket = keyof typeof MUTATION_RATE_LIMITS;

const MUTATION_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type BucketStore = Map<string, number[]>;

const globalStore = globalThis as typeof globalThis & {
  __mutationRateLimitStore?: BucketStore;
};

function getStore(): BucketStore {
  if (!globalStore.__mutationRateLimitStore) {
    globalStore.__mutationRateLimitStore = new Map();
  }
  return globalStore.__mutationRateLimitStore;
}

export function resetMutationRateLimitStoreForTests(): void {
  getStore().clear();
}

function pruneTimestamps(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

export function resolveMutationRateLimitBucket(
  pathname: string,
  method: string
): MutationRateLimitBucket | null {
  if (!pathname.startsWith('/api/')) return null;
  if (!MUTATION_HTTP_METHODS.has(method.toUpperCase())) return null;
  if (pathname.startsWith('/api/auth')) return null;

  if (pathname.includes('/import/') || pathname.startsWith('/api/images/local/')) {
    return 'import';
  }
  if (pathname.startsWith('/api/admin/maintenance/')) {
    return 'maintenance';
  }
  if (pathname.startsWith('/api/ai/')) {
    return 'ai';
  }
  if (
    pathname.includes('/bulk-update-tags') ||
    pathname.startsWith('/api/admin/media/tags')
  ) {
    return 'bulk';
  }

  return 'standard';
}

export type MutationRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; bucket: MutationRateLimitBucket };

export function checkMutationRateLimit(
  actorKey: string,
  bucket: MutationRateLimitBucket
): MutationRateLimitResult {
  const { windowMs, max } = MUTATION_RATE_LIMITS[bucket];
  const storeKey = `${bucket}:${actorKey.trim() || 'anonymous'}`;
  const now = Date.now();
  const store = getStore();
  const active = pruneTimestamps(store.get(storeKey) ?? [], windowMs, now);

  if (active.length >= max) {
    const oldest = active[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      bucket,
    };
  }

  active.push(now);
  store.set(storeKey, active);
  return { allowed: true };
}

export function resolveMutationRateLimitActorKey(request: Request, tokenSub?: string | null): string {
  if (tokenSub && tokenSub.trim()) {
    return tokenSub.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return `ip:${realIp}`;
  return 'anonymous';
}
