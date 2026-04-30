import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';
import type { Media } from '@/lib/types/photo';

const MAX_SOURCE_PATHS_PER_REQUEST = 100;

const importRouteDebug = process.env.DEBUG_IMPORT === '1';

/**
 * Parallel imports speed up the no-metadata path. When ExifTool runs, the default `exiftool`
 * singleton + dev recompiles have produced hangs with concurrent reads — keep metadata imports serial.
 */
const CONCURRENT_LOCAL_IMPORTS = 5;

export type LocalImportBatchResultItem = {
  sourcePath: string;
  mediaId: string;
  media: Media;
};

export type LocalImportBatchErrorItem = {
  sourcePath: string;
  message: string;
};

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

function normalizeSourcePaths(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length ? out : null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  let sourcePathForLog: string | undefined;
  try {
    const body = await request.json();
    /** Opt-in: only when `true` (omitted/false skips Exif and matches PhotoPicker default). */
    const readEmbeddedMetadata = body.readEmbeddedMetadata === true;

    const batchPaths = normalizeSourcePaths(body.sourcePaths);
    const singlePath =
      typeof body.sourcePath === 'string' && body.sourcePath.trim() ? body.sourcePath.trim() : undefined;

    if (batchPaths && singlePath) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_IMPORT_PATH_INPUT_INVALID',
          message: 'Provide either sourcePath or sourcePaths, not both.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    if (batchPaths) {
      if (batchPaths.length > MAX_SOURCE_PATHS_PER_REQUEST) {
        return errorResponse(
          {
            ok: false,
            message: `At most ${MAX_SOURCE_PATHS_PER_REQUEST} paths per request.`,
            code: 'BATCH_TOO_LARGE',
            severity: 'error',
            retryable: false,
          },
          400
        );
      }

      const results: LocalImportBatchResultItem[] = [];
      const errors: LocalImportBatchErrorItem[] = [];
      const metadataReadIssues: { sourcePath: string; message: string }[] = [];

      const importConcurrency = readEmbeddedMetadata ? 1 : CONCURRENT_LOCAL_IMPORTS;

      const batchT0 = Date.now();
      if (importRouteDebug) {
        console.info(
          '[/api/images/local/import] batch start',
          JSON.stringify({
            count: batchPaths.length,
            readEmbeddedMetadata,
            concurrent: importConcurrency,
          })
        );
      }

      for (let chunkStart = 0; chunkStart < batchPaths.length; chunkStart += importConcurrency) {
        const chunk = batchPaths.slice(chunkStart, chunkStart + importConcurrency);
        const settled = await Promise.allSettled(
          chunk.map(async (sourcePath, chunkIdx) => {
            if (importRouteDebug) {
              console.info(
                '[/api/images/local/import] file begin',
                JSON.stringify({
                  sourcePath,
                  index: chunkStart + chunkIdx + 1,
                  total: batchPaths.length,
                })
              );
            }
            const fileT0 = Date.now();
            const r = await importFromLocalDrive(sourcePath, {
              readMetadata: readEmbeddedMetadata,
              normalizeInMemory: true,
              collectMetadataReadIssue: (sp, message) => {
                metadataReadIssues.push({ sourcePath: sp, message });
              },
            });
            return { sourcePath, ms: Date.now() - fileT0, r };
          })
        );

        settled.forEach((result, idx) => {
          const sourcePath = chunk[idx]!;
          sourcePathForLog = sourcePath;
          if (result.status === 'fulfilled') {
            const { r, ms } = result.value;
            results.push({ sourcePath, mediaId: r.mediaId, media: r.media });
            if (importRouteDebug) {
              console.info(
                '[/api/images/local/import] file ok',
                JSON.stringify({
                  index: chunkStart + idx + 1,
                  total: batchPaths.length,
                  ms,
                  sourcePath,
                })
              );
            }
          } else {
            const message =
              result.reason instanceof Error ? result.reason.message : 'Unknown error';
            errors.push({ sourcePath, message });
            console.error('[/api/images/local/import] Batch item failed:', {
              sourcePath,
              message,
              index: chunkStart + idx + 1,
              total: batchPaths.length,
            });
          }
        });
      }

      if (importRouteDebug) {
        console.info(
          '[/api/images/local/import] batch end',
          JSON.stringify({
            totalMs: Date.now() - batchT0,
            ok: results.length,
            failed: errors.length,
          })
        );
      }

      return NextResponse.json({
        results,
        errors,
        ...(metadataReadIssues.length > 0 ? { metadataReadIssues } : {}),
      });
    }

    if (!singlePath) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_IMPORT_PATH_REQUIRED',
          message: 'sourcePath or non-empty sourcePaths array is required.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    sourcePathForLog = singlePath;

    const metadataReadIssues: { sourcePath: string; message: string }[] = [];
    const singleT0 = Date.now();
    const { mediaId, media } = await importFromLocalDrive(singlePath, {
      readMetadata: readEmbeddedMetadata,
      normalizeInMemory: true,
      collectMetadataReadIssue: (sp, message) => {
        metadataReadIssues.push({ sourcePath: sp, message });
      },
    });
    if (importRouteDebug) {
      console.info(
        '[/api/images/local/import] single ok',
        JSON.stringify({ ms: Date.now() - singleT0, sourcePath: singlePath })
      );
    }

    return NextResponse.json({
      mediaId,
      media,
      ...(metadataReadIssues.length > 0 ? { metadataReadIssues } : {}),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/images/local/import] Error importing image:', {
      sourcePath: sourcePathForLog,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_IMPORT_LOCAL_FAILED',
        message: 'Error importing image.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
}
