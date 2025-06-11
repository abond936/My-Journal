import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { getAllTags, createTag } from '@/lib/services/tagService';
import { Tag } from '@/lib/types/tag';

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
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tags = await getAllTags();
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
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: Omit<Tag, 'id'> = await request.json();
    
    // Basic validation
    if (!body.name || !body.dimension) {
      return new NextResponse('Missing required fields: name and dimension', { status: 400 });
    }

    const newTag = await createTag(body);
    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('API Error creating tag:', error);
    // Could be a JSON parsing error or a database error
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON format', { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}