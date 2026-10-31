import { getAdminApp } from '@/lib/config/firebase/admin';
import { audienceGroupSchema, type AudienceGroup } from '@/lib/types/audience';
import type { AudienceSelection } from '@/lib/types/audience';

const GROUPS = 'audience_groups';
const USERS = 'journal_users';

function normalizeMemberIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).sort();
}

async function assertReaderMembers(
  memberContactIds: string[],
  firestore: FirebaseFirestore.Firestore
): Promise<void> {
  if (!memberContactIds.length) return;
  const snapshots = await firestore.getAll(
    ...memberContactIds.map((id) => firestore.collection(USERS).doc(id))
  );
  const invalid = snapshots.filter((snapshot) => {
    if (!snapshot.exists) return true;
    return (snapshot.data() as { role?: string }).role !== 'viewer';
  });
  if (invalid.length > 0) throw new Error('Every audience-group member must be an existing Reader account.');
}

async function assertUniqueName(
  name: string,
  firestore: FirebaseFirestore.Firestore,
  exceptId?: string
): Promise<void> {
  const snapshot = await firestore.collection(GROUPS).get();
  const normalized = name.trim().toLocaleLowerCase();
  const conflict = snapshot.docs.some(
    (doc) =>
      doc.id !== exceptId &&
      String((doc.data() as { name?: string }).name ?? '').trim().toLocaleLowerCase() === normalized
  );
  if (conflict) throw new Error('An audience group with that name already exists.');
}

export async function listAudienceGroups(
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<AudienceGroup[]> {
  const snapshot = await firestore.collection(GROUPS).get();
  return snapshot.docs
    .map((doc) => audienceGroupSchema.parse({ docId: doc.id, ...doc.data() }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.docId.localeCompare(right.docId));
}

export async function createAudienceGroup(
  input: { name: string; memberContactIds: string[] },
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  now = Date.now()
): Promise<AudienceGroup> {
  const name = input.name.trim();
  const memberContactIds = normalizeMemberIds(input.memberContactIds);
  await Promise.all([
    assertUniqueName(name, firestore),
    assertReaderMembers(memberContactIds, firestore),
  ]);
  const ref = firestore.collection(GROUPS).doc();
  const group = audienceGroupSchema.parse({
    docId: ref.id,
    name,
    memberContactIds,
    createdAt: now,
    updatedAt: now,
  });
  const stored = {
    name: group.name,
    memberContactIds: group.memberContactIds,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
  await ref.create(stored);
  return group;
}

export async function updateAudienceGroup(
  id: string,
  input: { name: string; memberContactIds: string[] },
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore(),
  now = Date.now()
): Promise<AudienceGroup> {
  const ref = firestore.collection(GROUPS).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error('Audience group not found.');
  const existing = audienceGroupSchema.parse({ docId: current.id, ...current.data() });
  const name = input.name.trim();
  const memberContactIds = normalizeMemberIds(input.memberContactIds);
  await Promise.all([
    assertUniqueName(name, firestore, id),
    assertReaderMembers(memberContactIds, firestore),
  ]);
  const updated = audienceGroupSchema.parse({
    ...existing,
    name,
    memberContactIds,
    updatedAt: now,
  });
  await ref.update({ name, memberContactIds, updatedAt: now });
  return updated;
}

export async function deleteAudienceGroup(
  id: string,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<void> {
  const ref = firestore.collection(GROUPS).doc(id);
  const [group, cardReferences, collectionReferences] = await Promise.all([
    ref.get(),
    firestore.collection('cards').where('audience.groupIds', 'array-contains', id).limit(1).get(),
    firestore.collection('collections').where('audience.groupIds', 'array-contains', id).limit(1).get(),
  ]);
  if (!group.exists) throw new Error('Audience group not found.');
  if (!cardReferences.empty || !collectionReferences.empty) {
    throw new Error('Remove this group from every Card and Collection audience before deleting it.');
  }
  await ref.delete();
}

export async function validateAudienceSelectionReferences(
  audience: AudienceSelection,
  firestore: FirebaseFirestore.Firestore = getAdminApp().firestore()
): Promise<void> {
  const contactIds = normalizeMemberIds(audience.contactIds);
  const groupIds = normalizeMemberIds(audience.groupIds);
  const [contacts, groups] = await Promise.all([
    contactIds.length
      ? firestore.getAll(...contactIds.map((id) => firestore.collection(USERS).doc(id)))
      : [],
    groupIds.length
      ? firestore.getAll(...groupIds.map((id) => firestore.collection(GROUPS).doc(id)))
      : [],
  ]);
  if (
    contacts.some(
      (snapshot) => !snapshot.exists || (snapshot.data() as { role?: string }).role !== 'viewer'
    )
  ) {
    throw new Error('Every selected individual must be an existing Reader account.');
  }
  if (groups.some((snapshot) => !snapshot.exists)) {
    throw new Error('Every selected audience group must still exist.');
  }
}
