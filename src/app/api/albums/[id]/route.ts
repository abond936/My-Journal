import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Album } from '@/lib/types/album';
import { safeToDate } from '@/lib/utils/dateUtils';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const albumsCollection = db.collection('albums');

interface RouteParams {
    id: string;
}

/**
 * Handles fetching a single album by its ID.
 */
export async function GET(request: Request, { params }: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        const albumRef = albumsCollection.doc(id);
        const albumSnap = await albumRef.get();

        if (!albumSnap.exists) {
            return new NextResponse('Album not found', { status: 404 });
        }
        
        const data = albumSnap.data();
        if (!data) {
            return new NextResponse('Album data is missing', { status: 404 });
        }

        // Defensively remove any 'id' field from the data
        delete data.id;

        // Explicitly map fields to prevent including any unserializable data
        const album: Album = {
            id: albumSnap.id,
            name: data.name || '',
            title: data.title || '',
            description: data.description || '',
            caption: data.caption || '',
            coverImage: data.coverImage || '',
            mediaCount: data.mediaCount || 0,
            status: data.status || 'draft',
            tags: data.tags || [],
            images: data.images || [],
            // Safely handle dates
            date: safeToDate(data?.date) || safeToDate(data?.createdAt),
            createdAt: safeToDate(data?.createdAt),
            updatedAt: safeToDate(data?.updatedAt),
        };

        return NextResponse.json(album);
    } catch (error) {
        console.error(`API Error fetching album ${params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        const body: Partial<Omit<Album, 'id' | 'createdAt'>> = await request.json();

        // The bug is that the body can contain an `id` field, which should not be saved
        // into the document's data. We must remove it before updating.
        delete (body as Partial<Album>).id;

        if (Object.keys(body).length === 0) {
            return new NextResponse('Request body cannot be empty', { status: 400 });
        }

        const albumRef = albumsCollection.doc(id);
        
        const updateData: any = { ...body, updatedAt: FieldValue.serverTimestamp() };

        // Convert date string back to Timestamp if present
        if (body.date) {
            updateData.date = Timestamp.fromDate(new Date(body.date));
        }

        await albumRef.update(updateData);

        const updatedSnap = await albumRef.get();
        const updatedData = updatedSnap.data();
        if (!updatedData) {
            return new NextResponse('Updated album data is missing', { status: 404 });
        }
        
        // Also apply explicit mapping here for consistency
        const updatedAlbum: Album = {
            id: updatedSnap.id,
            name: updatedData.name || '',
            title: updatedData.title || '',
            description: updatedData.description || '',
            caption: updatedData.caption || '',
            coverImage: updatedData.coverImage || '',
            mediaCount: updatedData.mediaCount || 0,
            status: updatedData.status || 'draft',
            tags: updatedData.tags || [],
            images: updatedData.images || [],
            date: safeToDate(updatedData?.date) || safeToDate(updatedData?.createdAt),
            createdAt: safeToDate(updatedData?.createdAt),
            updatedAt: safeToDate(updatedData?.updatedAt),
        };

        return NextResponse.json(updatedAlbum);
    } catch (error) {
        console.error(`API Error updating album ${params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { id } = await params;
        // Note: This does not handle deleting associated images from storage.
        // That would require a more complex implementation.
        await albumsCollection.doc(id).delete();
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting album ${params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
} 