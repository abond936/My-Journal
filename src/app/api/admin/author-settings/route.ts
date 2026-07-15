import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import {
  getAuthorSettings,
  updateGalleryTagInheritanceToggles,
} from '@/lib/services/authorSettingsService';
import { galleryTagInheritanceTogglesSchema } from '@/lib/types/authorSettings';

const patchBodySchema = z.object({
  galleryTagInheritance: galleryTagInheritanceTogglesSchema,
});

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export async function GET() {
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
    const settings = await getAuthorSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error('[/api/admin/author-settings GET]', error);
    return errorResponse(
      {
        ok: false,
        code: 'AUTHOR_SETTINGS_READ_FAILED',
        message: 'Failed to load author settings.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      {
        ok: false,
        code: 'INVALID_JSON',
        message: 'Invalid JSON body.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid galleryTagInheritance payload.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    const previous = await getAuthorSettings();
    const settings = await updateGalleryTagInheritanceToggles(parsed.data.galleryTagInheritance);
    const { reconcileGalleryInheritanceForNewlyEnabledDimensions } = await import(
      '@/lib/services/galleryTagInheritanceService'
    );
    try {
      const reconciliation = await reconcileGalleryInheritanceForNewlyEnabledDimensions(
        previous.galleryTagInheritance,
        settings.galleryTagInheritance
      );
      return NextResponse.json({ ok: true, settings, reconciliation });
    } catch (error) {
      console.error('[/api/admin/author-settings PATCH reconciliation]', error);
      return NextResponse.json({
        ok: true,
        settings,
        reconciliationError: 'Settings were saved, but opted-in cards could not be reconciled.',
      });
    }
  } catch (error) {
    console.error('[/api/admin/author-settings PATCH]', error);
    return errorResponse(
      {
        ok: false,
        code: 'AUTHOR_SETTINGS_WRITE_FAILED',
        message: 'Failed to save author settings.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}
