export type RoleSurface = 'reader' | 'author';

export const LAST_READER_SURFACE_PATH_KEY = 'myStories:lastReaderSurfacePath';
export const LAST_AUTHOR_SURFACE_PATH_KEY = 'myStories:lastAuthorSurfacePath';

export function getRoleSurface(pathname: string | null | undefined): RoleSurface | null {
  if (!pathname) return null;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'author';
  if (pathname === '/view' || pathname.startsWith('/view/') || pathname === '/search') return 'reader';
  return null;
}

export function getDefaultRoleSurfacePath(surface: RoleSurface): string {
  return surface === 'author' ? '/admin' : '/view';
}

export function getRoleSurfaceStorageKey(surface: RoleSurface): string {
  return surface === 'author' ? LAST_AUTHOR_SURFACE_PATH_KEY : LAST_READER_SURFACE_PATH_KEY;
}

export function getSafeRoleSurfacePath(
  value: string | null | undefined,
  surface: RoleSurface
): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const parsed = new URL(value, 'https://my-stories.invalid');
    if (parsed.origin !== 'https://my-stories.invalid') return null;
    return getRoleSurface(parsed.pathname) === surface
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : null;
  } catch {
    return null;
  }
}
