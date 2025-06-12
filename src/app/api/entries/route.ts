import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp, Query } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../auth/[...nextauth]/route';
import { Entry } from '@/lib/types/entry';

// Initialize Firebase Admin
getAdminApp();
const db = getFirestore();
const entriesCollection = db.collection('entries');

/**
 * @swagger
 * /api/entries:
 *   get:
 *     summary: Retrieve a paginated list of entries
 *     description: Fetches entries with support for pagination, filtering by tags, and status.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of entries to return.
 *       - in: query
 *         name: lastDocId
 *         schema:
 *           type: string
 *         description: The ID of the last document from the previous page for pagination.
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: A comma-separated list of tag IDs to filter by.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter entries by status (e.g., "published", "draft").
 *     responses:
 *       200:
 *         description: A paginated list of entries.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedEntries'
 *       401:
 *         description: Unauthorized.
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
    const { searchParams } = request.nextUrl;
    const pageSize = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;
    const tags = searchParams.has('tags') ? searchParams.get('tags')!.split(',') : undefined;
    const status = searchParams.get('status') || undefined;

    let q: Query = entriesCollection;

    if (tags && tags.length > 0) {
      q = q.where('tags', 'array-contains-any', tags);
    }
    if (status) {
      q = q.where('status', '==', status);
    }

    q = q.orderBy('date', 'desc');

    if (lastDocId) {
      const lastDocSnapshot = await entriesCollection.doc(lastDocId).get();
      if (lastDocSnapshot.exists) {
        q = q.startAfter(lastDocSnapshot);
      }
    }

    const snapshot = await q.limit(pageSize + 1).get();

    const entries = snapshot.docs.slice(0, pageSize).map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        }
    });

    const hasMore = snapshot.docs.length > pageSize;
    const nextLastDoc = hasMore ? snapshot.docs[entries.length - 1] : null;

    const result = {
      items: entries,
      hasMore,
      lastDocId: hasMore && nextLastDoc ? nextLastDoc.id : undefined,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching entries:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries:
 *   post:
 *     summary: Create a new entry
 *     description: Adds a new journal entry to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewEntry'
 *     responses:
 *       201:
 *         description: The created entry.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entry'
 *       403:
 *         description: Forbidden.
 *       500:
 *         description: Internal server error.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: Omit<Entry, 'id'> = await request.json();

    if (!body.title || !body.content) {
      return new NextResponse('Missing required fields: title and content', { status: 400 });
    }

    const dataWithTimestamps = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      date: body.date ? Timestamp.fromDate(new Date(body.date)) : FieldValue.serverTimestamp(),
    };

    const docRef = await entriesCollection.add(dataWithTimestamps);
    const newEntry = { id: docRef.id, ...body };

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('API Error creating entry:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON format', { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 