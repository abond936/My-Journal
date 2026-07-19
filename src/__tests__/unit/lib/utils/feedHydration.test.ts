import {
  appendReaderFeedHydration,
  shouldUseReaderFeedHydration,
  withReaderFeedHydrationQuery,
} from '@/lib/utils/feedHydration';

describe('feedHydration', () => {
  it('uses reader-feed hydration on reader feed and search routes', () => {
    expect(shouldUseReaderFeedHydration('/view')).toBe(true);
    expect(shouldUseReaderFeedHydration('/view/card-1')).toBe(true);
    expect(shouldUseReaderFeedHydration('/search?q=story')).toBe(true);
    expect(shouldUseReaderFeedHydration('/admin/studio')).toBe(false);
    expect(shouldUseReaderFeedHydration('/')).toBe(false);
  });

  it('appends hydration=reader-feed to reader card queries', () => {
    const params = new URLSearchParams({ status: 'published', limit: '10' });
    appendReaderFeedHydration(params, '/view');
    expect(params.get('hydration')).toBe('reader-feed');
  });

  it('leaves admin routes without reader-feed hydration', () => {
    const params = new URLSearchParams({ status: 'all' });
    appendReaderFeedHydration(params, '/admin/studio');
    expect(params.get('hydration')).toBeNull();
  });

  it('rewrites feed URLs on reader routes only', () => {
    expect(withReaderFeedHydrationQuery('/api/cards?status=published', '/view')).toBe(
      '/api/cards?status=published&hydration=reader-feed'
    );
    expect(withReaderFeedHydrationQuery('/api/cards?status=all', '/admin/studio')).toBe(
      '/api/cards?status=all'
    );
  });
});
