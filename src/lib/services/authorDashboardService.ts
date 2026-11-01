import { Filter, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  listActiveCollectionPublicationAttention,
  type CollectionPublicationAttention,
} from '@/lib/services/publicationReadinessService';
import type { DimensionReviewEntry, DimensionReviewMap } from '@/lib/types/dimensionReview';

export type DashboardSection<T> =
  | { status: 'ready'; data: T }
  | { status: 'unavailable' };

export type DashboardStory = {
  docId: string;
  title: string;
  updatedAt: number;
};

export type AuthorDashboardSummary = {
  generatedAt: number;
  cards: DashboardSection<{
    total: number;
    draft: number;
    published: number;
  }>;
  media: DashboardSection<{
    total: number;
    unreviewed: Record<'who' | 'what' | 'when' | 'where', number>;
    failedReadiness: number;
  }>;
  operations: DashboardSection<{
    attention: number;
    active: number;
    failed: number;
  }>;
  collections: DashboardSection<{
    total: number;
    items: CollectionPublicationAttention[];
  }>;
  storyWork: DashboardSection<{
    recentDraft: DashboardStory | null;
    recentPublished: DashboardStory | null;
  }>;
};

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;
const OPERATION_COLLECTIONS = [
  'media_tag_reconciliation_operations',
  'card_bulk_tag_operations',
  'tag_mutation_operations',
  'tag_split_operations',
] as const;

type CountableQuery = {
  count: () => {
    get: () => Promise<{ data: () => { count: number } }>;
  };
};

async function countQuery(query: CountableQuery): Promise<number> {
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

function supportsAggregateQuery(value: unknown): value is CountableQuery {
  return Boolean(value && typeof value === 'object' && typeof (value as CountableQuery).count === 'function');
}

function isReviewComplete(entry: DimensionReviewEntry | undefined): boolean {
  return (
    entry?.reviewed === true ||
    entry?.resolution === 'unknown' ||
    entry?.resolution === 'not_applicable'
  );
}

export function summarizeCardDocuments(
  docs: Array<Pick<QueryDocumentSnapshot, 'data'>>
): { total: number; draft: number; published: number } {
  let draft = 0;
  let published = 0;
  for (const doc of docs) {
    if (doc.data().status === 'published') published += 1;
    else draft += 1;
  }
  return { total: docs.length, draft, published };
}

export function summarizeCardCounts(
  total: number,
  published: number
): { total: number; draft: number; published: number } {
  return { total, draft: Math.max(0, total - published), published };
}

export function summarizeMediaDocuments(
  docs: Array<Pick<QueryDocumentSnapshot, 'data'>>
): {
  total: number;
  unreviewed: Record<'who' | 'what' | 'when' | 'where', number>;
  failedReadiness: number;
} {
  const unreviewed = { who: 0, what: 0, when: 0, where: 0 };
  let failedReadiness = 0;

  for (const doc of docs) {
    const data = doc.data() as {
      dimensionReview?: DimensionReviewMap;
      readiness?: { overall?: string };
    };
    for (const dimension of DIMENSIONS) {
      if (!isReviewComplete(data.dimensionReview?.[dimension])) {
        unreviewed[dimension] += 1;
      }
    }
    if (data.readiness?.overall === 'failed') failedReadiness += 1;
  }

  return { total: docs.length, unreviewed, failedReadiness };
}

export function summarizeMediaCounts(
  total: number,
  complete: Record<'who' | 'what' | 'when' | 'where', number>,
  failedReadiness: number
): {
  total: number;
  unreviewed: Record<'who' | 'what' | 'when' | 'where', number>;
  failedReadiness: number;
} {
  return {
    total,
    unreviewed: {
      who: Math.max(0, total - complete.who),
      what: Math.max(0, total - complete.what),
      when: Math.max(0, total - complete.when),
      where: Math.max(0, total - complete.where),
    },
    failedReadiness,
  };
}

export function summarizeOperationDocuments(
  docs: Array<Pick<QueryDocumentSnapshot, 'data'>>
): { attention: number; active: number; failed: number } {
  let active = 0;
  let failed = 0;
  for (const doc of docs) {
    const status = doc.data().status;
    if (status === 'failed') failed += 1;
    else if (status === 'pending' || status === 'running') active += 1;
  }
  return { attention: active + failed, active, failed };
}

async function section<T>(read: () => Promise<T>): Promise<DashboardSection<T>> {
  try {
    return { status: 'ready', data: await read() };
  } catch (error) {
    console.error('[author dashboard] Could not load summary section.', error);
    return { status: 'unavailable' };
  }
}

async function readCardSummary(firestore: Firestore) {
  const cards = firestore.collection('cards');
  try {
    if (!supportsAggregateQuery(cards) || typeof cards.where !== 'function') {
      throw new Error('Aggregate count queries are unavailable.');
    }
    const [total, published] = await Promise.all([
      countQuery(cards),
      countQuery(cards.where('status', '==', 'published')),
    ]);
    return summarizeCardCounts(total, published);
  } catch (error) {
    console.warn('[author dashboard] Falling back to projected Card scan.', error);
    const snapshot = await cards.select('status').get();
    return summarizeCardDocuments(snapshot.docs);
  }
}

async function readMediaSummary(firestore: Firestore) {
  const media = firestore.collection('media');
  try {
    if (!supportsAggregateQuery(media) || typeof media.where !== 'function') {
      throw new Error('Aggregate count queries are unavailable.');
    }
    const [total, ...counts] = await Promise.all([
      countQuery(media),
      ...DIMENSIONS.map((dimension) =>
        countQuery(
          media.where(
            Filter.or(
              Filter.where(`dimensionReview.${dimension}.reviewed`, '==', true),
              Filter.where(`dimensionReview.${dimension}.resolution`, 'in', [
                'unknown',
                'not_applicable',
              ])
            )
          )
        )
      ),
      countQuery(media.where('readiness.overall', '==', 'failed')),
    ]);
    const complete = Object.fromEntries(
      DIMENSIONS.map((dimension, index) => [dimension, counts[index]])
    ) as Record<(typeof DIMENSIONS)[number], number>;
    return summarizeMediaCounts(total, complete, counts[DIMENSIONS.length]);
  } catch (error) {
    console.warn('[author dashboard] Falling back to projected Media scan.', error);
    const snapshot = await media.select('dimensionReview', 'readiness').get();
    return summarizeMediaDocuments(snapshot.docs);
  }
}

async function readOperationSummary(firestore: Firestore) {
  try {
    const counts = await Promise.all(
      OPERATION_COLLECTIONS.flatMap((collection) => {
        const operations = firestore.collection(collection);
        if (!supportsAggregateQuery(operations) || typeof operations.where !== 'function') {
          throw new Error('Aggregate count queries are unavailable.');
        }
        return [
          countQuery(operations.where('status', 'in', ['pending', 'running'])),
          countQuery(operations.where('status', '==', 'failed')),
        ];
      })
    );
    let active = 0;
    let failed = 0;
    for (let index = 0; index < counts.length; index += 2) {
      active += counts[index];
      failed += counts[index + 1];
    }
    return { attention: active + failed, active, failed };
  } catch (error) {
    console.warn('[author dashboard] Falling back to projected operation scan.', error);
    const snapshots = await Promise.all(
      OPERATION_COLLECTIONS.map((collection) =>
        firestore
          .collection(collection)
          .where('status', 'in', ['pending', 'running', 'failed'])
          .select('status')
          .get()
      )
    );
    return summarizeOperationDocuments(snapshots.flatMap((snapshot) => snapshot.docs));
  }
}

async function readRecentStory(
  firestore: Firestore,
  status: 'draft' | 'published'
): Promise<DashboardStory | null> {
  const snapshot = await firestore
    .collection('cards')
    .where('status', '==', status)
    .where('type', '==', 'story')
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .select('title', 'subtitle', 'updatedAt')
    .get();
  const doc = snapshot.docs[0];
  if (!doc) return null;
  const data = doc.data() as { title?: string; subtitle?: string; updatedAt?: number };
  return {
    docId: doc.id,
    title: data.title?.trim() || data.subtitle?.trim() || 'Untitled Story',
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

export async function getAuthorDashboardSummary(
  firestore: Firestore = getAdminApp().firestore()
): Promise<AuthorDashboardSummary> {
  const [cards, media, operations, collections, storyWork] = await Promise.all([
    section(() => readCardSummary(firestore)),
    section(() => readMediaSummary(firestore)),
    section(() => readOperationSummary(firestore)),
    section(async () => {
      const items = await listActiveCollectionPublicationAttention(firestore);
      return { total: items.length, items };
    }),
    section(async () => {
      const [recentDraft, recentPublished] = await Promise.all([
        readRecentStory(firestore, 'draft'),
        readRecentStory(firestore, 'published'),
      ]);
      return { recentDraft, recentPublished };
    }),
  ]);

  return { generatedAt: Date.now(), cards, media, operations, collections, storyWork };
}
