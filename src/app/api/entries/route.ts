import { NextResponse } from 'next/server';
import { Entry } from '@/types/entry';
import { db } from '@/lib/config/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// GET /api/entries
export async function GET() {
  try {
    const entriesRef = collection(db, 'entries');
    const snapshot = await getDocs(entriesRef);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Entry[];
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST /api/entries
export async function POST(request: Request) {
  try {
    const entry = await request.json();
    const entriesRef = collection(db, 'entries');
    const docRef = await addDoc(entriesRef, entry);
    return NextResponse.json({ id: docRef.id, ...entry });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

// GET /api/entries/[id]
export async function GET_BY_ID(request: Request, { params }: { params: { id: string } }) {
  try {
    const entryRef = doc(db, 'entries', params.id);
    const entrySnap = await getDoc(entryRef);
    
    if (!entrySnap.exists()) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ id: entrySnap.id, ...entrySnap.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

// PUT /api/entries/[id]
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const entry = await request.json();
    const entryRef = doc(db, 'entries', params.id);
    await updateDoc(entryRef, entry);
    return NextResponse.json({ id: params.id, ...entry });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE /api/entries/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const entryRef = doc(db, 'entries', params.id);
    await deleteDoc(entryRef);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
} 