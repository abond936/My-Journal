import { FieldPath } from 'firebase-admin/firestore';
import type { BaseCollectionCreateSchema, CollectionFieldSchema } from 'typesense';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import { Media } from '@/lib/types/photo';
import type { DimensionalTagIdMap } from '@/lib/utils/tagUtils';
import { dimensionalTagMapHasFilters } from '@/lib/utils/tagUtils';

const MEDIA_COLLECTION = 'media';

const mediaSchema: BaseCollectionCreateSchema & { fields: CollectionFieldSchema[] } = {
  name: MEDIA_COLLECTION,
  fields: [
    { name: 'searchable', type: 'string', facet: false },
    { name: 'status', type: 'string', facet: true },
    { name: 'source', type: 'string', facet: true },
    { name: 'shape', type: 'string', facet: true },
    { name: 'has_caption', type: 'bool', facet: true },
    { name: 'assigned', type: 'bool', facet: true },
    { name: 'who_ids', type: 'string[]', facet: true, optional: true },
    { name: 'what_ids', type: 'string[]', facet: true, optional: true },
    { name: 'when_ids', type: 'string[]', facet: true, optional: true },
    { name: 'where_ids', type: 'string[]', facet: true, optional: true },
    { name: 'created_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

/** Indexed for schema compatibility; not used for filtering (media has no lifecycle status). */
const TYPESENSE_MEDIA_STATUS_PLACEHOLDER = 'library';

export interface TypesenseMediaDocument {
  id: string;
  searchable: string;
  status: string;
  source: string;
  shape: 'portrait' | 'landscape' | 'square';
  has_caption: boolean;
  assigned: boolean;
  who_ids?: string[];
  what_ids?: string[];
  when_ids?: string[];
  where_ids?: string[];
  created_at: number;
}

function mediaShapeFromDimensions(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (!width || !height) return 'square';
  const r = width / height;
  if (r < 1) return 'portrait';
  if (r > 1) return 'landscape';
  return 'square';
}

function isAssigned(m: Media): boolean {
  return Array.isArray(m.referencedByCardIds) && m.referencedByCardIds.length > 0;
}

async function resolveTagNames(tagIds: string[]): Promise<Map<string, string>> {
  if (tagIds.length === 0) return new Map();

  const { getAdminApp } = await import('@/lib/config/firebase/admin');
  const db = getAdminApp().firestore();

  const BATCH = 30;
  const nameMap = new Map<string, string>();
  const unique = [...new Set(tagIds)];
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const snap = await db.collection('tags').where(FieldPath.documentId(), 'in', batch).get();
    snap.forEach((doc) => nameMap.set(doc.id, (doc.data().name as string) || doc.id));
  }
  return nameMap;
}

function lookupNames(ids: string[] | undefined, nameMap: Map<string, string>): string[] {
  if (!ids?.length) return [];
  return ids.map((id) => nameMap.get(id) || id);
}

function collectAllTagIds(media: Media): string[] {
  const raw = [
    ...(media.tags ?? []),
    ...(media.who ?? []),
    ...(media.what ?? []),
    ...(media.when ?? []),
    ...(media.where ?? []),
  ];
  if (media.filterTags) {
    raw.push(...Object.keys(media.filterTags));
  }
  return [...new Set(raw.filter(Boolean))];
}

export function mediaToTypesenseDocument(media: Media, nameMap: Map<string, string>): TypesenseMediaDocument {
  const allIds = collectAllTagIds(media);
  const namesForSearch = lookupNames(allIds, nameMap);
  const parts = [
    media.filename || '',
    media.caption || '',
    media.sourcePath || '',
    ...namesForSearch,
  ].filter(Boolean);

  return {
    id: media.docId,
    searchable: parts.join(' ').slice(0, 32000),
    status: TYPESENSE_MEDIA_STATUS_PLACEHOLDER,
    source: media.source || 'local',
    shape: mediaShapeFromDimensions(media.width, media.height),
    has_caption: Boolean(media.caption && media.caption.trim()),
    assigned: isAssigned(media),
    who_ids: media.who?.length ? [...media.who] : undefined,
    what_ids: media.what?.length ? [...media.what] : undefined,
    when_ids: media.when?.length ? [...media.when] : undefined,
    where_ids: media.where?.length ? [...media.where] : undefined,
    created_at: Math.floor(Number(media.createdAt) || 0),
  };
}

export async function ensureMediaCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  try {
    await client.collections(MEDIA_COLLECTION).retrieve();
  } catch {
    await client.collections().create(mediaSchema);
  }
}

export async function upsertMediaDoc(doc: TypesenseMediaDocument): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;
  await client.collections(MEDIA_COLLECTION).documents().upsert(doc);
}

export async function deleteMediaDoc(docId: string): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;
  try {
    await client.collections(MEDIA_COLLECTION).documents(docId).delete();
  } catch {
    // may not exist
  }
}

export async function importMediaDocs(docs: TypesenseMediaDocument[]): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');
  await client.collections(MEDIA_COLLECTION).documents().import(docs, { action: 'upsert' });
}

export async function dropMediaCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');
  try {
    await client.collections(MEDIA_COLLECTION).delete();
  } catch {
    // none
  }
}

/**
 * Fire-and-forget — logs errors.
 */
export async function syncMediaToTypesense(media: Media): Promise<void> {
  if (!isTypesenseConfigured()) return;
  try {
    const ids = collectAllTagIds(media);
    const nameMap = await resolveTagNames(ids);
    const doc = mediaToTypesenseDocument(media, nameMap);
    await upsertMediaDoc(doc);
  } catch (err) {
    console.error(`[Typesense media] Failed to sync ${media.docId}:`, err);
  }
}

export async function syncMediaToTypesenseById(mediaId: string): Promise<void> {
  if (!isTypesenseConfigured()) return;
  try {
    const { getAdminApp } = await import('@/lib/config/firebase/admin');
    const snap = await getAdminApp().firestore().collection('media').doc(mediaId).get();
    if (!snap.exists) return;
    const data = snap.data() as Media;
    await syncMediaToTypesense({ ...data, docId: snap.id });
  } catch (err) {
    console.error(`[Typesense media] Failed to sync by id ${mediaId}:`, err);
  }
}

export async function removeMediaFromTypesense(mediaId: string): Promise<void> {
  if (!isTypesenseConfigured()) return;
  try {
    await deleteMediaDoc(mediaId);
  } catch (err) {
    console.error(`[Typesense media] Failed to remove ${mediaId}:`, err);
  }
}

export interface MediaTypesenseSearchParams {
  query: string;
  page: number;
  perPage: number;
  source: string | null;
  dimensions: string | null;
  hasCaption: string | null;
  assignment: string | null;
  dimensionalTags: DimensionalTagIdMap;
}

function buildDimensionalFilters(dt: DimensionalTagIdMap): string[] {
  if (!dimensionalTagMapHasFilters(dt)) return [];
  const clauses: string[] = [];

  const dims: { field: string; ids: string[] }[] = [
    { field: 'who_ids', ids: dt.who ?? [] },
    { field: 'what_ids', ids: dt.what ?? [] },
    { field: 'when_ids', ids: dt.when ?? [] },
    { field: 'where_ids', ids: dt.where ?? [] },
  ];

  for (const { field, ids } of dims) {
    if (!ids.length) continue;
    const ors = ids.map((id) => `${field}:=${escapeFilterValue(id)}`).join(' || ');
    clauses.push(`(${ors})`);
  }
  return clauses;
}

function escapeFilterValue(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export interface MediaTypesenseSearchResult {
  docIds: string[];
  found: number;
  page: number;
  hasNext: boolean;
}

/**
 * @throws if Typesense client missing (caller checks isTypesenseConfigured)
 */
export async function searchMediaTypesense(
  params: MediaTypesenseSearchParams
): Promise<MediaTypesenseSearchResult> {
  const client = getTypesenseClient();
  if (!client) throw new Error('Typesense not configured');

  const filterParts: string[] = [];

  if (params.source && params.source !== 'all') {
    filterParts.push(`source:=${escapeFilterValue(params.source)}`);
  }
  if (params.dimensions && params.dimensions !== 'all') {
    filterParts.push(`shape:=${escapeFilterValue(params.dimensions)}`);
  }
  if (params.hasCaption === 'with') {
    filterParts.push('has_caption:=true');
  } else if (params.hasCaption === 'without') {
    filterParts.push('has_caption:=false');
  }
  if (params.assignment === 'assigned') {
    filterParts.push('assigned:=true');
  } else if (params.assignment === 'unassigned') {
    filterParts.push('assigned:=false');
  }

  filterParts.push(...buildDimensionalFilters(params.dimensionalTags));

  const q = params.query.trim() || '*';
  const sortBy =
    q === '*' ? 'created_at:desc' : '_text_match:desc,created_at:desc';

  // Defensive cap: Typesense Cloud rejects per_page > 250 with HTTP 422.
  // See docs/01-Vision-Architecture.md → Typesense list limits.
  const safePerPage = Math.min(Math.max(1, params.perPage || 50), 250);

  const result = await client.collections(MEDIA_COLLECTION).documents().search({
    q,
    query_by: 'searchable',
    filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
    page: params.page,
    per_page: safePerPage,
    sort_by: sortBy,
  });

  const docIds = (result.hits ?? [])
    .map((hit) => (hit.document as TypesenseMediaDocument).id)
    .filter(Boolean);

  const found = result.found ?? 0;
  const page = params.page;
  const hasNext = page * params.perPage < found;

  return { docIds, found, page, hasNext };
}
