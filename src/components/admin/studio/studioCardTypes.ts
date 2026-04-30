import type { Card } from '@/lib/types/card';

/** Card plus optional hydrated children (Studio / relationship panel GET). */
export type StudioCardContext = Card & { children?: Card[] };
