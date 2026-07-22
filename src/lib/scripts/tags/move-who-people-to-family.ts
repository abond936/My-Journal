import 'dotenv/config';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { APPROVED_ALIAS_CLUSTERS } from '@/lib/data/approvedIdentityReview';
import { buildArchiveIdentityReview } from '@/lib/utils/archiveIdentityReview';
import { buildCanonicalTagPaths } from '@/lib/utils/tagHierarchy';
import type { Person, PersonGroup } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';

type Move = { tagId: string; name: string; fromParentId?: string; toParentId: string; reason: 'individual' | 'historical-name' };
type Manifest = { version: 1; projectId: string; generatedAt: string; fingerprint: string; moves: Move[] };
const args = process.argv.slice(2);
const mode = args.includes('--apply') ? 'apply' : args.includes('--rollback') ? 'rollback' : 'dry-run';
const manifestPath = resolve(args.find((arg) => arg.startsWith('--manifest='))?.slice(11) || 'temp/move-who-people-to-family.json');
const expectedProject = args.find((arg) => arg.startsWith('--confirm-project='))?.slice(18);

function normalize(value: string) { return value.trim().toLocaleLowerCase(); }
function fingerprint(moves: Move[]) { return createHash('sha256').update(JSON.stringify(moves)).digest('hex'); }
const NON_PERSON_LABELS = new Set([
  'ggp - paternal', 'gp - maternal', 'gp - paternal', 'maternal', 'paternal',
  'me', 'neighborhood', 'school', 'the hammonds', 'work',
]);
const HISTORICAL_NAME_CLUSTERS: Readonly<Record<string, readonly string[]>> = {
  ...APPROVED_ALIAS_CLUSTERS,
  'Elizabeth S': ['Elizabeth Smith', 'Elizabeth Stone'],
};

async function state() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, peopleSnap, groupSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'who').get(),
    firestore.collection('people').get(),
    firestore.collection('person_groups').get(),
  ]);
  return {
    firestore,
    projectId: getAdminApp().options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
    tags: tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag),
    people: peopleSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Person),
    groups: groupSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as PersonGroup),
  };
}

function planMoves(tags: Tag[], people: Person[], groups: PersonGroup[]): Move[] {
  const family = tags.filter((tag) => normalize(tag.name) === 'family');
  if (family.length !== 1 || !family[0].docId) throw new Error(`Expected exactly one Family tag; found ${family.length}.`);
  const familyId = family[0].docId;
  const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
  const children = new Map<string, string[]>();
  tags.forEach((tag) => tag.parentId && children.set(tag.parentId, [...(children.get(tag.parentId) ?? []), tag.docId!]));
  const pets = tags.find((tag) => normalize(tag.name) === 'pets');
  const petIds = new Set<string>();
  const collect = (id: string) => { if (petIds.has(id)) return; petIds.add(id); (children.get(id) ?? []).forEach(collect); };
  if (pets?.docId) collect(pets.docId);

  const approvedAliasParent = new Map<string, string>();
  for (const [canonicalName, aliasNames] of Object.entries(HISTORICAL_NAME_CLUSTERS)) {
    const canonical = tags.filter((tag) => normalize(tag.name) === normalize(canonicalName));
    if (canonical.length !== 1 || !canonical[0].docId) throw new Error(`Approved canonical tag ${canonicalName} is missing or duplicated.`);
    for (const aliasName of aliasNames) {
      const alias = tags.filter((tag) => normalize(tag.name) === normalize(aliasName));
      if (alias.length !== 1 || !alias[0].docId) throw new Error(`Approved historical-name tag ${aliasName} is missing or duplicated.`);
      approvedAliasParent.set(alias[0].docId, canonical[0].docId);
    }
  }
  const aliasIds = new Set(approvedAliasParent.keys());
  const rows = buildArchiveIdentityReview({ tags, people, groups, cards: [], media: [], questions: [] });
  const moves = new Map<string, Move>();
  for (const row of rows) {
    if (row.classification !== 'person' || aliasIds.has(row.tagId) || petIds.has(row.tagId) ||
        NON_PERSON_LABELS.has(normalize(row.name)) || row.tagId === familyId) continue;
    if (row.parentId !== familyId) moves.set(row.tagId, { tagId: row.tagId, name: row.name, fromParentId: row.parentId, toParentId: familyId, reason: 'individual' });
  }
  for (const [tagId, parentId] of approvedAliasParent) {
    const tag = byId.get(tagId)!;
    if (tag.parentId !== parentId) moves.set(tagId, { tagId, name: tag.name, fromParentId: tag.parentId, toParentId: parentId, reason: 'historical-name' });
  }
  const result = [...moves.values()].sort((a, b) => a.name.localeCompare(b.name));
  buildCanonicalTagPaths(tags.map((tag) => ({ ...tag, parentId: moves.get(tag.docId!)?.toParentId ?? tag.parentId })));
  return result;
}

async function writeManifest() {
  const current = await state();
  const moves = planMoves(current.tags, current.people, current.groups);
  const manifest: Manifest = { version: 1, projectId: current.projectId, generatedAt: new Date().toISOString(), fingerprint: fingerprint(moves), moves };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ manifestPath, fingerprint: manifest.fingerprint, moves: moves.length, individuals: moves.filter((move) => move.reason === 'individual').length, historicalNames: moves.filter((move) => move.reason === 'historical-name').length, names: moves.map((move) => move.name), writes: 0 }, null, 2));
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.version !== 1 || manifest.fingerprint !== fingerprint(manifest.moves)) throw new Error('Move manifest is invalid or modified.');
  return manifest;
}

async function change(direction: 'apply' | 'rollback') {
  const manifest = await loadManifest();
  const current = await state();
  if (!expectedProject || expectedProject !== current.projectId || manifest.projectId !== current.projectId) throw new Error('Exact --confirm-project is required and must match the manifest.');
  const currentPlan = planMoves(current.tags, current.people, current.groups);
  if (direction === 'apply' && fingerprint(currentPlan) !== manifest.fingerprint) throw new Error('Live hierarchy changed after dry run. Generate and review a new manifest.');
  const moveById = new Map(manifest.moves.map((move) => [move.tagId, move]));
  const prospective = current.tags.map((tag) => ({
    ...tag,
    parentId: direction === 'apply' ? moveById.get(tag.docId!)?.toParentId ?? tag.parentId : moveById.get(tag.docId!)?.fromParentId ?? tag.parentId,
  }));
  if (direction === 'rollback') {
    for (const move of manifest.moves) {
      if (current.tags.find((tag) => tag.docId === move.tagId)?.parentId !== move.toParentId) throw new Error(`Rollback blocked: ${move.name} changed after apply.`);
    }
  }
  const paths = buildCanonicalTagPaths(prospective);
  const batch = current.firestore.batch();
  for (const tag of prospective) {
    const original = current.tags.find((item) => item.docId === tag.docId)!;
    const expectedPath = paths.get(tag.docId!) ?? [];
    if (original.parentId !== tag.parentId || JSON.stringify(original.path ?? []) !== JSON.stringify(expectedPath)) {
      batch.update(current.firestore.collection('tags').doc(tag.docId!), { parentId: tag.parentId ?? FieldValue.delete(), path: expectedPath, updatedAt: FieldValue.serverTimestamp() });
    }
  }
  await batch.commit();
  console.log(`${direction === 'apply' ? 'Applied' : 'Rolled back'} ${manifest.moves.length} manifested Who moves.`);
}

const action = mode === 'apply' ? () => change('apply') : mode === 'rollback' ? () => change('rollback') : writeManifest;
action().catch((error) => { console.error(error); process.exitCode = 1; });
