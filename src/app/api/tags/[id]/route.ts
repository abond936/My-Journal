import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '@/lib/auth/authOptions';
import { getTagById, updateTag, deleteTag } from '@/lib/firebase/tagService';
import { Tag } from '@/lib/types/tag';
import { safeToDate } from '@/lib/utils/dateUtils';

// Initialize Firebase Admin
getAdminApp();

type RouteParams = Promise<{ id: string }>;

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
 * /api/tags/{id}:
 *   get:
 *     summary: Retrieve a single tag by ID
 *     description: Fetches detailed information for a specific tag.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to retrieve.
 *     responses:
 *       200:
 *         description: The requested tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
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
        const { id } = await params;
        const tag = await getTagById(id);

        if (!tag) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NOT_FOUND',
                    message: 'Tag not found.',
                    severity: 'error',
                    retryable: false,
                },
                404
            );
        }
        
        // Convert timestamps to dates for API response
        const tagWithDates = {
            ...tag,
            createdAt: safeToDate(tag.createdAt),
            updatedAt: safeToDate(tag.updatedAt),
        };

        return NextResponse.json(tagWithDates);
    } catch (error) {
        console.error(`API Error fetching tag`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(
            {
                ok: false,
                code: 'TAG_FETCH_FAILED',
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
 * /api/tags/{id}:
 *   put:
 *     summary: Update a tag (full update)
 *     description: Replaces all fields of an existing tag with the provided data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tag'
 *     responses:
 *       200:
 *         description: The updated tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Bad request, validation failed.
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
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
        const { id } = await params;
        const body: Omit<Tag, 'docId' | 'createdAt'> = await request.json();

        // Validate required fields for full update
        if (!body.name) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NAME_REQUIRED',
                    message: 'Tag name is required for full update.',
                    severity: 'error',
                    retryable: false,
                },
                400
            );
        }

        const existingTag = await getTagById(id);
        if (!existingTag) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NOT_FOUND',
                    message: 'Tag not found.',
                    severity: 'error',
                    retryable: false,
                },
                404
            );
        }

        // For PUT, we update all fields except docId and createdAt
        const updatedTag = await updateTag(id, body);
        
        // Convert timestamps to dates for API response
        const tagWithDates = {
            ...updatedTag,
            createdAt: safeToDate(updatedTag.createdAt),
            updatedAt: safeToDate(updatedTag.updatedAt),
        };

        return NextResponse.json(tagWithDates);
    } catch (error) {
        console.error(`API Error updating tag`, error);
        
        // Handle specific error for tag not found
        if (error instanceof Error && error.message.includes('not found')) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NOT_FOUND',
                    message: 'Tag not found.',
                    severity: 'error',
                    retryable: false,
                },
                404
            );
        }

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
                code: 'TAG_UPDATE_FAILED',
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
 * /api/tags/{id}:
 *   patch:
 *     summary: Update a tag (partial update)
 *     description: Modifies the details of an existing tag.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTag'
 *     responses:
 *       200:
 *         description: The updated tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Bad request, validation failed.
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(request: NextRequest, { params }: { params: RouteParams }) {
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
        const { id } = await params;
        const body: Partial<Omit<Tag, 'docId' | 'createdAt'>> = await request.json();

        if (Object.keys(body).length === 0) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_PATCH_BODY_REQUIRED',
                    message: 'Request body cannot be empty.',
                    severity: 'error',
                    retryable: false,
                },
                400
            );
        }

        const updatedTag = await updateTag(id, body);
        
        // Convert timestamps to dates for API response
        const tagWithDates = {
            ...updatedTag,
            createdAt: safeToDate(updatedTag.createdAt),
            updatedAt: safeToDate(updatedTag.updatedAt),
        };

        return NextResponse.json(tagWithDates);
    } catch (error) {
        console.error(`API Error updating tag`, error);
        
        // Handle specific error for tag not found
        if (error instanceof Error && error.message.includes('not found')) {
            return errorResponse(
                {
                    ok: false,
                    code: 'TAG_NOT_FOUND',
                    message: 'Tag not found.',
                    severity: 'error',
                    retryable: false,
                },
                404
            );
        }

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
                code: 'TAG_UPDATE_FAILED',
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
 * /api/tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     description: Removes a tag and all its direct children from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to delete.
 *     responses:
 *       204:
 *         description: Tag deleted successfully.
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function DELETE(request: NextRequest, { params }: { params: RouteParams }) {
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
        const { id } = await params;
        await deleteTag(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting tag`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(
            {
                ok: false,
                code: 'TAG_DELETE_FAILED',
                message: 'Internal server error.',
                severity: 'error',
                retryable: true,
                error: message,
            },
            500
        );
    }
} 