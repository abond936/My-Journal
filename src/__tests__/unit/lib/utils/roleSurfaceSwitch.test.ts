import {
  getDefaultRoleSurfacePath,
  getRoleSurface,
  getSafeRoleSurfacePath,
} from '@/lib/utils/roleSurfaceSwitch';

describe('roleSurfaceSwitch', () => {
  it('classifies only Reader and Author application surfaces', () => {
    expect(getRoleSurface('/admin/studio')).toBe('author');
    expect(getRoleSurface('/view/card-1')).toBe('reader');
    expect(getRoleSurface('/search')).toBe('reader');
    expect(getRoleSurface('/account')).toBeNull();
  });

  it('keeps safe same-origin context only within the requested surface', () => {
    expect(getSafeRoleSurfacePath('/admin/studio?card=1', 'author')).toBe('/admin/studio?card=1');
    expect(getSafeRoleSurfacePath('/view/1?returnTo=%2Fview', 'reader')).toBe('/view/1?returnTo=%2Fview');
    expect(getSafeRoleSurfacePath('/admin', 'reader')).toBeNull();
    expect(getSafeRoleSurfacePath('//evil.test/view', 'reader')).toBeNull();
    expect(getSafeRoleSurfacePath('https://evil.test/view', 'reader')).toBeNull();
  });

  it('uses role Home defaults when no safe history exists', () => {
    expect(getDefaultRoleSurfacePath('author')).toBe('/admin');
    expect(getDefaultRoleSurfacePath('reader')).toBe('/view');
  });
});
