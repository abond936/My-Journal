import {
  buildLoginRedirectPath,
  isMarketingRoute,
  resolveAuthenticatedEntryPath,
  safeInternalCallbackPath,
} from '@/lib/utils/marketingRoutes';

describe('marketingRoutes', () => {
  it('treats public marketing paths as marketing routes', () => {
    expect(isMarketingRoute('/')).toBe(true);
    expect(isMarketingRoute('/login')).toBe(true);
    expect(isMarketingRoute('/my-stories')).toBe(true);
    expect(isMarketingRoute('/my-stories/4')).toBe(true);
  });

  it('does not treat app routes as marketing routes', () => {
    expect(isMarketingRoute('/view')).toBe(false);
    expect(isMarketingRoute('/search')).toBe(false);
    expect(isMarketingRoute('/admin/studio')).toBe(false);
    expect(isMarketingRoute(null)).toBe(false);
  });

  it('builds login redirect paths with encoded callback URLs', () => {
    expect(buildLoginRedirectPath('/view')).toBe('/login?callbackUrl=%2Fview');
    expect(buildLoginRedirectPath('/view?focusCardId=card-1')).toBe(
      '/login?callbackUrl=%2Fview%3FfocusCardId%3Dcard-1'
    );
  });

  it('preserves only safe internal callback paths', () => {
    expect(safeInternalCallbackPath('/view/card-1?mode=freeform')).toBe('/view/card-1?mode=freeform');
    expect(safeInternalCallbackPath('https://evil.example')).toBe('/view');
    expect(safeInternalCallbackPath('//evil.example/path')).toBe('/view');
    expect(safeInternalCallbackPath('view/card-1')).toBe('/view');
    expect(safeInternalCallbackPath(null)).toBe('/view');
  });

  it('chooses the fresh entry by role while preserving safe explicit callbacks', () => {
    expect(resolveAuthenticatedEntryPath(null, 'admin')).toBe('/admin');
    expect(resolveAuthenticatedEntryPath(null, 'viewer')).toBe('/view');
    expect(resolveAuthenticatedEntryPath('/view/card-1?mode=guided', 'admin')).toBe(
      '/view/card-1?mode=guided'
    );
    expect(resolveAuthenticatedEntryPath('/admin/settings', 'admin')).toBe('/admin/settings');
    expect(resolveAuthenticatedEntryPath('https://evil.example', 'admin')).toBe('/admin');
    expect(resolveAuthenticatedEntryPath('//evil.example/path', 'viewer')).toBe('/view');
  });
});
