import { getServerSession } from 'next-auth/next';
import {
  ADMIN_ROUTE_BOUNDARY_CASES,
  API_ROUTE_ACCESS_AUDIT,
  type AdminRouteBoundaryCase,
} from '@/lib/auth/apiRouteAccessAudit';

jest.mock('next/server', () => {
  const NextResponse = function NextResponse(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return {
      status: init?.status ?? 200,
      headers: {
        get: (key: string) => init?.headers?.[key],
      },
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  } as unknown as {
    json: (data: unknown, init?: { status?: number }) => {
      status: number;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    };
  };
  NextResponse.json = (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
  return { NextResponse };
});

jest.mock('next-auth/next', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
      })),
    })),
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({
          download: jest.fn(),
          getMetadata: jest.fn(),
        })),
      })),
    })),
  })),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(),
    })),
  })),
}));

jest.mock('@/lib/config/typesense', () => ({
  isTypesenseConfigured: jest.fn(() => false),
}));

jest.mock('@/lib/services/cards/cardReadService', () => ({
  getCardById: jest.fn(),
  getCardsByIds: jest.fn(),
  getPaginatedCardsByIds: jest.fn(),
  getCardsByCollectionId: jest.fn(),
  getParentCardsByChildId: jest.fn(),
  searchCards: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardListQueryService', () => ({ getCards: jest.fn() }));
jest.mock('@/lib/services/cards/cardArchiveQueryService', () => ({
  getCollectionCards: jest.fn(), getSeededRandomCards: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardLifecycleService', () => ({
  createCard: jest.fn(),
  deleteCard: jest.fn(),
  duplicateCard: jest.fn(),
  createQuestionCardFromQuestion: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardBroadMutationService', () => ({ updateCard: jest.fn() }));
jest.mock('@/lib/services/cards/cardBulkMutationService', () => ({
  bulkApplyTagDelta: jest.fn(), bulkUpdateTags: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardMediaLifecycleService', () => ({
  getCardsReferencingMedia: jest.fn(),
  deleteMediaWithCardCleanup: jest.fn(),
  recomputeCardsMediaSignalsForMedia: jest.fn(),
  recomputeCardsMediaSignalsForMediaIds: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardCoverMutationService', () => ({ updateCardCover: jest.fn() }));
jest.mock('@/lib/services/cards/cardGalleryMutationService', () => ({
  updateCardGallery: jest.fn(), updateCardGalleryOrder: jest.fn(), updateCardGalleryInheritanceOverrides: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardHierarchyMutationService', () => ({
  updateCardChildren: jest.fn(), updateCardChildrenOrder: jest.fn(), updateCardCollectionRoot: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardMetadataMutationService', () => ({ updateCardMetadata: jest.fn() }));
jest.mock('@/lib/services/cards/cardTagMutationService', () => ({ updateCardTags: jest.fn() }));
jest.mock('@/lib/services/cards/cardStatusMutationService', () => ({ updateCardStatus: jest.fn() }));
jest.mock('@/lib/services/cards/cardContentMutationService', () => ({ updateCardContent: jest.fn() }));
jest.mock('@/lib/services/cards/cardMutationClassifiers', () => ({
  isGalleryOnlyPayload: jest.fn(), isGalleryReorderOnlyPayload: jest.fn(),
  isCardMetadataOnlyPayload: jest.fn(), isChildrenOnlyPayload: jest.fn(),
  isChildrenReorderOnlyPayload: jest.fn(), isCollectionRootOnlyPayload: jest.fn(),
  isContentOnlyPayload: jest.fn(), isTagsOnlyPayload: jest.fn(),
  isGalleryInheritanceOverridesOnlyPayload: jest.fn(), isStatusOnlyPayload: jest.fn(),
}));

jest.mock('@/lib/firebase/tagService', () => ({
  getAllTags: jest.fn().mockResolvedValue([]),
  getTagById: jest.fn(),
  createTag: jest.fn(),
  updateTag: jest.fn(),
  deleteTag: jest.fn(),
  updateTagAndDescendantPaths: jest.fn(),
}));

jest.mock('@/lib/services/images/imageImportService', () => ({
  importFromLocalDrive: jest.fn(),
  importFromBuffer: jest.fn(),
  bulkApplyMediaTags: jest.fn().mockResolvedValue({ updatedIds: [], updatedMedia: [] }),
  patchMediaDocument: jest.fn(),
  replaceMediaAssetContent: jest.fn(),
  auditLegacyMediaReadiness: jest.fn().mockResolvedValue({ total: 0, assessed: 0, unassessed: 0, ready: 0, pending: 0, failed: 0 }),
  retryMediaReadiness: jest.fn(),
}));

jest.mock('@/lib/services/provisionalClusterService', () => ({
  listPendingReviewClusters: jest.fn().mockResolvedValue([]),
  listAllPendingReviewClusters: jest.fn().mockResolvedValue([]),
  collectPendingReviewMemberMediaIds: jest.fn().mockResolvedValue(new Set()),
  generateReviewClusters: jest.fn().mockResolvedValue({ created: 0, clusters: [] }),
  createEmptyReviewCluster: jest.fn(),
  updateReviewClusterSuggestedTags: jest.fn(),
  acceptReviewClusterTags: jest.fn(),
  acceptReviewClusterPile: jest.fn(),
  dismissReviewCluster: jest.fn(),
  splitReviewCluster: jest.fn(),
  mergeReviewClusters: jest.fn(),
}));

jest.mock('@/lib/services/backupStatusService', () => ({
  getBackupOperationsStatus: jest.fn().mockResolvedValue({}),
  getBackupTriggerPolicy: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/scripts/firebase/backup-run', () => ({
  runPairedBackup: jest.fn(),
}));

jest.mock('@/lib/services/typesenseReconciliation', () => ({
  diagnoseTypesenseProjection: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/services/importFolderAsCard', () => ({
  importFolderAsCard: jest.fn(),
  importFolderAsMediaOnly: jest.fn(),
  batchImportMediaOnly: jest.fn(),
  discoverNormalizedSubdirs: jest.fn(),
  getImportFolderPreview: jest.fn(),
}));

jest.mock('@/lib/services/theme/themePersistenceService', () => ({
  getResolvedScopedThemeDocument: jest.fn(),
  saveThemeData: jest.fn(),
}));

jest.mock('@/lib/services/theme/themeDocumentService', () => ({
  isPersistedThemeDocument: jest.fn(),
  normalizeThemeDocument: jest.fn(),
}));

jest.mock('@/lib/services/theme/themeCssCompiler', () => ({
  buildScopedDraftThemeCss: jest.fn(),
}));

jest.mock('@/lib/services/typesenseMediaService', () => ({
  ensureMediaCollection: jest.fn(),
  searchMediaTypesense: jest.fn(),
}));

jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  listJournalUsers: jest.fn(),
  createJournalViewer: jest.fn(),
  getJournalUserByDocId: jest.fn(),
  updateJournalUser: jest.fn(),
}));

jest.mock('@/lib/services/questionService', () => ({
  listQuestions: jest.fn(),
  createQuestion: jest.fn(),
  getQuestionById: jest.fn(),
  updateQuestion: jest.fn(),
  deleteQuestion: jest.fn(),
  linkCardToQuestion: jest.fn(),
  unlinkCardFromQuestion: jest.fn(),
}));

jest.mock('@/lib/scripts/firebase/cleanup-media-collection', () => ({
  cleanupMediaCollection: jest.fn(),
}));

jest.mock('@/lib/scripts/firebase/reconcile-media-cards', () => ({
  runDiagnostics: jest.fn(),
  runReconciliation: jest.fn(),
}));

jest.mock('@/lib/scripts/firebase/backfill-media-metadata', () => ({
  backfillMediaMetadata: jest.fn(),
}));

jest.mock('@/lib/scripts/dev/diagnose-cover-image', () => ({
  diagnoseCoverImage: jest.fn(),
}));

jest.mock('@/lib/services/ai/cardDraftAssistService', () => ({
  suggestCardDraftOptions: jest.fn(),
  suggestCardDraftsRequestSchema: { parse: jest.fn((value: unknown) => value) },
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    stat: jest.fn(),
  },
  existsSync: jest.fn(() => false),
  readdirSync: jest.fn(() => []),
}));

jest.mock('image-size', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 100, height: 50 })),
}));

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeRequest(testCase: AdminRouteBoundaryCase) {
  const parsed = new URL(testCase.requestUrl);
  return {
    method: testCase.method,
    url: testCase.requestUrl,
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
      searchParams: parsed.searchParams,
    },
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => testCase.body ?? {},
    clone() {
      return this;
    },
  } as never;
}

async function invokeRoute(testCase: AdminRouteBoundaryCase) {
  const routeModule = (await import(testCase.modulePath)) as Record<
    AdminRouteBoundaryCase['method'],
    (request: unknown, context?: { params: Promise<{ id: string }> }) => Promise<{ status: number }>
  >;
  const handler = routeModule[testCase.method];
  if (!handler) {
    throw new Error(`Missing ${testCase.method} export in ${testCase.modulePath}`);
  }
  const request = makeRequest(testCase);
  if (testCase.params) {
    return handler(request, { params: testCase.params });
  }
  return handler(request);
}

describe('API route access audit inventory', () => {
  it('lists every app/api route handler with an access class', () => {
    expect(API_ROUTE_ACCESS_AUDIT.length).toBeGreaterThanOrEqual(50);
    const adminRoutes = API_ROUTE_ACCESS_AUDIT.filter((entry) => entry.access === 'admin-only');
    expect(adminRoutes.length).toBeGreaterThanOrEqual(40);
  });

  it('covers every admin-only audit entry with an automated boundary case', () => {
    const testedPaths = new Set(ADMIN_ROUTE_BOUNDARY_CASES.map((entry) => `${entry.method} ${entry.path}`));
    const missing = API_ROUTE_ACCESS_AUDIT.filter(
      (entry) => entry.access === 'admin-only' && !testedPaths.has(`${entry.method} ${entry.path}`)
    );
    expect(missing).toEqual([]);
  });
});

describe('admin-only API route boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ONEDRIVE_ROOT_FOLDER = process.cwd();
  });

  it.each(ADMIN_ROUTE_BOUNDARY_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'rejects anonymous access for %s',
    async (_id, testCase) => {
      mockedGetServerSession.mockResolvedValue(null as never);
      const response = await invokeRoute(testCase);
      expect([401, 403]).toContain(response.status);
    }
  );

  it.each(ADMIN_ROUTE_BOUNDARY_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'rejects viewer access for %s',
    async (_id, testCase) => {
      mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
      const response = await invokeRoute(testCase);
      expect(response.status).toBe(403);
    }
  );
});
