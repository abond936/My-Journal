import { getAdminApp } from '@/lib/config/firebase/admin';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import { getRecentTypesenseSyncFailures } from '@/lib/services/typesenseSync';

const DEFAULT_SAMPLE_SIZE = 40;

export type TypesenseCollectionReconciliation = {
  firestoreCount: number;
  typesenseCount: number;
  countDelta: number;
  missingInTypesenseSample: string[];
  orphanedInTypesenseSample: string[];
  sampleSize: number;
};

export type TypesenseReconciliationReport = {
  configured: boolean;
  checkedAt: number;
  healthy: boolean;
  cards: TypesenseCollectionReconciliation | null;
  media: TypesenseCollectionReconciliation | null;
  recentSyncFailures: ReturnType<typeof getRecentTypesenseSyncFailures>;
  repairHint: string;
};

async function typesenseDocumentExists(collection: 'cards' | 'media', id: string): Promise<boolean> {
  const client = getTypesenseClient();
  if (!client) return false;
  try {
    await client.collections(collection).documents(id).retrieve();
    return true;
  } catch {
    return false;
  }
}

async function sampleTypesenseDocIds(
  collection: 'cards' | 'media',
  sampleSize: number
): Promise<string[]> {
  const client = getTypesenseClient();
  if (!client) return [];

  const result = await client.collections(collection).documents().search({
    q: '*',
    query_by: collection === 'cards' ? 'title' : 'searchable',
    sort_by: collection === 'cards' ? 'updated_at:desc' : 'created_at:desc',
    page: 1,
    per_page: sampleSize,
  });

  return (result.hits ?? [])
    .map((hit) => {
      const doc = hit.document as { id?: string };
      return typeof doc.id === 'string' ? doc.id : '';
    })
    .filter(Boolean);
}

async function reconcileCollection(
  firestoreCollection: 'cards' | 'media',
  typesenseCollection: 'cards' | 'media',
  sampleSize: number,
  firestoreOrderField: 'updatedAt' | 'createdAt'
): Promise<TypesenseCollectionReconciliation> {
  const db = getAdminApp().firestore();
  const client = getTypesenseClient();
  if (!client) {
    throw new Error('Typesense not configured');
  }

  const [firestoreSnap, typesenseMeta] = await Promise.all([
    db.collection(firestoreCollection).get(),
    client.collections(typesenseCollection).retrieve(),
  ]);

  const firestoreCount = firestoreSnap.size;
  const typesenseCount = typesenseMeta.num_documents ?? 0;

  const recentFirestoreSnap = await db
    .collection(firestoreCollection)
    .orderBy(firestoreOrderField, 'desc')
    .limit(sampleSize)
    .get();

  const missingInTypesenseSample: string[] = [];
  for (const doc of recentFirestoreSnap.docs) {
    const exists = await typesenseDocumentExists(typesenseCollection, doc.id);
    if (!exists) missingInTypesenseSample.push(doc.id);
  }

  const typesenseSampleIds = await sampleTypesenseDocIds(typesenseCollection, sampleSize);
  const orphanedInTypesenseSample: string[] = [];
  for (const id of typesenseSampleIds) {
    const snap = await db.collection(firestoreCollection).doc(id).get();
    if (!snap.exists) orphanedInTypesenseSample.push(id);
  }

  return {
    firestoreCount,
    typesenseCount,
    countDelta: typesenseCount - firestoreCount,
    missingInTypesenseSample,
    orphanedInTypesenseSample,
    sampleSize,
  };
}

function collectionHealthy(section: TypesenseCollectionReconciliation | null): boolean {
  if (!section) return true;
  return (
    section.countDelta === 0 &&
    section.missingInTypesenseSample.length === 0 &&
    section.orphanedInTypesenseSample.length === 0
  );
}

export async function diagnoseTypesenseProjection(options?: {
  sampleSize?: number;
}): Promise<TypesenseReconciliationReport> {
  const sampleSize = Math.min(Math.max(options?.sampleSize ?? DEFAULT_SAMPLE_SIZE, 5), 100);
  const checkedAt = Date.now();
  const recentSyncFailures = getRecentTypesenseSyncFailures();

  if (!isTypesenseConfigured()) {
    return {
      configured: false,
      checkedAt,
      healthy: recentSyncFailures.length === 0,
      cards: null,
      media: null,
      recentSyncFailures,
      repairHint: 'Typesense is not configured in this environment.',
    };
  }

  const [cards, media] = await Promise.all([
    reconcileCollection('cards', 'cards', sampleSize, 'updatedAt'),
    reconcileCollection('media', 'media', sampleSize, 'createdAt'),
  ]);

  const healthy =
    recentSyncFailures.length === 0 && collectionHealthy(cards) && collectionHealthy(media);

  return {
    configured: true,
    checkedAt,
    healthy,
    cards,
    media,
    recentSyncFailures,
    repairHint:
      'If drift is reported, run npm run sync:typesense / sync:typesense:media (or :fresh after schema changes).',
  };
}
