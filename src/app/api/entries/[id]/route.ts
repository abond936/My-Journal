import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Entry } from '@/lib/types/entry';
import { safeToDate } from '@/lib/utils/dateUtils';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const entriesCollection = db.collection('entries');

interface RouteParams {
  id: string;
}

/**
 * @swagger
 * /api/entries/{id}:
 *   get:
 *     summary: Retrieve a single entry by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The requested entry.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Entry' } } }
 *       404:
 *         description: Entry not found.
 */
export async function GET(request: Request, context: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = context.params;
    const entryRef = entriesCollection.doc(id);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return new NextResponse('Entry not found', { status: 404 });
    }
    
    const data = entrySnap.data();
    // Defensively remove any 'id' field from the data to prevent it from
    // overwriting the true document ID.
    if (data) {
        delete data.id;
    }
    const entry = {
      ...data,
      id: entrySnap.id,
      date: safeToDate(data?.date),
      createdAt: safeToDate(data?.createdAt),
      updatedAt: safeToDate(data?.updatedAt),
    };

    return NextResponse.json(entry);
  } catch (error) {
    console.error(`API Error fetching entry ${context.params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries/{id}:
 *   patch:
 *     summary: Update an existing entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEntry'
 *     responses:
 *       200:
 *         description: The updated entry.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Entry' } } }
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Entry not found.
 */
export async function PATCH(request: Request, context: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = context.params;
    const body: Partial<Omit<Entry, 'id'>> = await request.json();

    // The bug is that the body can contain an `id` field, which should not be saved
    // into the document's data. We must remove it before updating.
    delete (body as Partial<Entry>).id;

    if (Object.keys(body).length === 0) {
      return new NextResponse('Request body cannot be empty', { status: 400 });
    }

    const entryRef = entriesCollection.doc(id);
    const updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If the client sent a date string, convert it back to a Date object
    // so Firestore saves it correctly as a Timestamp.
    if (body.date) {
      updateData.date = new Date(body.date);
    }

    await entryRef.update(updateData);
    
    const updatedSnap = await entryRef.get();
    const updatedData = updatedSnap.data();

    const updatedEntry = {
        id: updatedSnap.id,
        ...updatedData,
        date: safeToDate(updatedData?.date),
        createdAt: safeToDate(updatedData?.createdAt),
        updatedAt: safeToDate(updatedData?.updatedAt),
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error(`API Error updating entry ${context.params.id}:`, error);
    if ((error as Error).message.includes('not found')) {
      return new NextResponse('Entry not found', { status: 404 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries/{id}:
 *   delete:
 *     summary: Delete an entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Entry deleted successfully.
 *       404:
 *         description: Entry not found.
 */
export async function DELETE(request: Request, context: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = context.params;
    await entriesCollection.doc(id).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API Error deleting entry ${context.params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 