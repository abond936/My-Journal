import { NextResponse, NextRequest } from 'next/server';
import { listFolderContents } from '@/lib/services/onedrive/graphService';
import { SourceCollection } from '@/lib/types/album';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await listFolderContents('/', session.accessToken); // Get contents of the root specified in .env

    // Filter for folders only, as we're treating them as Source Collections
    const folders = items.filter(item => item.folder);
    
    const sourceCollections: SourceCollection[] = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description || '',
      path: folder.parentReference.path ? `${folder.parentReference.path.replace('/drive/root:', '')}/${folder.name}` : `/${folder.name}`,
      photoCount: folder.folder.childCount,
      photos: [], // Photos will be loaded on demand
      tags: [],
      isEnabled: true, // Or based on some logic if needed
      sourceProvider: 'onedrive',
    }));

    return NextResponse.json(sourceCollections);
  } catch (error) {
    console.error('Error loading source collections from Graph API:', error);
    return NextResponse.json(
      { error: 'Failed to load source collections from OneDrive', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 