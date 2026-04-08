/**
 * Syncs all media from Firestore to Typesense (`media` collection).
 * Run: npm run sync:typesense:media
 *
 * Requires TYPESENSE_* env vars and Firebase Admin credentials.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { getAdminApp } = await import('@/lib/config/firebase/admin');
  const {
    ensureMediaCollection,
    dropMediaCollection,
    importMediaDocs,
    mediaToTypesenseDocument,
  } = await import('@/lib/services/typesenseMediaService');

  const args = process.argv.slice(2);
  const shouldDrop = args.includes('--fresh');

  console.log('--- Typesense media sync ---');

  if (shouldDrop) {
    console.log('Dropping existing media collection in Typesense...');
    await dropMediaCollection();
  }

  await ensureMediaCollection();

  const db = getAdminApp().firestore();
  const tagSnap = await db.collection('tags').get();
  const tagMap = new Map<string, string>();
  tagSnap.forEach((doc) => tagMap.set(doc.id, (doc.data().name as string) || doc.id));
  console.log(`Loaded ${tagMap.size} tags.`);

  const mediaSnap = await db.collection('media').get();
  console.log(`Found ${mediaSnap.size} media documents.`);

  const docs = mediaSnap.docs.map((doc) => {
    const data = doc.data();
    const media = { ...data, docId: doc.id };
    return mediaToTypesenseDocument(media as import('@/lib/types/photo').Media, tagMap);
  });

  const BATCH = 100;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    await importMediaDocs(batch);
    console.log(`Imported ${Math.min(i + BATCH, docs.length)} / ${docs.length}`);
  }

  console.log('--- Sync complete ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
