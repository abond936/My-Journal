import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  personGroupSchema,
  personRelationshipSchema,
  personSchema,
  type Person,
  type PersonGroup,
  type PersonRelationship,
} from '@/lib/types/archiveIdentity';
import {
  assertRelationshipCanBeAdded,
  normalizeRelationshipEndpoints,
} from '@/lib/utils/personRelationships';
import { buildArchiveIdentityReviewReport } from '@/lib/utils/archiveIdentityReview';
import { getAuthorSettings, updateArchivePerspectivePersonId } from '@/lib/services/authorSettingsService';
import { getPersonIdentity } from '@/lib/services/personIdentityService';

const PEOPLE = 'people';
const RELATIONSHIPS = 'person_relationships';
const GROUPS = 'person_groups';

function db() {
  return getAdminApp().firestore();
}

function withoutServerFields<T extends { docId?: string; createdAt?: unknown; updatedAt?: unknown }>(
  value: T
): Omit<T, 'docId' | 'createdAt' | 'updatedAt'> {
  const rest = { ...value };
  delete rest.docId;
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest;
}

async function assertPeopleExist(personIds: string[]): Promise<void> {
  const unique = [...new Set(personIds)];
  if (unique.length === 0) return;
  const results = await Promise.allSettled(unique.map((id) => getPersonIdentity(id)));
  const missing = results.flatMap((result, index) => result.status === 'rejected' ? [unique[index]] : []);
  if (missing.length > 0) throw new Error(`Unknown people: ${missing.join(', ')}`);
}

async function assertHumanPeople(personIds: string[]): Promise<void> {
  const unique = [...new Set(personIds)];
  const people = await Promise.all(unique.map((id) => getPersonIdentity(id)));
  const nonhuman = people.filter((person) => person.kind === 'nonhuman').map((person) => person.personTagId);
  if (nonhuman.length > 0) throw new Error('Perspective-relative family relationships require human identities.');
}

async function assertWhoTagLinkAvailable(linkedWhoTagId: string | undefined, excludePersonId?: string) {
  if (!linkedWhoTagId) return;
  const firestore = db();
  const tag = await firestore.collection('tags').doc(linkedWhoTagId).get();
  if (!tag.exists || tag.data()?.dimension !== 'who') {
    throw new Error('Person links must reference an existing Who tag.');
  }
  const linked = await firestore.collection(PEOPLE).where('linkedWhoTagId', '==', linkedWhoTagId).get();
  if (linked.docs.some((doc) => doc.id !== excludePersonId)) {
    throw new Error('This Who tag is already linked to another person.');
  }
}

export async function listPeople(): Promise<Person[]> {
  const snap = await db().collection(PEOPLE).orderBy('canonicalName', 'asc').get();
  return snap.docs.map((doc) => personSchema.parse({ docId: doc.id, ...doc.data() }));
}

export async function createPerson(input: unknown): Promise<Person> {
  const parsed = personSchema.parse(input);
  await assertWhoTagLinkAvailable(parsed.linkedWhoTagId);
  const ref = db().collection(PEOPLE).doc();
  await ref.set({ ...withoutServerFields(parsed), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  const created = await ref.get();
  return personSchema.parse({ docId: ref.id, ...created.data() });
}

export async function updatePerson(personId: string, input: unknown): Promise<Person> {
  const firestore = db();
  const ref = firestore.collection(PEOPLE).doc(personId);
  const current = await ref.get();
  if (!current.exists) throw new Error('Person does not exist.');
  const merged = personSchema.parse({ docId: personId, ...current.data(), ...(input as object) });
  if (merged.mergedIntoPersonId === personId) throw new Error('A person cannot merge into themselves.');
  if (merged.mergedIntoPersonId) await assertPeopleExist([merged.mergedIntoPersonId]);
  await assertWhoTagLinkAvailable(merged.linkedWhoTagId, personId);
  await ref.update({ ...withoutServerFields(merged), updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return personSchema.parse({ docId: personId, ...updated.data() });
}

export async function listPersonRelationships(): Promise<PersonRelationship[]> {
  const snap = await db().collection(RELATIONSHIPS).get();
  return snap.docs.map((doc) => personRelationshipSchema.parse({ docId: doc.id, ...doc.data() }));
}

export async function createPersonRelationship(input: unknown): Promise<PersonRelationship> {
  const parsed = normalizeRelationshipEndpoints(
    personRelationshipSchema.parse(input)
  );
  await assertPeopleExist([parsed.fromPersonId, parsed.toPersonId]);
  await assertHumanPeople([parsed.fromPersonId, parsed.toPersonId]);
  const existing = await listPersonRelationships();
  assertRelationshipCanBeAdded(existing, parsed);
  const ref = db().collection(RELATIONSHIPS).doc();
  await ref.set({ ...withoutServerFields(parsed), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return personRelationshipSchema.parse({ docId: ref.id, ...(await ref.get()).data() });
}

export async function deletePersonRelationship(relationshipId: string): Promise<void> {
  await db().collection(RELATIONSHIPS).doc(relationshipId).delete();
}

export async function listPersonGroups(): Promise<PersonGroup[]> {
  const snap = await db().collection(GROUPS).orderBy('name', 'asc').get();
  return snap.docs.map((doc) => personGroupSchema.parse({ docId: doc.id, ...doc.data() }));
}

export async function createPersonGroup(input: unknown): Promise<PersonGroup> {
  const parsed = personGroupSchema.parse(input);
  await assertPeopleExist(parsed.memberPersonIds);
  const ref = db().collection(GROUPS).doc();
  await ref.set({ ...withoutServerFields(parsed), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return personGroupSchema.parse({ docId: ref.id, ...(await ref.get()).data() });
}

export async function updatePersonGroup(groupId: string, input: unknown): Promise<PersonGroup> {
  const firestore = db();
  const ref = firestore.collection(GROUPS).doc(groupId);
  const current = await ref.get();
  if (!current.exists) throw new Error('Person group does not exist.');
  const merged = personGroupSchema.parse({ docId: groupId, ...current.data(), ...(input as object) });
  await assertPeopleExist(merged.memberPersonIds);
  await ref.update({ ...withoutServerFields(merged), updatedAt: FieldValue.serverTimestamp() });
  return personGroupSchema.parse({ docId: groupId, ...(await ref.get()).data() });
}

export async function deletePersonGroup(groupId: string): Promise<void> {
  await db().collection(GROUPS).doc(groupId).delete();
}

export async function getArchiveIdentitySnapshot() {
  const [people, relationships, groups, settings] = await Promise.all([
    listPeople(),
    listPersonRelationships(),
    listPersonGroups(),
    getAuthorSettings(),
  ]);
  return {
    people,
    relationships,
    groups,
    archivePerspectivePersonId: settings.archivePerspectivePersonId,
  };
}

export async function getArchiveIdentityReview() {
  const firestore = db();
  const [tagSnap, cardSnap, mediaSnap, questionSnap, people, groups] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'who').get(),
    firestore.collection('cards').select('tags').get(),
    firestore.collection('media').select('tags').get(),
    firestore.collection('questions').select('tagIds').get(),
    listPeople(),
    listPersonGroups(),
  ]);
  return buildArchiveIdentityReviewReport({
    tags: tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() })),
    people,
    groups,
    cards: cardSnap.docs.map((doc) => ({ id: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })),
    media: mediaSnap.docs.map((doc) => ({ id: doc.id, tagIds: Array.isArray(doc.data().tags) ? doc.data().tags : [] })),
    questions: questionSnap.docs.map((doc) => ({ id: doc.id, tagIds: Array.isArray(doc.data().tagIds) ? doc.data().tagIds : [] })),
  });
}

export { updateArchivePerspectivePersonId };
