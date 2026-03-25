import bcrypt from 'bcryptjs';
import { getFirestore, type UpdateData } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';

const COLLECTION = 'journal_users';
const BCRYPT_ROUNDS = 12;

export type JournalUserRole = 'admin' | 'viewer';

export type JournalUserPublic = {
  docId: string;
  username: string;
  role: JournalUserRole;
  displayName: string;
  disabled: boolean;
  createdAt: number;
  updatedAt: number;
};

type JournalUserDoc = {
  username: string;
  passwordHash: string;
  role: JournalUserRole;
  displayName: string;
  disabled: boolean;
  createdAt: number;
  updatedAt: number;
};

function db() {
  return getFirestore(getAdminApp());
}

export function normalizeJournalUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

async function getDocByUsername(
  usernameNormalized: string
): Promise<{ docId: string; data: JournalUserDoc } | null> {
  const snap = await db()
    .collection(COLLECTION)
    .where('username', '==', usernameNormalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { docId: doc.id, data: doc.data() as JournalUserDoc };
}

export async function hasJournalUserWithUsername(usernameRaw: string): Promise<boolean> {
  const row = await getDocByUsername(normalizeJournalUsername(usernameRaw));
  return row !== null;
}

function toPublic(docId: string, data: JournalUserDoc): JournalUserPublic {
  return {
    docId,
    username: data.username,
    role: data.role,
    displayName: data.displayName,
    disabled: data.disabled,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Used by NextAuth authorize: DB user wins; legacy env is only if no matching journal user doc.
 */
export async function authorizeJournalUserCredentials(
  usernameRaw: string,
  password: string
): Promise<{ docId: string; username: string; displayName: string; role: JournalUserRole } | null> {
  const username = normalizeJournalUsername(usernameRaw);
  if (!username || !password) return null;

  const row = await getDocByUsername(username);
  if (!row) return null;

  if (row.data.disabled) return null;

  const ok = await bcrypt.compare(password, row.data.passwordHash);
  if (!ok) return null;

  return {
    docId: row.docId,
    username: row.data.username,
    displayName: row.data.displayName || row.data.username,
    role: row.data.role,
  };
}

export async function listJournalUsers(): Promise<JournalUserPublic[]> {
  const snap = await db().collection(COLLECTION).orderBy('username').get();
  return snap.docs.map(d => toPublic(d.id, d.data() as JournalUserDoc));
}

export async function getJournalUserByDocId(docId: string): Promise<JournalUserPublic | null> {
  const doc = await db().collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return toPublic(doc.id, doc.data() as JournalUserDoc);
}

export async function createJournalViewer(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<string> {
  const username = normalizeJournalUsername(input.username);
  if (!username) {
    throw new Error('Username is required');
  }

  const existing = await getDocByUsername(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = Date.now();
  const ref = await db().collection(COLLECTION).add({
    username,
    passwordHash,
    role: 'viewer' satisfies JournalUserRole,
    displayName: (input.displayName?.trim() || username) as string,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  } satisfies JournalUserDoc);

  return ref.id;
}

export async function updateJournalUser(
  docId: string,
  updates: { displayName?: string; disabled?: boolean; password?: string }
): Promise<void> {
  const ref = db().collection(COLLECTION).doc(docId);
  const cur = await ref.get();
  if (!cur.exists) {
    throw new Error('User not found');
  }

  const prev = cur.data() as JournalUserDoc;
  const payload: Partial<JournalUserDoc> & { updatedAt: number; passwordHash?: string } = {
    updatedAt: Date.now(),
  };

  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName.trim() || prev.username;
  }
  if (updates.disabled !== undefined) {
    payload.disabled = updates.disabled;
  }
  if (updates.password !== undefined && updates.password.length > 0) {
    payload.passwordHash = await bcrypt.hash(updates.password, BCRYPT_ROUNDS);
  }

  if (updates.disabled === true && prev.role === 'admin') {
    const adminsSnap = await db().collection(COLLECTION).where('role', '==', 'admin').get();
    const enabledIds = adminsSnap.docs
      .filter(d => !(d.data() as JournalUserDoc).disabled)
      .map(d => d.id);
    if (enabledIds.length === 1 && enabledIds[0] === docId) {
      throw new Error('Cannot disable the only enabled admin');
    }
  }

  await ref.update(payload as UpdateData<JournalUserDoc>);
}

/**
 * Idempotent: creates one admin doc from ADMIN_EMAIL / ADMIN_PASSWORD only when the collection is empty.
 */
export async function seedInitialAdminIfEmpty(): Promise<
  { created: true; docId: string } | { created: false; reason: string }
> {
  const any = await db().collection(COLLECTION).limit(1).get();
  if (!any.empty) {
    return { created: false, reason: 'journal_users is not empty' };
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return { created: false, reason: 'ADMIN_EMAIL or ADMIN_PASSWORD missing' };
  }

  const username = normalizeJournalUsername(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = Date.now();

  const ref = await db().collection(COLLECTION).add({
    username,
    passwordHash,
    role: 'admin' satisfies JournalUserRole,
    displayName: 'Admin',
    disabled: false,
    createdAt: now,
    updatedAt: now,
  } satisfies JournalUserDoc);

  return { created: true, docId: ref.id };
}
