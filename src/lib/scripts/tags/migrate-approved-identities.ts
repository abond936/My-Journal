import 'dotenv/config';
import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { APPROVED_ALIAS_CLUSTERS } from '@/lib/data/approvedIdentityReview';
import { personSchema, type Person } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';
import {
  buildApprovedIdentityMigrationPlan,
  sameMigrationIdentity,
  type IdentityMigrationRecord,
} from '@/lib/utils/archiveIdentityMigration';

type Mode = 'dry-run' | 'apply' | 'rollback';
type Manifest = {
  version: 1;
  generatedAt: string;
  fingerprint: string;
  records: IdentityMigrationRecord[];
  createRecordIds: string[];
  appliedRecordIds: string[];
};

const mode: Mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry-run';
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = resolve(manifestArg?.slice('--manifest='.length) || 'temp/approved-identity-migration.json');

function fingerprint(records: IdentityMigrationRecord[]): string {
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}

async function readState() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, peopleSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'who').get(),
    firestore.collection('people').get(),
  ]);
  return {
    tags: tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag),
    people: peopleSnap.docs.map((doc) => personSchema.parse({ docId: doc.id, ...doc.data() })),
  };
}

async function loadManifest(): Promise<Manifest> {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (parsed.version !== 1 || parsed.fingerprint !== fingerprint(parsed.records) ||
      parsed.createRecordIds.some((id) => !parsed.records.some((record) => record.docId === id)) ||
      parsed.appliedRecordIds.some((id) => !parsed.createRecordIds.includes(id))) {
    throw new Error('Migration manifest is invalid or has been modified.');
  }
  return parsed;
}

async function dryRun() {
  const state = await readState();
  const plan = buildApprovedIdentityMigrationPlan({ ...state, approvedClusters: APPROVED_ALIAS_CLUSTERS });
  console.log(`Approved clusters: ${Object.keys(APPROVED_ALIAS_CLUSTERS).length}`);
  console.log(`Proposed identities: ${plan.proposed.length}`);
  console.log(`Already applied: ${plan.existing.length}`);
  console.log(`Conflicts: ${plan.conflicts.length}`);
  plan.conflicts.forEach((conflict) => console.log(`CONFLICT ${conflict}`));
  plan.proposed.forEach((record) => console.log(`PROPOSE ${record.canonicalName}: ${record.aliases.map((alias) => alias.name).join(', ')}`));
  if (plan.conflicts.length > 0) throw new Error('Dry run contains conflicts; no manifest was written.');
  const records = [...plan.existing, ...plan.proposed].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  const manifest: Manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprint(records),
    records,
    createRecordIds: plan.proposed.map((record) => record.docId).sort(),
    appliedRecordIds: [],
  };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Manifest: ${manifestPath}`);
  console.log('Dry run only. No Firestore writes performed.');
}

async function apply() {
  const manifest = await loadManifest();
  const state = await readState();
  const plan = buildApprovedIdentityMigrationPlan({ ...state, approvedClusters: APPROVED_ALIAS_CLUSTERS });
  if (plan.conflicts.length > 0) throw new Error(plan.conflicts.join('\n'));
  const expectedFingerprint = fingerprint([...plan.existing, ...plan.proposed].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)));
  if (manifest.fingerprint !== expectedFingerprint) throw new Error('Live tag or identity state no longer matches the approved manifest.');
  const batch = getAdminApp().firestore().batch();
  for (const record of plan.proposed) {
    if (!manifest.createRecordIds.includes(record.docId)) {
      throw new Error(`Manifest does not authorize creation of ${record.canonicalName}.`);
    }
    const { docId, ...data } = record;
    batch.create(getAdminApp().firestore().collection('people').doc(docId), {
      ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }
  if (plan.proposed.length > 0) await batch.commit();
  manifest.appliedRecordIds = [...manifest.createRecordIds];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Created ${plan.proposed.length} identities; ${plan.existing.length} were already applied.`);
}

async function rollback() {
  const manifest = await loadManifest();
  const firestore = getAdminApp().firestore();
  const rollbackRecords = manifest.records.filter((record) => manifest.appliedRecordIds.includes(record.docId));
  const [peopleSnap, relationshipSnap, groupSnap, settingsSnap] = await Promise.all([
    firestore.getAll(...rollbackRecords.map((record) => firestore.collection('people').doc(record.docId))),
    firestore.collection('person_relationships').get(),
    firestore.collection('person_groups').get(),
    firestore.collection('app_settings').doc('author').get(),
  ]);
  const referenced = new Set<string>();
  relationshipSnap.docs.forEach((doc) => { referenced.add(doc.data().fromPersonId); referenced.add(doc.data().toPersonId); });
  groupSnap.docs.forEach((doc) => (doc.data().memberPersonIds ?? []).forEach((id: string) => referenced.add(id)));
  if (settingsSnap.data()?.archivePerspectivePersonId) referenced.add(settingsSnap.data()!.archivePerspectivePersonId);
  const removable = peopleSnap.filter((snap, index) => {
    if (!snap.exists) return false;
    const current = personSchema.parse({ docId: snap.id, ...snap.data() }) as Person;
    if (referenced.has(snap.id) || !sameMigrationIdentity(current, rollbackRecords[index])) {
      throw new Error(`Rollback blocked for ${rollbackRecords[index].canonicalName}: identity changed or is referenced.`);
    }
    return true;
  });
  const batch = firestore.batch();
  removable.forEach((snap) => batch.delete(snap.ref));
  await batch.commit();
  console.log(`Rolled back ${removable.length} unchanged, unreferenced identities.`);
}

const action = mode === 'apply' ? apply : mode === 'rollback' ? rollback : dryRun;
action().catch((error) => { console.error(error); process.exitCode = 1; });
