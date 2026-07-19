/**
 * API route access audit (review program slice 3b).
 * Canonical classification for authorization review and automated boundary tests.
 */

export type ApiAccessClass = 'public-auth' | 'authenticated-reader' | 'admin-only';

export type ApiRouteAuditEntry = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  access: ApiAccessClass;
  /** Expected HTTP status for anonymous callers (or null when not applicable). */
  anonymousStatus: 401 | 403 | null;
  /** Expected for viewer sessions: allowed read, or rejection status. */
  viewer: 'allowed' | 401 | 403 | 404;
  notes?: string;
};

export type AdminRouteBoundaryCase = {
  id: string;
  method: ApiRouteAuditEntry['method'];
  path: string;
  modulePath: string;
  requestUrl: string;
  params?: Promise<{ id: string }>;
  body?: unknown;
};

/** Full route inventory — mirrored in docs/02-Application.md (API route access audit). */
export const API_ROUTE_ACCESS_AUDIT: readonly ApiRouteAuditEntry[] = [
  { method: 'GET', path: '/api/auth/[...nextauth]', access: 'public-auth', anonymousStatus: null, viewer: 'allowed', notes: 'NextAuth handler' },

  { method: 'GET', path: '/api/account/preferences', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed', notes: 'Current account only' },
  { method: 'PATCH', path: '/api/account/preferences', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed', notes: 'Current account only' },

  { method: 'GET', path: '/api/cards', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },
  { method: 'POST', path: '/api/cards', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/cards/search', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },
  { method: 'GET', path: '/api/cards/random', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },
  { method: 'GET', path: '/api/cards/by-ids', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/cards/bulk-update-tags', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/cards/[id]', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed', notes: 'Draft cards return 404 for viewers' },
  { method: 'PUT', path: '/api/cards/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/cards/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/cards/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/cards/[id]/duplicate', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/view/media', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },

  { method: 'GET', path: '/api/tags', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },
  { method: 'POST', path: '/api/tags', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/tags/[id]', access: 'authenticated-reader', anonymousStatus: 401, viewer: 'allowed' },
  { method: 'PUT', path: '/api/tags/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/tags/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/tags/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/tags/[id]/reparent', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/media', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/media/reference-summary', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/images/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/images/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/images/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/images/[id]/replace', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/images/browser', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/images/local/file', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/images/local/folder-tree', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/images/local/folder-contents', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/images/local/import', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'POST', path: '/api/import/batch', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/import/batch/preview', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/import/folder', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/import/folder/preview', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/theme', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/theme', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/theme/draft-css', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'POST', path: '/api/ai/suggest-card-drafts', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/journal-users', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/journal-users', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/journal-users/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/archive-identity', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/archive-identity', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/archive-identity/[entity]/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/admin/archive-identity/[entity]/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/archive-identity/perspective', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/admin/archive-identity/review', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/questions', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/questions', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/questions/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PUT', path: '/api/admin/questions/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/questions/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/admin/questions/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/questions/[id]/create-card', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'POST', path: '/api/admin/media/tags', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/admin/media/duplicates', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/media/duplicates', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/admin/media/readiness/audit', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/media/readiness/[id]/retry', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/media/review', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/media/review', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/media/review/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/media/review/[id]/actions', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/media/stacks', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/media/stacks', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/admin/media/stacks/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'PATCH', path: '/api/admin/media/stacks/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'DELETE', path: '/api/admin/media/stacks/[id]', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'POST', path: '/api/admin/maintenance/backfill', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/maintenance/cleanup', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/maintenance/diagnose-cover', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/maintenance/reconcile', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'GET', path: '/api/admin/maintenance/typesense-status', access: 'admin-only', anonymousStatus: 403, viewer: 403 },

  { method: 'GET', path: '/api/admin/settings/operations', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
  { method: 'POST', path: '/api/admin/settings/operations', access: 'admin-only', anonymousStatus: 403, viewer: 403 },
] as const;

/** Mutation write routes receive per-actor rate limits in middleware (post-review step 8a). */
export const MUTATION_ROUTE_RATE_LIMIT_NOTE =
  'POST/PUT/PATCH/DELETE /api/* (except /api/auth) — see mutationRateLimit.ts buckets enforced in middleware.ts';

/** Handlers exercised by automated admin-boundary tests (`admin-api-access-route.test.ts`). */
export const ADMIN_ROUTE_BOUNDARY_CASES: readonly AdminRouteBoundaryCase[] = [
  { id: 'cards-post', method: 'POST', path: '/api/cards', modulePath: '@/app/api/cards/route', requestUrl: 'https://example.test/api/cards', body: { title: 'x', type: 'story' } },
  { id: 'cards-by-ids', method: 'GET', path: '/api/cards/by-ids', modulePath: '@/app/api/cards/by-ids/route', requestUrl: 'https://example.test/api/cards/by-ids?id=card-1' },
  { id: 'cards-bulk-update-tags', method: 'POST', path: '/api/cards/bulk-update-tags', modulePath: '@/app/api/cards/bulk-update-tags/route', requestUrl: 'https://example.test/api/cards/bulk-update-tags', body: { cardIds: [], tagIds: [] } },
  { id: 'cards-id-put', method: 'PUT', path: '/api/cards/[id]', modulePath: '@/app/api/cards/[id]/route', requestUrl: 'https://example.test/api/cards/card-1', params: Promise.resolve({ id: 'card-1' }), body: { title: 'Updated' } },
  { id: 'cards-id-patch', method: 'PATCH', path: '/api/cards/[id]', modulePath: '@/app/api/cards/[id]/route', requestUrl: 'https://example.test/api/cards/card-1', params: Promise.resolve({ id: 'card-1' }), body: { title: 'Updated' } },
  { id: 'cards-id-delete', method: 'DELETE', path: '/api/cards/[id]', modulePath: '@/app/api/cards/[id]/route', requestUrl: 'https://example.test/api/cards/card-1', params: Promise.resolve({ id: 'card-1' }) },
  { id: 'cards-id-duplicate', method: 'POST', path: '/api/cards/[id]/duplicate', modulePath: '@/app/api/cards/[id]/duplicate/route', requestUrl: 'https://example.test/api/cards/card-1/duplicate', params: Promise.resolve({ id: 'card-1' }) },

  { id: 'tags-post', method: 'POST', path: '/api/tags', modulePath: '@/app/api/tags/route', requestUrl: 'https://example.test/api/tags', body: { name: 'Test', dimension: 'what' } },
  { id: 'tags-id-put', method: 'PUT', path: '/api/tags/[id]', modulePath: '@/app/api/tags/[id]/route', requestUrl: 'https://example.test/api/tags/tag-1', params: Promise.resolve({ id: 'tag-1' }), body: { name: 'Renamed' } },
  { id: 'tags-id-patch', method: 'PATCH', path: '/api/tags/[id]', modulePath: '@/app/api/tags/[id]/route', requestUrl: 'https://example.test/api/tags/tag-1', params: Promise.resolve({ id: 'tag-1' }), body: { name: 'Renamed' } },
  { id: 'tags-id-delete', method: 'DELETE', path: '/api/tags/[id]', modulePath: '@/app/api/tags/[id]/route', requestUrl: 'https://example.test/api/tags/tag-1', params: Promise.resolve({ id: 'tag-1' }) },
  { id: 'tags-id-reparent', method: 'POST', path: '/api/tags/[id]/reparent', modulePath: '@/app/api/tags/[id]/reparent/route', requestUrl: 'https://example.test/api/tags/tag-1/reparent', params: Promise.resolve({ id: 'tag-1' }), body: { newParentId: 'tag-2' } },

  { id: 'media-get', method: 'GET', path: '/api/media', modulePath: '@/app/api/media/route', requestUrl: 'https://example.test/api/media' },
  { id: 'media-reference-summary', method: 'GET', path: '/api/media/reference-summary', modulePath: '@/app/api/media/reference-summary/route', requestUrl: 'https://example.test/api/media/reference-summary?id=media-1' },

  { id: 'images-id-get', method: 'GET', path: '/api/images/[id]', modulePath: '@/app/api/images/[id]/route', requestUrl: 'https://example.test/api/images/media-1', params: Promise.resolve({ id: 'media-1' }) },
  { id: 'images-id-patch', method: 'PATCH', path: '/api/images/[id]', modulePath: '@/app/api/images/[id]/route', requestUrl: 'https://example.test/api/images/media-1', params: Promise.resolve({ id: 'media-1' }), body: { caption: 'x' } },
  { id: 'images-id-delete', method: 'DELETE', path: '/api/images/[id]', modulePath: '@/app/api/images/[id]/route', requestUrl: 'https://example.test/api/images/media-1', params: Promise.resolve({ id: 'media-1' }) },
  { id: 'images-id-replace', method: 'POST', path: '/api/images/[id]/replace', modulePath: '@/app/api/images/[id]/replace/route', requestUrl: 'https://example.test/api/images/media-1/replace', params: Promise.resolve({ id: 'media-1' }), body: {} },
  { id: 'images-browser', method: 'POST', path: '/api/images/browser', modulePath: '@/app/api/images/browser/route', requestUrl: 'https://example.test/api/images/browser', body: {} },
  { id: 'images-local-file', method: 'GET', path: '/api/images/local/file', modulePath: '@/app/api/images/local/file/route', requestUrl: 'https://example.test/api/images/local/file?path=folder/a.jpg' },
  { id: 'images-local-folder-tree', method: 'GET', path: '/api/images/local/folder-tree', modulePath: '@/app/api/images/local/folder-tree/route', requestUrl: 'https://example.test/api/images/local/folder-tree' },
  { id: 'images-local-folder-contents', method: 'POST', path: '/api/images/local/folder-contents', modulePath: '@/app/api/images/local/folder-contents/route', requestUrl: 'https://example.test/api/images/local/folder-contents', body: { folderPath: 'folder' } },
  { id: 'images-local-import', method: 'POST', path: '/api/images/local/import', modulePath: '@/app/api/images/local/import/route', requestUrl: 'https://example.test/api/images/local/import', body: { sourcePaths: ['folder/a.jpg'] } },

  { id: 'import-batch', method: 'POST', path: '/api/import/batch', modulePath: '@/app/api/import/batch/route', requestUrl: 'https://example.test/api/import/batch', body: { folders: [] } },
  { id: 'import-batch-preview', method: 'POST', path: '/api/import/batch/preview', modulePath: '@/app/api/import/batch/preview/route', requestUrl: 'https://example.test/api/import/batch/preview', body: { folders: [] } },
  { id: 'import-folder', method: 'POST', path: '/api/import/folder', modulePath: '@/app/api/import/folder/route', requestUrl: 'https://example.test/api/import/folder', body: { importSourcePath: 'folder' } },
  { id: 'import-folder-preview', method: 'POST', path: '/api/import/folder/preview', modulePath: '@/app/api/import/folder/preview/route', requestUrl: 'https://example.test/api/import/folder/preview', body: { importSourcePath: 'folder' } },

  { id: 'theme-get', method: 'GET', path: '/api/theme', modulePath: '@/app/api/theme/route', requestUrl: 'https://example.test/api/theme' },
  { id: 'theme-post', method: 'POST', path: '/api/theme', modulePath: '@/app/api/theme/route', requestUrl: 'https://example.test/api/theme', body: {} },
  { id: 'theme-draft-css', method: 'POST', path: '/api/theme/draft-css', modulePath: '@/app/api/theme/draft-css/route', requestUrl: 'https://example.test/api/theme/draft-css', body: {} },

  { id: 'ai-suggest-card-drafts', method: 'POST', path: '/api/ai/suggest-card-drafts', modulePath: '@/app/api/ai/suggest-card-drafts/route', requestUrl: 'https://example.test/api/ai/suggest-card-drafts', body: {} },

  { id: 'admin-journal-users-get', method: 'GET', path: '/api/admin/journal-users', modulePath: '@/app/api/admin/journal-users/route', requestUrl: 'https://example.test/api/admin/journal-users' },
  { id: 'admin-journal-users-post', method: 'POST', path: '/api/admin/journal-users', modulePath: '@/app/api/admin/journal-users/route', requestUrl: 'https://example.test/api/admin/journal-users', body: { email: 'viewer@example.com', role: 'viewer' } },
  { id: 'admin-journal-users-patch', method: 'PATCH', path: '/api/admin/journal-users/[id]', modulePath: '@/app/api/admin/journal-users/[id]/route', requestUrl: 'https://example.test/api/admin/journal-users/user-1', params: Promise.resolve({ id: 'user-1' }), body: { disabled: true } },

  { id: 'admin-archive-identity-get', method: 'GET', path: '/api/admin/archive-identity', modulePath: '@/app/api/admin/archive-identity/route', requestUrl: 'https://example.test/api/admin/archive-identity' },
  { id: 'admin-archive-identity-post', method: 'POST', path: '/api/admin/archive-identity', modulePath: '@/app/api/admin/archive-identity/route', requestUrl: 'https://example.test/api/admin/archive-identity', body: { entity: 'person', data: { canonicalName: 'Test Person' } } },
  { id: 'admin-archive-identity-person-patch', method: 'PATCH', path: '/api/admin/archive-identity/[entity]/[id]', modulePath: '@/app/api/admin/archive-identity/[entity]/[id]/route', requestUrl: 'https://example.test/api/admin/archive-identity/person/person-1', params: Promise.resolve({ entity: 'person', id: 'person-1' }) as Promise<{ id: string }>, body: { canonicalName: 'Updated Person' } },
  { id: 'admin-archive-identity-group-delete', method: 'DELETE', path: '/api/admin/archive-identity/[entity]/[id]', modulePath: '@/app/api/admin/archive-identity/[entity]/[id]/route', requestUrl: 'https://example.test/api/admin/archive-identity/group/group-1', params: Promise.resolve({ entity: 'group', id: 'group-1' }) as Promise<{ id: string }> },
  { id: 'admin-archive-identity-perspective', method: 'PATCH', path: '/api/admin/archive-identity/perspective', modulePath: '@/app/api/admin/archive-identity/perspective/route', requestUrl: 'https://example.test/api/admin/archive-identity/perspective', body: { personId: null } },
  { id: 'admin-archive-identity-review', method: 'GET', path: '/api/admin/archive-identity/review', modulePath: '@/app/api/admin/archive-identity/review/route', requestUrl: 'https://example.test/api/admin/archive-identity/review' },

  { id: 'admin-questions-get', method: 'GET', path: '/api/admin/questions', modulePath: '@/app/api/admin/questions/route', requestUrl: 'https://example.test/api/admin/questions' },
  { id: 'admin-questions-post', method: 'POST', path: '/api/admin/questions', modulePath: '@/app/api/admin/questions/route', requestUrl: 'https://example.test/api/admin/questions', body: { prompt: 'Why?' } },
  { id: 'admin-questions-id-patch', method: 'PATCH', path: '/api/admin/questions/[id]', modulePath: '@/app/api/admin/questions/[id]/route', requestUrl: 'https://example.test/api/admin/questions/q-1', params: Promise.resolve({ id: 'q-1' }), body: { prompt: 'Updated?' } },
  { id: 'admin-questions-id-put', method: 'PUT', path: '/api/admin/questions/[id]', modulePath: '@/app/api/admin/questions/[id]/route', requestUrl: 'https://example.test/api/admin/questions/q-1', params: Promise.resolve({ id: 'q-1' }), body: { prompt: 'Updated?' } },
  { id: 'admin-questions-id-post', method: 'POST', path: '/api/admin/questions/[id]', modulePath: '@/app/api/admin/questions/[id]/route', requestUrl: 'https://example.test/api/admin/questions/q-1', params: Promise.resolve({ id: 'q-1' }), body: {} },
  { id: 'admin-questions-id-delete', method: 'DELETE', path: '/api/admin/questions/[id]', modulePath: '@/app/api/admin/questions/[id]/route', requestUrl: 'https://example.test/api/admin/questions/q-1', params: Promise.resolve({ id: 'q-1' }) },
  { id: 'admin-questions-create-card', method: 'POST', path: '/api/admin/questions/[id]/create-card', modulePath: '@/app/api/admin/questions/[id]/create-card/route', requestUrl: 'https://example.test/api/admin/questions/q-1/create-card', params: Promise.resolve({ id: 'q-1' }), body: {} },

  { id: 'admin-media-tags', method: 'POST', path: '/api/admin/media/tags', modulePath: '@/app/api/admin/media/tags/route', requestUrl: 'https://example.test/api/admin/media/tags', body: { mediaIds: [], tagIds: [] } },
  { id: 'admin-media-duplicates-get', method: 'GET', path: '/api/admin/media/duplicates', modulePath: '@/app/api/admin/media/duplicates/route', requestUrl: 'https://example.test/api/admin/media/duplicates?status=unresolved' },
  { id: 'admin-media-duplicates-post', method: 'POST', path: '/api/admin/media/duplicates', modulePath: '@/app/api/admin/media/duplicates/route', requestUrl: 'https://example.test/api/admin/media/duplicates', body: { mediaIds: ['m1', 'm2'], decision: 'defer' } },
  { id: 'admin-media-readiness-audit', method: 'GET', path: '/api/admin/media/readiness/audit', modulePath: '@/app/api/admin/media/readiness/audit/route', requestUrl: 'https://example.test/api/admin/media/readiness/audit' },
  { id: 'admin-media-readiness-retry', method: 'POST', path: '/api/admin/media/readiness/[id]/retry', modulePath: '@/app/api/admin/media/readiness/[id]/retry/route', requestUrl: 'https://example.test/api/admin/media/readiness/media-1/retry', params: Promise.resolve({ id: 'media-1' }), body: {} },

  { id: 'admin-media-review-get', method: 'GET', path: '/api/admin/media/review', modulePath: '@/app/api/admin/media/review/route', requestUrl: 'https://example.test/api/admin/media/review?lens=suggested' },
  { id: 'admin-media-review-post', method: 'POST', path: '/api/admin/media/review', modulePath: '@/app/api/admin/media/review/route', requestUrl: 'https://example.test/api/admin/media/review', body: { lens: 'suggested' } },
  { id: 'admin-media-review-patch', method: 'PATCH', path: '/api/admin/media/review/[id]', modulePath: '@/app/api/admin/media/review/[id]/route', requestUrl: 'https://example.test/api/admin/media/review/cluster-1', params: Promise.resolve({ id: 'cluster-1' }), body: { suggestedTagIds: {} } },
  { id: 'admin-media-review-actions', method: 'POST', path: '/api/admin/media/review/[id]/actions', modulePath: '@/app/api/admin/media/review/[id]/actions/route', requestUrl: 'https://example.test/api/admin/media/review/cluster-1/actions', params: Promise.resolve({ id: 'cluster-1' }), body: { action: 'dismiss' } },

  { id: 'admin-media-stacks-get', method: 'GET', path: '/api/admin/media/stacks', modulePath: '@/app/api/admin/media/stacks/route', requestUrl: 'https://example.test/api/admin/media/stacks' },
  { id: 'admin-media-stacks-post', method: 'POST', path: '/api/admin/media/stacks', modulePath: '@/app/api/admin/media/stacks/route', requestUrl: 'https://example.test/api/admin/media/stacks', body: { mediaIds: ['m1', 'm2'], kind: 'manual' } },
  { id: 'admin-media-stacks-get-id', method: 'GET', path: '/api/admin/media/stacks/[id]', modulePath: '@/app/api/admin/media/stacks/[id]/route', requestUrl: 'https://example.test/api/admin/media/stacks/stack-1', params: Promise.resolve({ id: 'stack-1' }) },
  { id: 'admin-media-stacks-patch', method: 'PATCH', path: '/api/admin/media/stacks/[id]', modulePath: '@/app/api/admin/media/stacks/[id]/route', requestUrl: 'https://example.test/api/admin/media/stacks/stack-1', params: Promise.resolve({ id: 'stack-1' }), body: { heroMediaId: 'm1' } },
  { id: 'admin-media-stacks-delete', method: 'DELETE', path: '/api/admin/media/stacks/[id]', modulePath: '@/app/api/admin/media/stacks/[id]/route', requestUrl: 'https://example.test/api/admin/media/stacks/stack-1', params: Promise.resolve({ id: 'stack-1' }) },

  { id: 'admin-maintenance-backfill', method: 'POST', path: '/api/admin/maintenance/backfill', modulePath: '@/app/api/admin/maintenance/backfill/route', requestUrl: 'https://example.test/api/admin/maintenance/backfill', body: { dryRun: true } },
  { id: 'admin-maintenance-cleanup', method: 'POST', path: '/api/admin/maintenance/cleanup', modulePath: '@/app/api/admin/maintenance/cleanup/route', requestUrl: 'https://example.test/api/admin/maintenance/cleanup', body: { dryRun: true } },
  { id: 'admin-maintenance-diagnose-cover', method: 'POST', path: '/api/admin/maintenance/diagnose-cover', modulePath: '@/app/api/admin/maintenance/diagnose-cover/route', requestUrl: 'https://example.test/api/admin/maintenance/diagnose-cover', body: {} },
  { id: 'admin-maintenance-reconcile', method: 'POST', path: '/api/admin/maintenance/reconcile', modulePath: '@/app/api/admin/maintenance/reconcile/route', requestUrl: 'https://example.test/api/admin/maintenance/reconcile', body: { dryRun: true } },
  { id: 'admin-maintenance-typesense-status', method: 'GET', path: '/api/admin/maintenance/typesense-status', modulePath: '@/app/api/admin/maintenance/typesense-status/route', requestUrl: 'https://example.test/api/admin/maintenance/typesense-status' },

  { id: 'admin-settings-operations-get', method: 'GET', path: '/api/admin/settings/operations', modulePath: '@/app/api/admin/settings/operations/route', requestUrl: 'https://example.test/api/admin/settings/operations' },
  { id: 'admin-settings-operations-post', method: 'POST', path: '/api/admin/settings/operations', modulePath: '@/app/api/admin/settings/operations/route', requestUrl: 'https://example.test/api/admin/settings/operations', body: { action: 'backup' } },
] as const;
