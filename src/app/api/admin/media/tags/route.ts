import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import { recomputeCardsMediaSignalsForMediaIds } from '@/lib/services/cardService';

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

/**
 * POST — bulk-edit tags on many media docs.
 * mode:
 * - add (default): union existing + selected
 * - replace: replace with selected
 * - remove: remove selected from existing
 */
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

  try {
    const body = await request.json() as { mediaIds?: unknown; tags?: unknown; mode?: unknown };
    const mediaIds = body.mediaIds;
    const tags = body.tags;
    const mode = body.mode;
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_TAGS_MEDIA_IDS_REQUIRED',
          message: 'mediaIds must be a non-empty array.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    if (!Array.isArray(tags)) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_TAGS_TAG_IDS_INVALID',
          message: 'tags must be an array of string IDs.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    if (mode !== undefined && mode !== 'add' && mode !== 'replace' && mode !== 'remove') {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_TAGS_MODE_INVALID',
          message: 'mode must be one of: add, replace, remove.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    const ids = mediaIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    const tagList = tags.filter((id): id is string => typeof id === 'string');
    const effectiveMode = (mode === 'replace' || mode === 'remove' || mode === 'add') ? mode : 'add';
    if (ids.length === 0) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_TAGS_MEDIA_IDS_INVALID',
          message: 'No valid media IDs.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const { updatedIds } = await bulkApplyMediaTags(ids, tagList, effectiveMode);
    if (updatedIds.length) {
      await recomputeCardsMediaSignalsForMediaIds(updatedIds);
    }

    return NextResponse.json({ ok: true, updated: updatedIds.length, mode: effectiveMode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POST /api/admin/media/tags]', message);
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_TAGS_BULK_UPDATE_FAILED',
        message: 'Failed to update media tags.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
