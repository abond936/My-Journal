import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  checkMutationRateLimit,
  resolveMutationRateLimitActorKey,
  resolveMutationRateLimitBucket,
} from '@/lib/api/mutationRateLimit';

const READER_PROTECTED_PREFIXES = ['/view', '/search'];

function isReaderProtectedPath(pathname: string): boolean {
  return READER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function mutationRateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests. Try again shortly.',
      severity: 'warning',
      retryable: true,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const mutationBucket = resolveMutationRateLimitBucket(pathname, request.method);
  if (mutationBucket) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });
    const actorKey = resolveMutationRateLimitActorKey(
      request,
      (typeof token?.email === 'string' && token.email) ||
        (typeof token?.sub === 'string' && token.sub) ||
        null
    );
    const limit = checkMutationRateLimit(actorKey, mutationBucket);
    if (limit.allowed === false) {
      return mutationRateLimitResponse(limit.retryAfterSeconds);
    }
  }

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
  matcher: ['/view', '/view/:path*', '/search', '/search/:path*', '/api/:path*'],
};
