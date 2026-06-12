import {
  MUTATION_RATE_LIMITS,
  checkMutationRateLimit,
  resetMutationRateLimitStoreForTests,
  resolveMutationRateLimitBucket,
} from '@/lib/api/mutationRateLimit';

describe('mutation rate limiting (8a)', () => {
  beforeEach(() => {
    resetMutationRateLimitStoreForTests();
  });

  it('resolveMutationRateLimitBucket classifies write routes and skips reads/auth', () => {
    expect(resolveMutationRateLimitBucket('/api/cards', 'GET')).toBeNull();
    expect(resolveMutationRateLimitBucket('/api/auth/signin', 'POST')).toBeNull();
    expect(resolveMutationRateLimitBucket('/api/cards', 'POST')).toBe('standard');
    expect(resolveMutationRateLimitBucket('/api/cards/bulk-update-tags', 'POST')).toBe('bulk');
    expect(resolveMutationRateLimitBucket('/api/import/folder', 'POST')).toBe('import');
    expect(resolveMutationRateLimitBucket('/api/admin/maintenance/reconcile', 'POST')).toBe(
      'maintenance'
    );
    expect(resolveMutationRateLimitBucket('/api/ai/suggest-card-drafts', 'POST')).toBe('ai');
  });

  it('checkMutationRateLimit blocks after the bucket max within the window', () => {
    const bucket = 'maintenance';
    const { max } = MUTATION_RATE_LIMITS[bucket];

    for (let i = 0; i < max; i += 1) {
      expect(checkMutationRateLimit('admin@test', bucket).allowed).toBe(true);
    }

    const blocked = checkMutationRateLimit('admin@test', bucket);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.bucket).toBe('maintenance');
    }
  });

  it('scopes limits per actor key', () => {
    const bucket = 'maintenance';
    const { max } = MUTATION_RATE_LIMITS[bucket];

    for (let i = 0; i < max; i += 1) {
      checkMutationRateLimit('actor-a', bucket);
    }
    expect(checkMutationRateLimit('actor-a', bucket).allowed).toBe(false);
    expect(checkMutationRateLimit('actor-b', bucket).allowed).toBe(true);
  });
});
