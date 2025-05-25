import { NextResponse } from 'next/server';
import { getAllJournalPages } from '@/lib/journal';

export async function GET() {
  try {
    const pages = await getAllJournalPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error reading content:', error);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
} 