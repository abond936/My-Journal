import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { duplicateCard } from '@/lib/services/cardService';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Card ID is required.' }, { status: 400 });
  }

  try {
    const newCard = await duplicateCard(id);
    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
