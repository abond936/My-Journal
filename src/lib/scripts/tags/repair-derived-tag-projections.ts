import 'dotenv/config';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { calculateDerivedTagData } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 350;
type ProjectionDoc = {
  tags?: string[];
  filterTags?: Record<string, boolean>;
  who?: string[];
  what?: string[];
  when?: string[];
  where?: string[];
  hasTags?: boolean;
  hasWho?: boolean;
  hasWhat?: boolean;
  hasWhen?: boolean;
  hasWhere?: boolean;
};

function sameArray(left: string[] | undefined, right: string[]): boolean {
  const a = [...(left ?? [])].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameFilter(left: Record<string, boolean> | undefined, right: Record<string, boolean>): boolean {
  const enabled = Object.entries(left ?? {}).filter(([, value]) => value).map(([id]) => id);
  return sameArray(enabled, Object.keys(right));
}

async function expectedProjection(doc: ProjectionDoc, tags: Tag[], includePresence: boolean) {
  const directTags = Array.from(new Set((doc.tags ?? []).filter(Boolean)));
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(directTags, tags);
  return {
    filterTags,
    who: dimensionalTags.who,
    what: dimensionalTags.what,
    when: dimensionalTags.when,
    where: dimensionalTags.where,
    ...(includePresence ? {
      hasTags: directTags.length > 0,
      hasWho: dimensionalTags.who.length > 0,
      hasWhat: dimensionalTags.what.length > 0,
      hasWhen: dimensionalTags.when.length > 0,
      hasWhere: dimensionalTags.where.length > 0,
    } : {}),
  };
}

function projectionMatches(doc: ProjectionDoc, expected: Awaited<ReturnType<typeof expectedProjection>>, includePresence: boolean) {
  const base = sameFilter(doc.filterTags, expected.filterTags) &&
    sameArray(doc.who, expected.who) && sameArray(doc.what, expected.what) &&
    sameArray(doc.when, expected.when) && sameArray(doc.where, expected.where);
  if (!includePresence) return base;
  return base && doc.hasTags === expected.hasTags && doc.hasWho === expected.hasWho &&
    doc.hasWhat === expected.hasWhat && doc.hasWhen === expected.hasWhen &&
    doc.hasWhere === expected.hasWhere;
}

async function auditCollection(collectionName: 'cards' | 'media', tags: Tag[]) {
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore.collection(collectionName).get();
  const includePresence = collectionName === 'media';
  const mismatches: Array<{ ref: FirebaseFirestore.DocumentReference; expected: Awaited<ReturnType<typeof expectedProjection>> }> = [];
  for (const doc of snapshot.docs) {
    const current = doc.data() as ProjectionDoc;
    const expected = await expectedProjection(current, tags, includePresence);
    if (!projectionMatches(current, expected, includePresence)) mismatches.push({ ref: doc.ref, expected });
  }
  return { total: snapshot.size, mismatches };
}

async function applyMismatches(items: Array<{ ref: FirebaseFirestore.DocumentReference; expected: Awaited<ReturnType<typeof expectedProjection>> }>) {
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = getAdminApp().firestore().batch();
    for (const item of items.slice(start, start + BATCH_SIZE)) {
      batch.update(item.ref, { ...item.expected, updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
  }
}

async function run() {
  const firestore = getAdminApp().firestore();
  const tagSnap = await firestore.collection('tags').get();
  const tags = tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
  const [cards, media] = await Promise.all([
    auditCollection('cards', tags),
    auditCollection('media', tags),
  ]);
  console.log(`Cards: ${cards.total}; projection mismatches: ${cards.mismatches.length}`);
  console.log(`Media: ${media.total}; projection mismatches: ${media.mismatches.length}`);
  if (!APPLY) {
    console.log('Audit only. No writes performed.');
    return;
  }
  await applyMismatches(cards.mismatches);
  await applyMismatches(media.mismatches);
  console.log(`Updated ${cards.mismatches.length} cards and ${media.mismatches.length} media records.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
