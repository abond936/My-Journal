import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import ViewRootClientPage from './ViewRootClientPage';

interface ViewPageProps {
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

export default async function CardsPage({ searchParams }: ViewPageProps) {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session) {
    const callbackUrl = buildCallbackUrl('/view', await searchParams);
    redirect(`/?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <ViewRootClientPage />;
}
