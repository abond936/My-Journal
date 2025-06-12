import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../auth/[...nextauth]/route';
import { Album } from '@/lib/types/album';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const albumsCollection = db.collection('albums');

/**
 * @swagger
 * /api/albums:
 *   get:
 *     summary: Retrieve all albums
 *     description: Fetches a complete list of all albums, sorted by date.
 *     responses:
 *       200:
 *         description: A list of albums.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Album'
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
        const snapshot = await albumsCollection.orderBy('date', 'desc').get();
        const albums = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp)?.toDate() || (data.createdAt as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate(),
            };
        });
        return NextResponse.json(albums);
    } catch (error) {
        console.error('API Error fetching all albums:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

/**
 * Handles the creation of a new album.
 * It expects album data (e.g., title, description) in the request body.
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
        const body: Omit<Album, 'id' | 'createdAt' | 'updatedAt' | 'mediaCount' | 'images'> = await request.json();

        if (!body.name || !body.date) {
            return new NextResponse('Missing required fields: name and date', { status: 400 });
        }

        const newAlbumData = {
            ...body,
            date: Timestamp.fromDate(new Date(body.date)),
            coverPhoto: body.coverPhoto || null,
            mediaCount: 0,
            images: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await albumsCollection.add(newAlbumData);
        
        const newAlbum = {
            id: docRef.id,
            ...body,
            mediaCount: 0,
            images: [],
            // Timestamps will be handled by the client-side service for now
        };

        return new NextResponse(JSON.stringify(newAlbum), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('API Error creating album:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}