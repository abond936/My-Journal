import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { extractMediaFromContent } from '@/lib/utils/cardUtils';

const firestore = getAdminApp().firestore();
const APPLY_MODE = process.argv.includes('--apply');
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_7_DAYS = 7 * DAY_MS;
const RECENT_30_DAYS = 30 * DAY_MS;

function normalizeIds(ids: string[] | undefined | null): string[] {
  if (!Array.isArray(ids)) return [];
  const cleaned = ids
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return Array.from(new Set(cleaned)).sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function describeAge(updatedAt: unknown): string {
  const ts = typeof updatedAt === 'number' ? updatedAt : 0;
  if (!ts) return 'unknown';
  const ageMs = NOW - ts;
  if (ageMs <= RECENT_7_DAYS) return '<=7d';
  if (ageMs <= RECENT_30_DAYS) return '<=30d';
  return '>30d';
}

async function main(): Promise<void> {
  const cardsSnap = await firestore.collection('cards').get();

  let scanned = 0;
  let inSync = 0;
  let outOfSync = 0;
  let updated = 0;

  const mismatchByAge: Record<string, number> = {
    '<=7d': 0,
    '<=30d': 0,
    '>30d': 0,
    unknown: 0,
  };

  const sample: Array<{
    id: string;
    title: string;
    updatedAt: number | null;
    ageBucket: string;
    stored: string[];
    derived: string[];
  }> = [];

  for (const doc of cardsSnap.docs) {
    scanned += 1;
    const card = doc.data() as Card;
    const stored = normalizeIds(card.contentMedia);
    const derived = normalizeIds(extractMediaFromContent(card.content ?? ''));
    const same = arraysEqual(stored, derived);

    if (same) {
      inSync += 1;
      continue;
    }

    outOfSync += 1;
    const ageBucket = describeAge(card.updatedAt);
    mismatchByAge[ageBucket] = (mismatchByAge[ageBucket] || 0) + 1;

    if (sample.length < 20) {
      sample.push({
        id: doc.id,
        title: card.title ?? '(untitled)',
        updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : null,
        ageBucket,
        stored,
        derived,
      });
    }

    if (APPLY_MODE) {
      await doc.ref.update({
        contentMedia: derived,
        updatedAt: Date.now(),
      });
      updated += 1;
    }
  }

  console.log(`[audit-fix-card-content-media] mode=${APPLY_MODE ? 'apply' : 'dry-run'}`);
  console.log(`[audit-fix-card-content-media] scanned=${scanned}`);
  console.log(`[audit-fix-card-content-media] inSync=${inSync}`);
  console.log(`[audit-fix-card-content-media] outOfSync=${outOfSync}`);
  if (APPLY_MODE) {
    console.log(`[audit-fix-card-content-media] updated=${updated}`);
  }

  console.log('[audit-fix-card-content-media] mismatchAgeBuckets=', mismatchByAge);

  if (sample.length > 0) {
    console.log('[audit-fix-card-content-media] mismatchSampleStart');
    sample.forEach((row) => {
      console.log(
        JSON.stringify({
          id: row.id,
          title: row.title,
          updatedAt: row.updatedAt,
          ageBucket: row.ageBucket,
          storedCount: row.stored.length,
          derivedCount: row.derived.length,
          stored: row.stored,
          derived: row.derived,
        })
      );
    });
    console.log('[audit-fix-card-content-media] mismatchSampleEnd');
  }
}

main().catch((error) => {
  console.error('[audit-fix-card-content-media] failed', error);
  process.exitCode = 1;
});
