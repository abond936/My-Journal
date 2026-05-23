import type { Session } from 'next-auth';
import type { Card } from '@/lib/types/card';

export function isAdminSession(session: Session | null | undefined): boolean {
  return session?.user?.role === 'admin';
}

export function isAuthenticatedSession(session: Session | null | undefined): session is Session {
  return Boolean(session?.user);
}

export function canReadCard(session: Session | null | undefined, card: Pick<Card, 'status'>): boolean {
  if (!isAuthenticatedSession(session)) return false;
  if (isAdminSession(session)) return true;
  return card.status === 'published';
}

export function filterReadableCards<T extends Pick<Card, 'status'>>(
  session: Session | null | undefined,
  cards: T[]
): T[] {
  return cards.filter((card) => canReadCard(session, card));
}
