import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { deleteCard, getCardById, updateCard } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';

interface RouteParams {
  id: string;
}

/**
 * GET a card by ID.
 */
export async function GET(request: Request, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const card = await getCardById(params.id);
    if (!card) {
      return new NextResponse('Card not found', { status: 404 });
    }
    return NextResponse.json(card);
  } catch (error) {
    console.error(`API Error fetching card ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * PATCH handler for updating a card.
 */
export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: Partial<Omit<Card, 'id'>> = await request.json();
    const updatedCard = await updateCard(params.id, body);
    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error(`API Error updating card ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}


/**
 * DELETE a card by ID.
 */
export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    await deleteCard(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API Error deleting card ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 