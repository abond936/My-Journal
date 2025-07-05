import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getTagById, updateTag, deleteTag } from '@/lib/firebase/tagService';
import { Tag } from '@/lib/types/tag';
import { safeToDate } from '@/lib/utils/dateUtils';

// Initialize Firebase Admin
getAdminApp();

interface RouteParams {
    id: string;
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
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        const tag = await getTagById(id);

        if (!tag) {
            return new NextResponse('Tag not found', { status: 404 });
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
        return new NextResponse('Internal server error', { status: 500 });
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
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        const body: Omit<Tag, 'docId' | 'createdAt'> = await request.json();

        // Validate required fields for full update
        if (!body.name) {
            return new NextResponse('Tag name is required for full update', { status: 400 });
        }

        const existingTag = await getTagById(id);
        if (!existingTag) {
            return new NextResponse('Tag not found', { status: 404 });
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
            return new NextResponse('Tag not found', { status: 404 });
        }
        
        return new NextResponse('Internal server error', { status: 500 });
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
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        const body: Partial<Omit<Tag, 'docId' | 'createdAt'>> = await request.json();

        if (Object.keys(body).length === 0) {
            return new NextResponse('Request body cannot be empty', { status: 400 });
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
            return new NextResponse('Tag not found', { status: 404 });
        }
        
        return new NextResponse('Internal server error', { status: 500 });
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
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        await deleteTag(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting tag`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
} 