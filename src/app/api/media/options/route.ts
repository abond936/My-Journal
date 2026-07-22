import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { folderLabelFromSourcePath } from '@/lib/utils/reviewClusterHeuristics';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  try {
    const snapshot = await getAdminApp()
      .firestore()
      .collection('media')
      .select('importBatchId', 'sourcePath')
      .get();
    const batchIds = new Set<string>();
    const folders = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as { importBatchId?: string; sourcePath?: string };
      if (data.importBatchId?.trim()) batchIds.add(data.importBatchId.trim());
      folders.add(folderLabelFromSourcePath(data.sourcePath ?? '') ?? 'Unknown folder');
    });

    return NextResponse.json({
      batchIds: Array.from(batchIds).sort((a, b) => b.localeCompare(a)),
      folders: Array.from(folders).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    console.error('Error loading Media Library filter options:', error);
    return NextResponse.json(
      { message: 'Media filter options could not be loaded.' },
      { status: 500 }
    );
  }
}
