import {
  appendCoverOnlyFeedHydration,
  shouldUseCoverOnlyFeedHydration,
  withCoverOnlyFeedHydrationQuery,
} from '@/lib/utils/feedHydration';

describe('feedHydration', () => {
  it('uses cover-only hydration on reader feed and search routes', () => {
    expect(shouldUseCoverOnlyFeedHydration('/view')).toBe(true);
    expect(shouldUseCoverOnlyFeedHydration('/view/card-1')).toBe(true);
    expect(shouldUseCoverOnlyFeedHydration('/search?q=story')).toBe(true);
    expect(shouldUseCoverOnlyFeedHydration('/admin/studio')).toBe(false);
    expect(shouldUseCoverOnlyFeedHydration('/')).toBe(false);
  });

  it('appends hydration=cover-only to reader feed card queries', () => {
    const params = new URLSearchParams({ status: 'published', limit: '10' });
    appendCoverOnlyFeedHydration(params, '/view');
    expect(params.get('hydration')).toBe('cover-only');
  });

  it('leaves admin routes without cover-only hydration', () => {
    const params = new URLSearchParams({ status: 'all' });
    appendCoverOnlyFeedHydration(params, '/admin/studio');
    expect(params.get('hydration')).toBeNull();
  });

  it('rewrites feed URLs on reader routes only', () => {
    expect(withCoverOnlyFeedHydrationQuery('/api/cards?status=published', '/view')).toBe(
      '/api/cards?status=published&hydration=cover-only'
    );
    expect(withCoverOnlyFeedHydrationQuery('/api/cards?status=all', '/admin/studio')).toBe(
      '/api/cards?status=all'
    );
  });
});
