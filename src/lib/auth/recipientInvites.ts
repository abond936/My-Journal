import { createHash, randomBytes } from 'crypto';
import { getAdminApp } from '@/lib/config/firebase/admin';

const USERS = 'journal_users';
const INVITES = 'recipient_invites';
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type RecipientInviteDoc = {
  recipientId: string;
  createdAt: number;
  expiresAt: number;
  redeemedAt: number | null;
  revokedAt: number | null;
};

type GuestRecipientDoc = {
  username: string;
  role: 'viewer';
  displayName: string;
  disabled: boolean;
  accessKind: 'guest';
  createdAt: number;
  updatedAt: number;
};

export type GuestInviteResult = {
  recipientId: string;
  inviteToken: string;
  expiresAt: number;
};

export type RedeemedGuestRecipient = {
  id: string;
  name: string;
  email: string;
  role: 'viewer';
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hashRecipientInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function createInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

async function revokeOpenInvites(
  transaction: FirebaseFirestore.Transaction,
  firestore: FirebaseFirestore.Firestore,
  recipientId: string,
  now: number
) {
  const snapshot = await transaction.get(
    firestore.collection(INVITES).where('recipientId', '==', recipientId)
  );
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as RecipientInviteDoc;
    if (data.redeemedAt === null && data.revokedAt === null && data.expiresAt > now) {
      transaction.update(doc.ref, { revokedAt: now });
    }
  });
}

export async function createGuestRecipientInvite(
  input: { email: string; displayName?: string },
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  now = Date.now()
): Promise<GuestInviteResult> {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() || email;
  const token = createInviteToken();
  const inviteRef = firestore.collection(INVITES).doc(hashRecipientInviteToken(token));
  const recipientRef = firestore.collection(USERS).doc();
  const expiresAt = now + INVITE_LIFETIME_MS;

  await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(
      firestore.collection(USERS).where('username', '==', email).limit(1)
    );
    if (!existing.empty) throw new Error('A Reader or guest recipient already uses that email.');

    const recipient: GuestRecipientDoc = {
      username: email,
      role: 'viewer',
      displayName,
      disabled: false,
      accessKind: 'guest',
      createdAt: now,
      updatedAt: now,
    };
    const invite: RecipientInviteDoc = {
      recipientId: recipientRef.id,
      createdAt: now,
      expiresAt,
      redeemedAt: null,
      revokedAt: null,
    };
    transaction.create(recipientRef, recipient);
    transaction.create(inviteRef, invite);
  });

  return { recipientId: recipientRef.id, inviteToken: token, expiresAt };
}

export async function reissueGuestRecipientInvite(
  recipientId: string,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  now = Date.now()
): Promise<GuestInviteResult> {
  const token = createInviteToken();
  const inviteRef = firestore.collection(INVITES).doc(hashRecipientInviteToken(token));
  const recipientRef = firestore.collection(USERS).doc(recipientId);
  const expiresAt = now + INVITE_LIFETIME_MS;

  await firestore.runTransaction(async (transaction) => {
    const recipientSnapshot = await transaction.get(recipientRef);
    if (!recipientSnapshot.exists) throw new Error('Guest recipient not found.');
    const recipient = recipientSnapshot.data() as Partial<GuestRecipientDoc>;
    if (recipient.role !== 'viewer' || recipient.accessKind !== 'guest') {
      throw new Error('Invitation links can be issued only for guest recipients.');
    }
    if (recipient.disabled) throw new Error('Enable this guest recipient before issuing a new link.');

    await revokeOpenInvites(transaction, firestore, recipientId, now);
    const invite: RecipientInviteDoc = {
      recipientId,
      createdAt: now,
      expiresAt,
      redeemedAt: null,
      revokedAt: null,
    };
    transaction.create(inviteRef, invite);
  });

  return { recipientId, inviteToken: token, expiresAt };
}

export async function redeemGuestRecipientInvite(
  rawToken: string,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  now = Date.now()
): Promise<RedeemedGuestRecipient | null> {
  const token = rawToken.trim();
  if (!token) return null;
  const inviteRef = firestore.collection(INVITES).doc(hashRecipientInviteToken(token));

  return firestore.runTransaction(async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteRef);
    if (!inviteSnapshot.exists) return null;
    const invite = inviteSnapshot.data() as RecipientInviteDoc;
    if (invite.redeemedAt !== null || invite.revokedAt !== null || invite.expiresAt <= now) return null;

    const recipientRef = firestore.collection(USERS).doc(invite.recipientId);
    const recipientSnapshot = await transaction.get(recipientRef);
    if (!recipientSnapshot.exists) return null;
    const recipient = recipientSnapshot.data() as Partial<GuestRecipientDoc>;
    if (
      recipient.role !== 'viewer' ||
      recipient.accessKind !== 'guest' ||
      recipient.disabled ||
      typeof recipient.username !== 'string' ||
      typeof recipient.displayName !== 'string'
    ) {
      return null;
    }

    transaction.update(inviteRef, { redeemedAt: now });
    return {
      id: invite.recipientId,
      name: recipient.displayName,
      email: recipient.username,
      role: 'viewer' as const,
    };
  });
}
