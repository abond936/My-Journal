import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { protectExistingCardInheritance } from '@/lib/utils/galleryTagInheritance';

type Manifest = { version: 1; generatedAt: string; cardIds: string[]; applied: boolean };
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry-run';
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = resolve(manifestArg?.slice('--manifest='.length) || 'temp/gallery-inheritance-overrides.json');
const protectedState = protectExistingCardInheritance();

function isProtected(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return state.who === true && state.what === true && state.when === true && state.where === true;
}

async function save(manifest: Manifest) {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function dryRun() {
  const snap = await getAdminApp().firestore().collection('cards').select('galleryTagInheritanceOverrides').get();
  const missing = snap.docs.filter((doc) => doc.data().galleryTagInheritanceOverrides === undefined);
  const protectedCards = snap.docs.filter((doc) => isProtected(doc.data().galleryTagInheritanceOverrides));
  const conflicts = snap.docs.filter((doc) => doc.data().galleryTagInheritanceOverrides !== undefined && !isProtected(doc.data().galleryTagInheritanceOverrides));
  console.log(`Cards: ${snap.size}; missing: ${missing.length}; protected: ${protectedCards.length}; non-protected: ${conflicts.length}`);
  if (conflicts.length) throw new Error('Non-protected card state exists; backfill requires review.');
  await save({ version: 1, generatedAt: new Date().toISOString(), cardIds: missing.map((doc) => doc.id).sort(), applied: false });
  console.log(`Manifest: ${manifestPath}`);
  console.log('Dry run only. No Firestore writes performed.');
}

async function load(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.version !== 1 || new Set(manifest.cardIds).size !== manifest.cardIds.length) throw new Error('Invalid manifest.');
  return manifest;
}

async function apply() {
  const manifest = await load();
  const firestore = getAdminApp().firestore();
  const snaps = await firestore.getAll(...manifest.cardIds.map((id) => firestore.collection('cards').doc(id)));
  const changed = snaps.filter((snap) => snap.exists && snap.data()?.galleryTagInheritanceOverrides !== undefined);
  if (changed.length) throw new Error(`${changed.length} cards changed after dry run.`);
  for (let start = 0; start < snaps.length; start += 400) {
    const batch = firestore.batch();
    snaps.slice(start, start + 400).filter((snap) => snap.exists).forEach((snap) => batch.update(snap.ref, { galleryTagInheritanceOverrides: protectedState }));
    await batch.commit();
  }
  manifest.applied = true;
  await save(manifest);
  console.log(`Protected ${snaps.filter((snap) => snap.exists).length} existing cards.`);
}

async function rollback() {
  const manifest = await load();
  if (!manifest.applied) throw new Error('Manifest does not record an applied backfill.');
  const firestore = getAdminApp().firestore();
  const snaps = await firestore.getAll(...manifest.cardIds.map((id) => firestore.collection('cards').doc(id)));
  const changed = snaps.filter((snap) => snap.exists && !isProtected(snap.data()?.galleryTagInheritanceOverrides));
  if (changed.length) throw new Error(`${changed.length} cards changed after backfill; rollback blocked.`);
  for (let start = 0; start < snaps.length; start += 400) {
    const batch = firestore.batch();
    snaps.slice(start, start + 400).filter((snap) => snap.exists).forEach((snap) => batch.update(snap.ref, { galleryTagInheritanceOverrides: FieldValue.delete() }));
    await batch.commit();
  }
  console.log(`Rolled back ${snaps.filter((snap) => snap.exists).length} protected-card fields.`);
}

const action = mode === 'apply' ? apply : mode === 'rollback' ? rollback : dryRun;
action().catch((error) => { console.error(error); process.exitCode = 1; });

