import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import SearchRootClientPage from './SearchRootClientPage';

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function buildCallbackUrl(
  pathname: string,
  params: Record<string, string | string[] | undefined> | undefined
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') search.append(key, item);
      }
      continue;
    }
    if (typeof value === 'string') {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session) {
    const callbackUrl = buildCallbackUrl('/search', await searchParams);
    redirect(`/?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <SearchRootClientPage />;
}
