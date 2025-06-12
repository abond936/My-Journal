import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Tag } from '@/lib/types/tag';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const tagsCollection = db.collection('tags');

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
export async function GET(request: NextRequest, context: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = context.params;
        const tagRef = tagsCollection.doc(id);
        const tagSnap = await tagRef.get();

        if (!tagSnap.exists()) {
            return new NextResponse('Tag not found', { status: 404 });
        }
        
        const data = tagSnap.data();
        const tag = {
            id: tagSnap.id,
            ...data,
            createdAt: data?.createdAt?.toDate(),
            updatedAt: data?.updatedAt?.toDate(),
        };

        return NextResponse.json(tag);
    } catch (error) {
        console.error(`API Error fetching tag ${context.params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

/**
 * @swagger
 * /api/tags/{id}:
 *   patch:
 *     summary: Update a tag
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
export async function PATCH(request: NextRequest, context: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = context.params;
        const body: Partial<Omit<Tag, 'id' | 'createdAt'>> = await request.json();

        if (Object.keys(body).length === 0) {
            return new NextResponse('Request body cannot be empty', { status: 400 });
        }

        const tagRef = tagsCollection.doc(id);
        await tagRef.update({
            ...body,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updatedSnap = await tagRef.get();
        const updatedData = updatedSnap.data();
        const updatedTag = {
            id: updatedSnap.id,
            ...updatedData,
            createdAt: updatedData?.createdAt?.toDate(),
            updatedAt: updatedData?.updatedAt?.toDate(),
        };

        return NextResponse.json(updatedTag);
    } catch (error) {
        console.error(`API Error updating tag ${context.params.id}:`, error);
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
export async function DELETE(request: NextRequest, context: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = context.params;
        await tagsCollection.doc(id).delete();
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting tag ${context.params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
} 