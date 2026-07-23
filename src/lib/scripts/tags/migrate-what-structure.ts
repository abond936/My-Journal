import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { mutateTagHierarchy } from '@/lib/services/tagHierarchyMutationService';
import type { Tag } from '@/lib/types/tag';

const PROJECT_ID = 'my-journal-936';
const ROOT_ID = 'YvTq4BCC8JHRNUZv0LeI';
const created = [
  { id: 'what-life', name: 'Life', parent: 'WHAT' },
  { id: 'what-life-career', name: 'Career', parent: 'Life' },
  { id: 'what-objects', name: 'Objects', parent: 'WHAT' },
  { id: 'what-objects-clothing', name: 'Clothing', parent: 'Objects' },
  { id: 'what-activities-clubs', name: 'Clubs', parent: 'Activities' },
  { id: 'what-activities-hobbies', name: 'Hobbies', parent: 'Activities' },
  { id: 'what-activities-recreation', name: 'Recreation', parent: 'Activities' },
  { id: 'what-activities-performing', name: 'Performing', parent: 'Activities' },
  { id: 'what-activities-building', name: 'Building', parent: 'Activities' },
  { id: 'what-events-graduation', name: 'Graduation', parent: 'Events' },
  { id: 'what-events-reunion', name: 'Reunion', parent: 'Events' },
  { id: 'what-events-party', name: 'Party', parent: 'Events' },
] as const;

async function loadTags(): Promise<Tag[]> {
  const snap = await getAdminApp().firestore().collection('tags').where('dimension', '==', 'what').get();
  return snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
}

function catalog(tags: Tag[]) {
  const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
  const names = new Map<string, Tag[]>();
  for (const tag of tags) names.set(tag.name, [...(names.get(tag.name) ?? []), tag]);
  const one = (name: string, parentName?: string) => {
    const candidates = names.get(name) ?? [];
    const found = parentName
      ? candidates.find((tag) => tag.parentId && byId.get(tag.parentId)?.name === parentName)
      : candidates.length === 1 ? candidates[0] : undefined;
    if (!found?.docId) throw new Error(`Expected one What tag: ${parentName ? `${parentName} > ` : ''}${name}`);
    return found;
  };
  return { byId, one };
}

async function main() {
  const app = getAdminApp();
  const firestore = app.firestore();
  const projectId = app.options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apply = process.argv.includes('--apply');
  const verify = process.argv.includes('--verify');
  const confirmProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.slice(18);
  let tags = await loadTags();
  const initial = catalog(tags);
  const root = initial.one('WHAT');
  if (root.docId !== ROOT_ID) throw new Error(`WHAT root changed: ${root.docId}`);

  if (verify) {
    const c = catalog(tags);
    const expected: Array<[string, string]> = [
      ['Life', 'WHAT'], ['Childhood', 'Life'], ['Parenthood', 'Life'], ['Education', 'Life'], ['Career', 'Life'], ['Marriage', 'Life'],
      ['Holidays', 'Events'], ['Birth', 'Events'], ['Anniversary', 'Events'], ['Engagement', 'Events'], ['Wedding', 'Events'],
      ['Sports', 'Activities'], ['Travel', 'Activities'], ['Clubs', 'Activities'], ['Homes', 'Objects'], ['Vehicles', 'Objects'],
      ['Business', 'Topics'], ['Ancestry', 'Topics'], ['Reflections', 'WHAT'],
    ];
    const errors = expected.flatMap(([name, parent]) => {
      try { c.one(name, parent); return []; } catch (error) { return [error instanceof Error ? error.message : String(error)]; }
    });
    console.log(JSON.stringify({ ok: errors.length === 0, whatTags: tags.length, errors, writes: 0 }, null, 2));
    if (errors.length) process.exitCode = 1;
    return;
  }

  const plannedCreates = created.filter((item) => !tags.some((tag) => tag.docId === item.id));
  console.log(JSON.stringify({ projectId, apply, creates: plannedCreates.map((item) => item.name), renames: ['Themes -> Topics', 'Cars -> Vehicles'], writes: apply ? 'authorized' : 0 }, null, 2));
  if (!apply) return;
  if (projectId !== PROJECT_ID || confirmProject !== PROJECT_ID) throw new Error('Exact project confirmation is required');

  const backupPath = resolve(`temp/what-structure-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await mkdir(resolve('temp'), { recursive: true });
  await writeFile(backupPath, `${JSON.stringify({ projectId, createdAt: new Date().toISOString(), tags }, null, 2)}\n`, 'utf8');

  const preBatch = firestore.batch();
  const createdByName = new Map(created.map((item) => [item.name, item.id]));
  for (const item of plannedCreates) {
    const existingParent = item.parent === 'WHAT' ? root : tags.find((tag) => tag.name === item.parent);
    const parentId = existingParent?.docId ?? createdByName.get(item.parent);
    if (!parentId) throw new Error(`Create parent not found: ${item.parent}`);
    preBatch.set(firestore.collection('tags').doc(item.id), {
      name: item.name, dimension: 'what', parentId, path: existingParent ? [...(existingParent.path ?? []), parentId] : [root.docId!, parentId],
      assignable: true, cardCount: 0, mediaCount: 0, uniqueCardIds: [], uniqueMediaIds: [],
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }
  preBatch.update(firestore.collection('tags').doc(initial.one('Themes').docId!), { name: 'Topics', updatedAt: FieldValue.serverTimestamp() });
  preBatch.update(firestore.collection('tags').doc(initial.one('Cars', 'zMisc').docId!), { name: 'Vehicles', updatedAt: FieldValue.serverTimestamp() });
  await preBatch.commit();

  tags = await loadTags();
  const c = catalog(tags);
  const moves: Array<[string, string, string?]> = [
    ['Reflections', 'WHAT'], ['Childhood', 'Life'], ['Parenthood', 'Life'], ['Education', 'Life'], ['Marriage', 'Life'],
    ['Holidays', 'Events'], ['Birth', 'Events'], ['Anniversary', 'Events'], ['Engagement', 'Events'], ['Wedding', 'Events'],
    ['Sports', 'Activities'], ['Travel', 'Activities'], ['Business', 'Topics'], ['Culture', 'Topics'], ['Economy', 'Topics'], ['Politics', 'Topics'], ['Technology', 'Topics'],
    ['Books', 'Topics', 'Culture'], ['Food', 'Topics', 'Culture'], ['Movies', 'Topics', 'Culture'], ['Music', 'Topics', 'Culture'], ['Television', 'Topics', 'Culture'],
    ['Homes', 'Objects'], ['Vehicles', 'Objects'], ['Machinery', 'Objects'], ['Ancestry', 'Topics'],
    ['Boy Scouts', 'Clubs'], ['Cub Scouts', 'Clubs'], ['Girl Scouts', 'Clubs'], ['Dance Club', 'Clubs'], ['Aquarium', 'Recreation'],
  ];
  const reparentByTagId = Object.fromEntries(moves.map(([name, parent, oldParent]) => [c.one(name, oldParent).docId!, c.one(parent).docId!]));
  const result = await mutateTagHierarchy({ kind: 'cleanup', tagId: 'what-structure-2026-07-22', reparentByTagId, removeTagIds: [] });
  console.log(JSON.stringify({ backupPath, result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
