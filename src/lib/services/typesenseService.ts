import type {
  BaseCollectionCreateSchema,
  Client,
  CollectionFieldSchema,
  CollectionSchema,
} from 'typesense';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import { Card } from '@/lib/types/card';

const CARDS_COLLECTION = 'cards';

const cardsSchema: BaseCollectionCreateSchema & { fields: CollectionFieldSchema[] } = {
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
    /** Direct + inherited tag ids (matches `filterTags` keys) for AND filtering. */
    { name: 'filter_tag_ids', type: 'string[]', optional: true, facet: true },
    { name: 'tag_ids', type: 'string[]', optional: true, facet: true },
    { name: 'who_ids', type: 'string[]', optional: true, facet: true },
    { name: 'what_ids', type: 'string[]', optional: true, facet: true },
    { name: 'when_ids', type: 'string[]', optional: true, facet: true },
    { name: 'where_ids', type: 'string[]', optional: true, facet: true },
    { name: 'media_who_ids', type: 'string[]', optional: true, facet: true },
    { name: 'media_what_ids', type: 'string[]', optional: true, facet: true },
    { name: 'media_when_ids', type: 'string[]', optional: true, facet: true },
    { name: 'media_where_ids', type: 'string[]', optional: true, facet: true },
    { name: 'child_ids', type: 'string[]', optional: true, facet: true },
    /** `sort: true` required for `sort_by` on string fields (Typesense default is sort off for strings). */
    { name: 'title_lowercase', type: 'string', optional: true, facet: false, sort: true },
    { name: 'who_sort_key', type: 'string', optional: true, facet: false, sort: true },
    { name: 'what_sort_key', type: 'string', optional: true, facet: false, sort: true },
    { name: 'where_sort_key', type: 'string', optional: true, facet: false, sort: true },
    { name: 'created_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
    /** Packed When sort keys (Firestore mirrors). */
    { name: 'journal_when_sort', type: 'int64', facet: false, optional: true },
    { name: 'journal_when_sort_asc', type: 'int64', facet: false, optional: true },
    /** Cardinality for “missing dimension” filters. */
    { name: 'who_count', type: 'int32', facet: true, optional: true },
    { name: 'what_count', type: 'int32', facet: true, optional: true },
    { name: 'when_count', type: 'int32', facet: true, optional: true },
    { name: 'where_count', type: 'int32', facet: true, optional: true },
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
  filter_tag_ids?: string[];
  tag_ids?: string[];
  who_ids?: string[];
  what_ids?: string[];
  when_ids?: string[];
  where_ids?: string[];
  media_who_ids?: string[];
  media_what_ids?: string[];
  media_when_ids?: string[];
  media_where_ids?: string[];
  child_ids?: string[];
  title_lowercase?: string;
  who_sort_key?: string;
  what_sort_key?: string;
  where_sort_key?: string;
  created_at: number;
  updated_at: number;
  journal_when_sort?: number;
  journal_when_sort_asc?: number;
  who_count?: number;
  what_count?: number;
  when_count?: number;
  where_count?: number;
}

type CollectionFieldPatch = CollectionFieldSchema | { name: string; drop: true };

/**
 * Existing Typesense collections may have been created before `sort: true` on string sort keys.
 * Patch in place (drop + re-add field) then rely on `sync:typesense` to re-upsert documents.
 */
async function patchCardsCollectionSortableStringFields(
  client: Client,
  existing: CollectionSchema
): Promise<void> {
  const fields = existing.fields ?? [];
  const patchFields: CollectionFieldPatch[] = [];
  const sortableNames = ['title_lowercase', 'who_sort_key', 'what_sort_key', 'where_sort_key'] as const;

  for (const name of sortableNames) {
    const f = fields.find((x) => x.name === name);
    if (f && f.type === 'string' && f.sort !== true) {
      patchFields.push({ name, drop: true });
      patchFields.push({
        name,
        type: 'string',
        optional: true,
        facet: false,
        sort: true,
      });
    }
  }

  if (patchFields.length === 0) return;

  // eslint-disable-next-line no-console
  console.warn(
    '[Typesense] Updating cards schema: enabling sort on',
    sortableNames.filter((n) => patchFields.some((p) => 'drop' in p && p.name === n)).join(', ')
  );
  await client.collections(CARDS_COLLECTION).update({ fields: patchFields });
  // eslint-disable-next-line no-console
  console.warn('[Typesense] Re-upsert cards (e.g. npm run sync:typesense) so sort fields are repopulated.');
}

export async function ensureCardsCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  try {
    const existing = await client.collections(CARDS_COLLECTION).retrieve();
    await patchCardsCollectionSortableStringFields(client, existing);
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
  searchScope?: 'default' | 'admin-title';
}

export interface SearchResult {
  docIds: string[];
  totalFound: number;
}

export type TypesenseCardSortField = 'when' | 'created' | 'title' | 'who' | 'what' | 'where';

export interface SearchCardsFilteredOptions {
  /** User text search; omit or empty for browse-all (`*`). */
  textQuery?: string;
  type?: string;
  /** OR filter on card type when 2+ values; takes precedence over single `type`. */
  types?: string[];
  status?: string;
  /** AND: every id must appear in `filter_tag_ids` (inherited + direct). */
  tags?: string[];
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** Direct-tag dimensional match: OR within a dimension, AND across dimensions. */
  exactDimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** Card’s `childrenIds` must contain this id. */
  childrenIds_contains?: string;
  dimensionMissing?: {
    who?: boolean;
    what?: boolean;
    when?: boolean;
    where?: boolean;
  };
  /** Zero-based page index (infinite scroll). */
  page: number;
  perPage: number;
  sortBy: TypesenseCardSortField;
  sortDir: 'asc' | 'desc';
  searchScope?: 'default' | 'admin-title';
}

function escapeFilterValue(value: string): string {
  return '`' + value.replace(/`/g, '``') + '`';
}

function orGroup(field: string, ids: string[] | undefined): string | null {
  if (!ids || ids.length === 0) return null;
  if (ids.length === 1) return `${field}:=${escapeFilterValue(ids[0])}`;
  return `(${ids.map((id) => `${field}:=${escapeFilterValue(id)}`).join(' || ')})`;
}

function buildListSort(
  sortBy: TypesenseCardSortField,
  sortDir: 'asc' | 'desc',
  hasTextQuery: boolean
): string {
  if (hasTextQuery) {
    return '_text_match:desc,updated_at:desc';
  }
  /** Tie-breaker only — `id` is not declared in our Typesense schema (sorting by it 404s the whole query). */
  const tie = 'updated_at:desc,title_lowercase:asc';
  if (sortBy === 'created') {
    return sortDir === 'asc' ? `created_at:asc,${tie}` : `created_at:desc,${tie}`;
  }
  if (sortBy === 'title') {
    return sortDir === 'asc' ? `title_lowercase:asc,${tie}` : `title_lowercase:desc,${tie}`;
  }
  if (sortBy === 'who') {
    return sortDir === 'asc'
      ? `who_sort_key:asc,title_lowercase:asc,${tie}`
      : `who_sort_key:desc,title_lowercase:asc,${tie}`;
  }
  if (sortBy === 'what') {
    return sortDir === 'asc'
      ? `what_sort_key:asc,title_lowercase:asc,${tie}`
      : `what_sort_key:desc,title_lowercase:asc,${tie}`;
  }
  if (sortBy === 'where') {
    return sortDir === 'asc'
      ? `where_sort_key:asc,title_lowercase:asc,${tie}`
      : `where_sort_key:desc,title_lowercase:asc,${tie}`;
  }
  // when
  return sortDir === 'asc'
    ? `journal_when_sort_asc:asc,${tie}`
    : `journal_when_sort:desc,${tie}`;
}

/**
 * Full-text + facet browse for cards. Uses Typesense `filter_by` so multiple
 * dimensional array constraints (illegal in one Firestore query) are supported.
 */
export async function searchCardsFiltered(
  options: SearchCardsFilteredOptions
): Promise<SearchResult> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  const filterParts: string[] = [];
  if (options.types && options.types.length > 1) {
    filterParts.push(
      `(${options.types.map((t) => `type:=${escapeFilterValue(t)}`).join(' || ')})`
    );
  } else if (options.type && options.type !== 'all') {
    filterParts.push(`type:=${escapeFilterValue(options.type)}`);
  }
  if (options.status && options.status !== 'all') {
    filterParts.push(`status:=${escapeFilterValue(options.status)}`);
  }

  if (options.tags && options.tags.length > 0) {
    for (const tag of options.tags) {
      if (tag) filterParts.push(`filter_tag_ids:=${escapeFilterValue(tag)}`);
    }
  }

  const dim = options.dimensionalTags;
  if (dim) {
    const w = orGroup('who_ids', dim.who);
    if (w) filterParts.push(w);
    const x = orGroup('what_ids', dim.what);
    if (x) filterParts.push(x);
    const y = orGroup('when_ids', dim.when);
    if (y) filterParts.push(y);
    const z = orGroup('where_ids', dim.where);
    if (z) filterParts.push(z);
  }

  const exactDim = options.exactDimensionalTags;
  if (exactDim) {
    const w = orGroup('tag_ids', exactDim.who);
    if (w) filterParts.push(w);
    const x = orGroup('tag_ids', exactDim.what);
    if (x) filterParts.push(x);
    const y = orGroup('tag_ids', exactDim.when);
    if (y) filterParts.push(y);
    const z = orGroup('tag_ids', exactDim.where);
    if (z) filterParts.push(z);
  }

  if (options.childrenIds_contains) {
    filterParts.push(`child_ids:=${escapeFilterValue(options.childrenIds_contains)}`);
  }

  const miss = options.dimensionMissing;
  if (miss) {
    if (miss.who) filterParts.push('who_count:=0');
    if (miss.what) filterParts.push('what_count:=0');
    if (miss.when) filterParts.push('when_count:=0');
    if (miss.where) filterParts.push('where_count:=0');
  }

  const hasText = Boolean(options.textQuery && options.textQuery.trim().length > 0);
  const isAdminTitleScope = options.searchScope === 'admin-title';
  const queryBy = isAdminTitleScope
    ? 'title,subtitle'
    : 'title,subtitle,excerpt,content_text,tag_names,who_names,what_names,when_names,where_names';
  const queryByWeights = isAdminTitleScope ? '10,5' : '10,5,4,2,3,3,3,3,3';

  const q = hasText ? options.textQuery!.trim() : '*';
  const sortBy = options.sortBy;
  const sortDir = options.sortDir;
  const sortByResolved = sortBy ?? 'when';
  const sortDirResolved = sortDir ?? 'desc';

  const tsPage = Math.max(1, options.page + 1);

  // Defensive cap: Typesense Cloud rejects per_page > 250 with HTTP 422.
  // See docs/01-Vision-Architecture.md → Typesense list limits.
  const safePerPage = Math.min(Math.max(1, options.perPage || 50), 250);

  const result = await client.collections(CARDS_COLLECTION).documents().search({
    q,
    query_by: queryBy,
    query_by_weights: queryByWeights,
    filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
    page: tsPage,
    per_page: safePerPage,
    sort_by: buildListSort(sortByResolved, sortDirResolved, hasText),
  });

  const docIds = (result.hits ?? [])
    .map((hit) => (hit.document as TypesenseCardDocument).id)
    .filter(Boolean);

  return {
    docIds,
    totalFound: result.found ?? 0,
  };
}

export async function searchCards(options: SearchOptions): Promise<SearchResult> {
  return searchCardsFiltered({
    textQuery: options.query?.trim() || undefined,
    type: options.type,
    status: options.status,
    page: Math.max(0, (options.page ?? 1) - 1),
    perPage: options.perPage || 50,
    sortBy: 'when',
    sortDir: 'desc',
    searchScope: options.searchScope,
  });
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
    snap.forEach((doc) => nameMap.set(doc.id, doc.data().name || doc.id));
  }
  return nameMap;
}

function lookupNames(ids: string[] | undefined, nameMap: Map<string, string>): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => nameMap.get(id) || id);
}

/** Shared Firestore → Typesense card document (script + runtime sync). */
export function buildTypesenseCardDocumentFromData(
  docId: string,
  data: Record<string, unknown>,
  tagMap: Map<string, string>
): TypesenseCardDocument {
  const tags = (data.tags as string[] | undefined) ?? [];
  const who = (data.who as string[] | undefined) ?? [];
  const what = (data.what as string[] | undefined) ?? [];
  const when = (data.when as string[] | undefined) ?? [];
  const where = (data.where as string[] | undefined) ?? [];
  const filterTags = (data.filterTags as Record<string, boolean> | undefined) ?? {};
  const filterTagIds = Object.keys(filterTags).filter((k) => filterTags[k]);

  const contentRaw = data.content as string | undefined;
  const contentText = contentRaw ? stripHtml(contentRaw) : '';

  const title = (data.title as string) || '';
  const titleLower =
    (data.title_lowercase as string | undefined) ||
    title.toLowerCase();

  return {
    id: docId,
    title,
    subtitle: (data.subtitle as string | undefined) || undefined,
    excerpt: (data.excerpt as string | undefined) || undefined,
    content_text: contentText.length > 0 ? contentText.substring(0, 10000) : undefined,
    type: (data.type as string) || 'story',
    status: (data.status as string) || 'draft',
    tag_names: lookupNames(tags, tagMap),
    who_names: lookupNames(who, tagMap),
    what_names: lookupNames(what, tagMap),
    when_names: lookupNames(when, tagMap),
    where_names: lookupNames(where, tagMap),
    filter_tag_ids: filterTagIds.length > 0 ? filterTagIds : undefined,
    tag_ids: tags.length > 0 ? tags : undefined,
    who_ids: who.length > 0 ? who : undefined,
    what_ids: what.length > 0 ? what : undefined,
    when_ids: when.length > 0 ? when : undefined,
    where_ids: where.length > 0 ? where : undefined,
    media_who_ids: ((data.mediaWho as string[] | undefined) ?? []).length
      ? (data.mediaWho as string[])
      : undefined,
    media_what_ids: ((data.mediaWhat as string[] | undefined) ?? []).length
      ? (data.mediaWhat as string[])
      : undefined,
    media_when_ids: ((data.mediaWhen as string[] | undefined) ?? []).length
      ? (data.mediaWhen as string[])
      : undefined,
    media_where_ids: ((data.mediaWhere as string[] | undefined) ?? []).length
      ? (data.mediaWhere as string[])
      : undefined,
    child_ids: ((data.childrenIds as string[] | undefined) ?? []).length
      ? (data.childrenIds as string[])
      : undefined,
    title_lowercase: titleLower || undefined,
    who_sort_key: (data.whoSortKey as string | undefined) || undefined,
    what_sort_key: (data.whatSortKey as string | undefined) || undefined,
    where_sort_key: (data.whereSortKey as string | undefined) || undefined,
    created_at: Math.floor(Number(data.createdAt) || 0),
    updated_at: Math.floor(Number(data.updatedAt) || 0),
    journal_when_sort:
      data.journalWhenSortDesc != null ? Math.floor(Number(data.journalWhenSortDesc)) : undefined,
    journal_when_sort_asc:
      data.journalWhenSortAsc != null ? Math.floor(Number(data.journalWhenSortAsc)) : undefined,
    who_count: who.length,
    what_count: what.length,
    when_count: when.length,
    where_count: where.length,
  };
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

    const data = { ...card } as unknown as Record<string, unknown>;
    const doc = buildTypesenseCardDocumentFromData(card.docId, data, nameMap);

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
