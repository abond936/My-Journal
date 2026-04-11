import Typesense from 'typesense';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import { Card } from '@/lib/types/card';

const CARDS_COLLECTION = 'cards';

const cardsSchema: Typesense.CollectionCreateSchema = {
  name: CARDS_COLLECTION,
  fields: [
    { name: 'title', type: 'string', facet: false },
    { name: 'subtitle', type: 'string', optional: true, facet: false },
    { name: 'excerpt', type: 'string', optional: true, facet: false },
    { name: 'content_text', type: 'string', optional: true, facet: false },
    { name: 'type', type: 'string', facet: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'tag_names', type: 'string[]', optional: true, facet: true },
    { name: 'who_names', type: 'string[]', optional: true, facet: true },
    { name: 'what_names', type: 'string[]', optional: true, facet: true },
    { name: 'when_names', type: 'string[]', optional: true, facet: true },
    { name: 'where_names', type: 'string[]', optional: true, facet: true },
    { name: 'created_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
    /** Packed When sort key (same as Firestore journalWhenSortDesc); optional for older indexes. */
    { name: 'journal_when_sort', type: 'int64', facet: false, optional: true },
  ],
  default_sorting_field: 'updated_at',
};

export interface TypesenseCardDocument {
  id: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  content_text?: string;
  type: string;
  status: string;
  tag_names?: string[];
  who_names?: string[];
  what_names?: string[];
  when_names?: string[];
  where_names?: string[];
  created_at: number;
  updated_at: number;
  journal_when_sort?: number;
}

export async function ensureCardsCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  try {
    await client.collections(CARDS_COLLECTION).retrieve();
  } catch {
    await client.collections().create(cardsSchema);
  }
}

export async function upsertCard(doc: TypesenseCardDocument): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;

  await client.collections(CARDS_COLLECTION).documents().upsert(doc);
}

export async function deleteCard(docId: string): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;

  try {
    await client.collections(CARDS_COLLECTION).documents(docId).delete();
  } catch {
    // Document may not exist in Typesense yet
  }
}

export async function importCards(docs: TypesenseCardDocument[]): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  await client
    .collections(CARDS_COLLECTION)
    .documents()
    .import(docs, { action: 'upsert' });
}

export interface SearchOptions {
  query: string;
  type?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  docIds: string[];
  totalFound: number;
}

export async function searchCards(options: SearchOptions): Promise<SearchResult> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  const filterParts: string[] = [];
  if (options.type && options.type !== 'all') {
    filterParts.push(`type:=${options.type}`);
  }
  if (options.status && options.status !== 'all') {
    filterParts.push(`status:=${options.status}`);
  }

  const result = await client
    .collections(CARDS_COLLECTION)
    .documents()
    .search({
      q: options.query,
      query_by: 'title,subtitle,excerpt,content_text,tag_names,who_names,what_names,when_names,where_names',
      query_by_weights: '10,5,4,2,3,3,3,3,3',
      filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      page: options.page || 1,
      per_page: options.perPage || 50,
      sort_by: '_text_match:desc,updated_at:desc',
    });

  const docIds = (result.hits ?? [])
    .map((hit) => (hit.document as TypesenseCardDocument).id)
    .filter(Boolean);

  return {
    docIds,
    totalFound: result.found ?? 0,
  };
}

export async function dropCardsCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  try {
    await client.collections(CARDS_COLLECTION).delete();
  } catch {
    // Collection may not exist
  }
}

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

async function resolveTagNames(tagIds: string[]): Promise<Map<string, string>> {
  if (tagIds.length === 0) return new Map();

  const { getAdminApp } = await import('@/lib/config/firebase/admin');
  const db = getAdminApp().firestore();

  const BATCH = 30;
  const nameMap = new Map<string, string>();
  for (let i = 0; i < tagIds.length; i += BATCH) {
    const batch = tagIds.slice(i, i + BATCH);
    const snap = await db.collection('tags').where('__name__', 'in', batch).get();
    snap.forEach(doc => nameMap.set(doc.id, doc.data().name || doc.id));
  }
  return nameMap;
}

function lookupNames(ids: string[] | undefined, nameMap: Map<string, string>): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map(id => nameMap.get(id) || id);
}

/**
 * Builds a TypesenseCardDocument from a Card, resolves tag names, and upserts.
 * Fire-and-forget — logs errors but never throws.
 */
export async function syncCardToTypesense(card: Card): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const allTagIds = [
      ...(card.tags || []),
      ...(card.who || []),
      ...(card.what || []),
      ...(card.when || []),
      ...(card.where || []),
    ];
    const unique = [...new Set(allTagIds)];
    const nameMap = await resolveTagNames(unique);

    const contentText = card.content ? stripHtml(card.content) : '';

    const doc: TypesenseCardDocument = {
      id: card.docId,
      title: card.title || '',
      subtitle: card.subtitle || undefined,
      excerpt: card.excerpt || undefined,
      content_text: contentText.length > 0 ? contentText.substring(0, 10000) : undefined,
      type: card.type || 'story',
      status: card.status || 'draft',
      tag_names: lookupNames(card.tags, nameMap),
      who_names: lookupNames(card.who, nameMap),
      what_names: lookupNames(card.what, nameMap),
      when_names: lookupNames(card.when, nameMap),
      where_names: lookupNames(card.where, nameMap),
      created_at: Math.floor(Number(card.createdAt) || 0),
      updated_at: Math.floor(Number(card.updatedAt) || 0),
      journal_when_sort:
        card.journalWhenSortDesc != null ? Math.floor(Number(card.journalWhenSortDesc)) : undefined,
    };

    await upsertCard(doc);
  } catch (err) {
    console.error(`[Typesense] Failed to sync card ${card.docId}:`, err);
  }
}

/**
 * Removes a card from the Typesense index.
 * Fire-and-forget — logs errors but never throws.
 */
export async function removeCardFromTypesense(cardId: string): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    await deleteCard(cardId);
  } catch (err) {
    console.error(`[Typesense] Failed to remove card ${cardId}:`, err);
  }
}
