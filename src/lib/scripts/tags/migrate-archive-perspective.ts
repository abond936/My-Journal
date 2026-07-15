import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { APPROVED_ARCHIVE_PERSPECTIVE } from '@/lib/data/approvedIdentityReview';
import { personSchema } from '@/lib/types/archiveIdentity';
import { sameMigrationIdentity, type IdentityMigrationRecord } from '@/lib/utils/archiveIdentityMigration';

type Manifest = {
  version: 1;
  generatedAt: string;
  person: IdentityMigrationRecord;
  previousPerspectivePersonId?: string;
  createPerson: boolean;
  applied: boolean;
};

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry-run';
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = resolve(manifestArg?.slice('--manifest='.length) || 'temp/archive-perspective-migration.json');

async function liveState() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, peopleSnap, settingsSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'who').get(),
    firestore.collection('people').get(),
    firestore.collection('app_settings').doc('author').get(),
  ]);
  const tagMatches = tagSnap.docs.filter((doc) => doc.data().name === APPROVED_ARCHIVE_PERSPECTIVE.whoTagName);
  if (tagMatches.length !== 1) throw new Error(`Expected one ${APPROVED_ARCHIVE_PERSPECTIVE.whoTagName} Who tag; found ${tagMatches.length}.`);
  const tag = tagMatches[0];
  const expected: IdentityMigrationRecord = {
    docId: tag.id,
    kind: 'human',
    canonicalName: APPROVED_ARCHIVE_PERSPECTIVE.canonicalName,
    aliases: [],
    linkedWhoTagId: tag.id,
    legacyWhoTagIds: [],
    status: 'active',
  };
  const people = peopleSnap.docs.map((doc) => personSchema.parse({ docId: doc.id, ...doc.data() }));
  const related = people.filter((person) =>
    person.docId === expected.docId || person.linkedWhoTagId === expected.linkedWhoTagId ||
    person.canonicalName.toLocaleLowerCase() === expected.canonicalName.toLocaleLowerCase()
  );
  if (related.length > 1 || (related.length === 1 && !sameMigrationIdentity(related[0], expected))) {
    throw new Error('Existing Alan identity data conflicts with the approved archive perspective.');
  }
  return {
    firestore,
    expected,
    existing: related[0],
    perspectivePersonId: settingsSnap.data()?.archivePerspectivePersonId as string | undefined,
  };
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.version !== 1 || manifest.person.canonicalName !== APPROVED_ARCHIVE_PERSPECTIVE.canonicalName) {
    throw new Error('Archive perspective manifest is invalid.');
  }
  return manifest;
}

async function saveManifest(manifest: Manifest) {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function dryRun() {
  const state = await liveState();
  console.log(`Identity: ${state.existing ? 'already exists' : 'create'} ${state.expected.canonicalName} (${state.expected.linkedWhoTagId})`);
  console.log(`Current perspective: ${state.perspectivePersonId ?? 'none'}`);
  console.log(`Target perspective: ${state.expected.docId}`);
  const manifest: Manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    person: state.expected,
    previousPerspectivePersonId: state.perspectivePersonId,
    createPerson: !state.existing,
    applied: false,
  };
  await saveManifest(manifest);
  console.log(`Manifest: ${manifestPath}`);
  console.log('Dry run only. No Firestore writes performed.');
}

async function apply() {
  const manifest = await loadManifest();
  const state = await liveState();
  if (state.perspectivePersonId !== manifest.previousPerspectivePersonId) throw new Error('Archive perspective changed after dry run.');
  if (manifest.createPerson !== !state.existing) throw new Error('Identity state changed after dry run.');
  const batch = state.firestore.batch();
  if (manifest.createPerson) {
    const { docId, ...person } = manifest.person;
    batch.create(state.firestore.collection('people').doc(docId), {
      ...person, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }
  batch.set(state.firestore.collection('app_settings').doc('author'), {
    archivePerspectivePersonId: manifest.person.docId,
  }, { merge: true });
  await batch.commit();
  manifest.applied = true;
  await saveManifest(manifest);
  console.log(`Archive perspective set to ${manifest.person.canonicalName}.`);
}

async function rollback() {
  const manifest = await loadManifest();
  if (!manifest.applied) throw new Error('Manifest does not record an applied migration.');
  const state = await liveState();
  if (state.perspectivePersonId !== manifest.person.docId || !state.existing || !sameMigrationIdentity(state.existing, manifest.person)) {
    throw new Error('Rollback blocked because perspective or identity state changed.');
  }
  const [relationships, groups] = await Promise.all([
    state.firestore.collection('person_relationships').get(),
    state.firestore.collection('person_groups').get(),
  ]);
  const referenced = relationships.docs.some((doc) => [doc.data().fromPersonId, doc.data().toPersonId].includes(manifest.person.docId)) ||
    groups.docs.some((doc) => (doc.data().memberPersonIds ?? []).includes(manifest.person.docId));
  if (referenced) throw new Error('Rollback blocked because the perspective identity is referenced.');
  const batch = state.firestore.batch();
  batch.set(state.firestore.collection('app_settings').doc('author'), {
    archivePerspectivePersonId: manifest.previousPerspectivePersonId ?? FieldValue.delete(),
  }, { merge: true });
  if (manifest.createPerson) batch.delete(state.firestore.collection('people').doc(manifest.person.docId));
  await batch.commit();
  console.log('Archive perspective migration rolled back.');
}

const action = mode === 'apply' ? apply : mode === 'rollback' ? rollback : dryRun;
action().catch((error) => { console.error(error); process.exitCode = 1; });
