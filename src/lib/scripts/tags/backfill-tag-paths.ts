import 'dotenv/config';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Tag } from '@/lib/types/tag';
import { auditCanonicalTagPaths, buildCanonicalTagPaths } from '@/lib/utils/tagHierarchy';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 400;

async function run() {
  const db = getAdminApp().firestore();
  const collection = db.collection('tags');
  const snapshot = await collection.get();
  const tags = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
  const expectedPaths = buildCanonicalTagPaths(tags);
  const mismatches = auditCanonicalTagPaths(tags);

  console.log(`Tags: ${tags.length}`);
  console.log(`Path mismatches: ${mismatches.length}`);
  for (const mismatch of mismatches.slice(0, 25)) {
    const tag = tags.find((candidate) => candidate.docId === mismatch.tagId);
    console.log(`- ${tag?.name ?? mismatch.tagId} (${mismatch.tagId})`);
  }
  if (mismatches.length > 25) console.log(`...and ${mismatches.length - 25} more`);

  if (!APPLY) {
    console.log('Audit only. No writes performed. Use --apply only inside the approved repair slice.');
    return;
  }

  for (let start = 0; start < mismatches.length; start += BATCH_SIZE) {
    const batch = db.batch();
    for (const mismatch of mismatches.slice(start, start + BATCH_SIZE)) {
      batch.update(collection.doc(mismatch.tagId), {
        path: expectedPaths.get(mismatch.tagId) ?? [],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  console.log(`Updated ${mismatches.length} tag paths.`);
  console.log('Derived fields, counts, subjects, and search projections still require reconciliation.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
