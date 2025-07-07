import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { updateTagAndDescendantPaths } from '@/lib/firebase/tagService';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';

getAdminApp();
const db = getFirestore();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: tagId } = await params;
    const { newParentId } = await request.json();

    if (!tagId) {
        return NextResponse.json({ error: 'Tag ID is required.' }, { status: 400 });
    }

    try {
        await db.runTransaction(async (transaction) => {
            await updateTagAndDescendantPaths(tagId, newParentId, transaction);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error reparenting tag ${tagId}:`, error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 