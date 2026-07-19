import { getAdminApp } from '@/lib/config/firebase/admin';
import { repairCardTextEncoding } from '@/lib/utils/cardTextEncodingRepair';

const firestore = getAdminApp().firestore();
const APPLY_MODE = process.argv.includes('--apply');

type FieldUpdate = { field: string; before: string; after: string; replacements: number };

function collectFields(data: Record<string, unknown>): Array<{ field: string; value: string }> {
  const fields: Array<{ field: string; value: string }> = [];
  const add = (field: string, value: unknown) => {
    if (typeof value === 'string' && value.includes('\uFFFD')) fields.push({ field, value });
  };
  add('title', data.title);
  add('subtitle', data.subtitle);
  add('excerpt', data.excerpt);
  add('content', data.content);
  if (Array.isArray(data.galleryMedia)) {
    data.galleryMedia.forEach((item, index) => {
      if (item && typeof item === 'object') {
        add(`galleryMedia.${index}.caption`, (item as Record<string, unknown>).caption);
      }
    });
  }
  return fields;
}

async function main(): Promise<void> {
  const snapshot = await firestore.collection('cards').get();
  const changes: Array<{ id: string; title: string; updates: FieldUpdate[] }> = [];
  let unresolved = 0;
  let replacementCount = 0;
  const unresolvedContexts: Array<{ id: string; title: string; field: string; value: string }> = [];

  for (const document of snapshot.docs) {
    const data = document.data() as Record<string, unknown>;
    const updates = collectFields(data).map(({ field, value }) => {
      const repair = repairCardTextEncoding(document.id, value);
      unresolved += repair.unresolved;
      replacementCount += repair.replacements;
      if (repair.unresolved > 0) {
        unresolvedContexts.push({
          id: document.id,
          title: typeof data.title === 'string' ? data.title : '(untitled)',
          field,
          value: repair.value,
        });
      }
      return { field, before: value, after: repair.value, replacements: repair.replacements };
    });
    if (updates.length > 0) {
      changes.push({
        id: document.id,
        title: typeof data.title === 'string' ? data.title : '(untitled)',
        updates,
      });
    }
  }

  console.log(`[repair-card-text-encoding] mode=${APPLY_MODE ? 'apply' : 'dry-run'}`);
  console.log(`[repair-card-text-encoding] cardsScanned=${snapshot.size}`);
  console.log(`[repair-card-text-encoding] cardsChanged=${changes.length}`);
  console.log(`[repair-card-text-encoding] replacementCharactersRepaired=${replacementCount}`);
  console.log(`[repair-card-text-encoding] unresolved=${unresolved}`);
  unresolvedContexts.forEach((context) =>
    console.log(`[repair-card-text-encoding] unresolvedContext=${JSON.stringify(context)}`)
  );

  if (unresolved > 0) {
    throw new Error(`Refusing to ${APPLY_MODE ? 'apply' : 'approve'} repair with ${unresolved} unresolved characters.`);
  }

  if (!APPLY_MODE) return;

  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = firestore.batch();
  let batchSize = 0;

  for (const change of changes) {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    change.updates.forEach((update) => {
      updates[update.field] = update.after;
      if (update.field === 'title') updates.titleLowercase = update.after.toLowerCase();
    });
    batch.update(firestore.collection('cards').doc(change.id), updates);
    batchSize += 1;
    if (batchSize === 400) {
      batches.push(batch);
      batch = firestore.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) batches.push(batch);
  for (const pendingBatch of batches) await pendingBatch.commit();
  console.log(`[repair-card-text-encoding] cardsUpdated=${changes.length}`);
}

main().catch((error) => {
  console.error('[repair-card-text-encoding] failed', error);
  process.exitCode = 1;
});
