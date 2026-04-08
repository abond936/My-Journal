/**
 * Syncs all cards from Firestore to Typesense.
 * Run: npm run sync:typesense
 *
 * Reads every card, resolves tag IDs to names, strips HTML from content,
 * and upserts into the Typesense 'cards' collection.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveNames(ids: string[] | undefined, tagMap: Map<string, string>): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => tagMap.get(id) || id);
}

async function main() {
  // Dynamic imports so dotenv loads before Firebase initializes
  const { getAdminApp } = await import('@/lib/config/firebase/admin');
  const {
    ensureCardsCollection,
    dropCardsCollection,
    importCards,
  } = await import('@/lib/services/typesenseService');
  type TypesenseCardDocument = import('@/lib/services/typesenseService').TypesenseCardDocument;

  const args = process.argv.slice(2);
  const shouldDrop = args.includes('--fresh');

  console.log('--- Typesense Sync ---');

  if (shouldDrop) {
    console.log('Dropping existing cards collection...');
    await dropCardsCollection();
  }

  console.log('Ensuring cards collection exists...');
  await ensureCardsCollection();

  const db = getAdminApp().firestore();

  console.log('Loading tags...');
  const tagSnapshot = await db.collection('tags').get();
  const tagMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tagSnapshot.forEach((doc: any) => {
    tagMap.set(doc.id, doc.data().name || doc.id);
  });
  console.log(`  Loaded ${tagMap.size} tags.`);

  console.log('Loading cards from Firestore...');
  const snapshot = await db.collection('cards').get();
  console.log(`  Found ${snapshot.size} cards.`);

  const docs: TypesenseCardDocument[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot.forEach((doc: any) => {
    const data = doc.data();
    const contentText = data.content ? stripHtml(data.content) : '';

    docs.push({
      id: doc.id,
      title: data.title || '',
      subtitle: data.subtitle || undefined,
      excerpt: data.excerpt || undefined,
      content_text: contentText.length > 0 ? contentText.substring(0, 10000) : undefined,
      type: data.type || 'story',
      status: data.status || 'draft',
      tag_names: resolveNames(data.tags, tagMap),
      who_names: resolveNames(data.who, tagMap),
      what_names: resolveNames(data.what, tagMap),
      when_names: resolveNames(data.when, tagMap),
      where_names: resolveNames(data.where, tagMap),
      created_at: Math.floor(Number(data.createdAt) || 0),
      updated_at: Math.floor(Number(data.updatedAt) || 0),
    });
  });

  console.log(`Importing ${docs.length} cards to Typesense...`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await importCards(batch);
    console.log(`  Imported ${Math.min(i + BATCH_SIZE, docs.length)} / ${docs.length}`);
  }

  console.log('--- Sync complete ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
