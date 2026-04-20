import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '@/lib/auth/authOptions';
import { getAllTags, createTag } from '@/lib/firebase/tagService';
import { Tag } from '@/lib/types/tag';
import { safeToDate } from '@/lib/utils/dateUtils';

// Initialize Firebase Admin
getAdminApp();

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
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Retrieve all tags
 *     description: Fetches a comprehensive list of all tags from the database.
 *     responses:
 *       200:
 *         description: A list of tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return errorResponse(
            {
                ok: false,
                code: 'AUTH_UNAUTHORIZED',
                message: 'Unauthorized.',
                severity: 'error',
                retryable: false,
            },
            401
        );
    }

    try {
        const tags = await getAllTags();
        // Convert timestamps to dates for API response
        const tagsWithDates = tags.map(tag => ({
            ...tag,
            createdAt: safeToDate(tag.createdAt),
            updatedAt: safeToDate(tag.updatedAt),
        }));
        return NextResponse.json(tagsWithDates);
    } catch (error) {
        console.error('API Error fetching all tags:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(
            {
                ok: false,
                code: 'TAG_LIST_FAILED',
                message: 'Internal server error.',
                severity: 'error',
                retryable: true,
                error: message,
            },
            500
        );
    }
}

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Create a new tag
 *     description: Adds a new tag to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewTag'
 *     responses:
 *       201:
 *         description: The created tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Bad request, validation failed.
 *       500:
 *         description: Internal server error.
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
        const body: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt'> = await request.json();

        if (!body.name) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NAME_REQUIRED',
                    message: 'Tag name is required.',
                    severity: 'error',
                    retryable: false,
                },
                400
            );
        }

        const newTag = await createTag(body);
        
        // Convert timestamps to dates for API response
        const tagWithDates = {
            ...newTag,
            createdAt: safeToDate(newTag.createdAt),
            updatedAt: safeToDate(newTag.updatedAt),
        };

        return new NextResponse(JSON.stringify(tagWithDates), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('API Error creating tag:', error);
        
        // Handle specific error for duplicate names
        if (error instanceof Error && error.message.includes('Tag with this name already exists')) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NAME_CONFLICT',
                    message: 'Tag with this name already exists.',
                    severity: 'error',
                    retryable: false,
                },
                409
            );
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(
            {
                ok: false,
                code: 'TAG_CREATE_FAILED',
                message: 'Internal server error.',
                severity: 'error',
                retryable: true,
                error: message,
            },
            500
        );
    }
}