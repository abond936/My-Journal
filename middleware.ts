import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const READER_PROTECTED_PREFIXES = ['/view', '/search'];

function isReaderProtectedPath(pathname: string): boolean {
  return READER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isReaderProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/';
  loginUrl.search = '';
  loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/view/:path*', '/search/:path*'],
};
