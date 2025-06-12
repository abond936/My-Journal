import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../auth/[...nextauth]/route';
import { Tag } from '@/lib/types/tag';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const tagsCollection = db.collection('tags');

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
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const snapshot = await tagsCollection.orderBy('name', 'asc').get();
        const tags = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate(),
            };
        });
        return NextResponse.json(tags);
    } catch (error) {
        console.error('API Error fetching all tags:', error);
        return new NextResponse('Internal server error', { status: 500 });
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
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

        if (!body.name) {
            return new NextResponse('Tag name is required', { status: 400 });
        }
        
        // Check for duplicate tag name (case-insensitive)
        const querySnapshot = await tagsCollection.where('name', '==', body.name).get();
        if (!querySnapshot.empty) {
            return new NextResponse(JSON.stringify({ error: 'Tag with this name already exists' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const newTagData = {
            ...body,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await tagsCollection.add(newTagData);
        
        const newTag = {
            id: docRef.id,
            ...body,
            // Timestamps will be handled by the client-side service for now
        };

        return new NextResponse(JSON.stringify(newTag), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('API Error creating tag:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}