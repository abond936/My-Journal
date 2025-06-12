import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Album } from '@/lib/types/album';

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
        const albumRef = albumsCollection.doc(id);
        const albumSnap = await albumRef.get();

        if (!albumSnap.exists()) {
            return new NextResponse('Album not found', { status: 404 });
        }
        
        const data = albumSnap.data();
        const album = {
            id: albumSnap.id,
            ...data,
            date: (data?.date as Timestamp)?.toDate() || (data?.createdAt as Timestamp)?.toDate(),
            createdAt: (data?.createdAt as Timestamp)?.toDate(),
            updatedAt: (data?.updatedAt as Timestamp)?.toDate(),
        };

        return NextResponse.json(album);
    } catch (error) {
        console.error(`API Error fetching album ${context.params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

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
        const body: Partial<Omit<Album, 'id' | 'createdAt'>> = await request.json();

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
        const updatedAlbum = {
            id: updatedSnap.id,
            ...updatedData,
            date: updatedData?.date?.toDate() || updatedData?.createdAt?.toDate(),
            createdAt: updatedData?.createdAt?.toDate(),
            updatedAt: updatedData?.updatedAt?.toDate(),
        };

        return NextResponse.json(updatedAlbum);
    } catch (error) {
        console.error(`API Error updating album ${context.params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

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
        // Note: This does not handle deleting associated images from storage.
        // That would require a more complex implementation.
        await albumsCollection.doc(id).delete();
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting album ${context.params.id}:`, error);
        return new NextResponse('Internal server error', { status: 500 });
    }
} 