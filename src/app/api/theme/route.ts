import { NextResponse } from 'next/server';
import { getThemeData, saveThemeData } from '@/lib/services/themeService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const themeData = await getThemeData();
    return NextResponse.json(themeData);
  } catch (error) {
    console.error('API Error fetching theme data:', error);
    return NextResponse.json({ error: 'Failed to fetch theme data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const themeData = await request.json();
    
    // Validate the theme data structure
    if (!themeData || !themeData.palette || !Array.isArray(themeData.palette)) {
      return NextResponse.json({ error: 'Invalid theme data structure' }, { status: 400 });
    }

    await saveThemeData(themeData);
    return NextResponse.json({ success: true, message: 'Theme saved successfully' });
  } catch (error) {
    console.error('API Error saving theme data:', error);
    return NextResponse.json({ error: 'Failed to save theme data' }, { status: 500 });
  }
} 