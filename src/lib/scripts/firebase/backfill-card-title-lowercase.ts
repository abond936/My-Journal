import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';

async function run(): Promise<void> {
  const db = getAdminApp().firestore();
  const snap = await db.collection('cards').get();
  if (snap.empty) {
    console.log('No cards found.');
    return;
  }

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  const writes: Promise<unknown>[] = [];

  for (const doc of snap.docs) {
    scanned++;
    const data = doc.data() as Partial<Card>;
    const title = String(data.title || '');
    const expected = title.toLowerCase();
    const current = String((data as { title_lowercase?: string }).title_lowercase || '');
    if (current === expected) {
      skipped++;
      continue;
    }
    writes.push(doc.ref.update({ title_lowercase: expected }));
    updated++;
  }

  await Promise.all(writes);
  console.log(`Scanned: ${scanned}`);
  console.log(`Updated: ${updated}`);
  console.log(`Already correct: ${skipped}`);
}

run().catch((err) => {
  console.error('Failed to backfill title_lowercase:', err);
  process.exit(1);
});

