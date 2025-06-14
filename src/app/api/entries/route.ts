import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFirestore, FieldValue, Timestamp, Query, doc } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { authOptions } from '../auth/[...nextauth]/route';
import { Entry } from '@/lib/types/entry';
import { safeToDate } from '@/lib/utils/dateUtils';

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
    const type = searchParams.get('type') || undefined;

    let q: Query = entriesCollection;

    if (tags && tags.length > 0) {
      q = q.where('tags', 'array-contains-any', tags);
    }
    if (status && status !== 'all') {
      q = q.where('status', '==', status);
    }
    if (type) {
      q = q.where('type', '==', type);
    }

    q = q.orderBy('createdAt', 'desc');

    if (lastDocId) {
      const lastDocSnapshot = await entriesCollection.doc(lastDocId).get();
      if (lastDocSnapshot.exists) {
        q = q.startAfter(lastDocSnapshot);
      }
    }

    const snapshot = await q.limit(pageSize + 1).get();

    console.log('[API /api/entries] Firestore Query:', {
      params: {
        pageSize,
        lastDocId,
        tags,
        status,
        type,
      },
      results: {
        count: snapshot.docs.length,
      }
    });

    const entries = snapshot.docs.slice(0, pageSize).map(doc => {
        const data = doc.data();
        delete data.id;
        return {
            ...data,
            id: doc.id,
            date: safeToDate(data.date),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
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
    const { title, content, type, status, visibility, tags, media } = body;

    const validationErrors: string[] = [];

    // 1. Validate Title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      validationErrors.push('A non-empty title is required.');
    }

    // 2. Validate Content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      validationErrors.push('Content cannot be empty.');
    }

    // 3. Validate Type
    const allowedTypes: Entry['type'][] = ['journal', 'note', 'photo'];
    if (!type || !allowedTypes.includes(type)) {
      validationErrors.push(`Type must be one of: ${allowedTypes.join(', ')}.`);
    }

    // 4. Validate Status
    const allowedStatuses: Entry['status'][] = ['draft', 'published'];
    if (!status || !allowedStatuses.includes(status)) {
      validationErrors.push(`Status must be one of: ${allowedStatuses.join(', ')}.`);
    }

    // 5. Validate Visibility
    const allowedVisibilities: Entry['visibility'][] = ['public', 'private'];
    if (!visibility || !allowedVisibilities.includes(visibility)) {
        validationErrors.push(`Visibility must be one of: ${allowedVisibilities.join(', ')}.`);
    }

    // 6. Validate Tags and Media arrays
    if (!Array.isArray(tags)) {
        validationErrors.push('Tags must be an array.');
    }
    if (!Array.isArray(media)) {
        validationErrors.push('Media must be an array.');
    }

    if (validationErrors.length > 0) {
      return new NextResponse(JSON.stringify({ errors: validationErrors }), { status: 400 });
    }

    const dataWithTimestamps = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      date: body.date ? Timestamp.fromDate(new Date(body.date)) : FieldValue.serverTimestamp(),
    };

    const docRef = await entriesCollection.add(dataWithTimestamps);
    
    // Fetch the new doc to return it with resolved timestamps
    const newDocSnap = await docRef.get();
    const newEntryData = newDocSnap.data();

    const newEntry = { 
        id: docRef.id, 
        ...newEntryData,
        date: safeToDate(newEntryData?.date),
        createdAt: safeToDate(newEntryData?.createdAt),
        updatedAt: safeToDate(newEntryData?.updatedAt),
    };

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('API Error creating entry:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON format', { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 