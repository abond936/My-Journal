import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { mutateTagHierarchy } from '@/lib/services/tagHierarchyMutationService';
import type { Tag } from '@/lib/types/tag';

const PROJECT_ID = 'my-journal-936';
const BATCH_SIZE = 300;
type Raw = Record<string, unknown> & { docId: string };

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function replace(values: unknown, replacements: Map<string, string[]>): string[] {
  return [...new Set(ids(values).flatMap((id) => replacements.get(id) ?? [id]))];
}

async function main() {
  const app = getAdminApp();
  const firestore = app.firestore();
  const projectId = app.options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apply = process.argv.includes('--apply');
  const verify = process.argv.includes('--verify');
  const verifyBackup = process.argv.find((arg) => arg.startsWith('--verify-backup='))?.slice('--verify-backup='.length);
  const confirmProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.slice(18);
  const [tagSnap, cardSnap, mediaSnap, questionSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'what').get(),
    firestore.collection('cards').get(), firestore.collection('media').get(), firestore.collection('questions').get(),
  ]);
  const tags = tagSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
  const raw = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Raw);
  const collections = [
    { name: 'cards', records: raw(cardSnap), tagField: 'tags' },
    { name: 'media', records: raw(mediaSnap), tagField: 'tags' },
    { name: 'questions', records: raw(questionSnap), tagField: 'tagIds' },
  ] as const;
  if (verify) {
    if (!verifyBackup) throw new Error('--verify-backup is required');
    const backup = JSON.parse(await readFile(resolve(verifyBackup), 'utf8')) as { sourceTags: Tag[] };
    const sourceIds = new Set(backup.sourceTags.map((tag) => tag.docId!));
    const stale = collections.flatMap((collection) => collection.records.flatMap((record) => {
      const fields = [...ids(record[collection.tagField]), ...ids(record.subjectTagIds), ...ids(record.galleryImplicitSubjectTagIds), ...(typeof record.subjectTagId === 'string' ? [record.subjectTagId] : [])];
      return fields.filter((id) => sourceIds.has(id)).map((id) => `${collection.name}/${record.docId}:${id}`);
    }));
    const remainingTags = tags.filter((tag) => sourceIds.has(tag.docId!));
    console.log(JSON.stringify({ ok: stale.length === 0 && remainingTags.length === 0, staleReferences: stale.length, remainingTags: remainingTags.map((tag) => tag.name), writes: 0 }, null, 2));
    if (stale.length || remainingTags.length) process.exitCode = 1;
    return;
  }
  const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
  const children = new Map<string, Tag[]>();
  for (const tag of tags) if (tag.parentId) children.set(tag.parentId, [...(children.get(tag.parentId) ?? []), tag]);
  const one = (name: string, parent?: string) => {
    const found = tags.filter((tag) => tag.name === name && (!parent || byId.get(tag.parentId ?? '')?.name === parent));
    if (found.length !== 1 || !found[0].docId) throw new Error(`Expected one tag: ${parent ? `${parent} > ` : ''}${name}; found ${found.length}`);
    return found[0];
  };
  const descendants = (tag: Tag) => {
    const result: Tag[] = [];
    const queue = [...(children.get(tag.docId!) ?? [])];
    while (queue.length) { const item = queue.shift()!; result.push(item); queue.push(...(children.get(item.docId!) ?? [])); }
    return result;
  };
  const replacements = new Map<string, string[]>();
  const mapTo = (sources: Tag[], targets: Tag[]) => sources.forEach((source) => replacements.set(source.docId!, targets.map((target) => target.docId!)));

  const business = one('Business', 'Topics');
  mapTo(descendants(business), [business]);
  const birthday = one('Birthday', 'Events');
  mapTo((children.get(birthday.docId!) ?? []).filter((tag) => tag.name !== 'Birth'), [birthday]);
  const anniversary = one('Anniversary', 'Events');
  mapTo(children.get(anniversary.docId!) ?? [], [anniversary]);
  for (const categoryName of ['Outcomes', 'Lessons', 'Superlatives']) {
    const category = one(categoryName, 'Reflections');
    mapTo(descendants(category), [category]);
  }
  const vehicles = one('Vehicles', 'Objects');
  mapTo(descendants(vehicles), [vehicles]);
  const eventGraduation = one('Graduation', 'Events');
  for (const [stageName, oldName] of [['College', 'Graduation'], ['High School', 'Graduationa'], ['Graduate School', 'Graduation']] as const) {
    const stage = one(stageName, 'Education');
    mapTo([one(oldName, stageName)], [stage, eventGraduation]);
  }
  mapTo([one('Army', 'zMisc'), one('Navy', 'zMisc')], [one('Career', 'Life')]);
  mapTo([one('Reception', 'Marriage')], [one('Wedding', 'Events')]);

  const sourceIds = new Set(replacements.keys());
  const affected = collections.map((collection) => ({
    ...collection,
    records: collection.records.filter((record) => [
      ...ids(record[collection.tagField]), ...ids(record.subjectTagIds), ...ids(record.galleryImplicitSubjectTagIds),
      ...(typeof record.subjectTagId === 'string' ? [record.subjectTagId] : []),
    ].some((id) => sourceIds.has(id))),
  }));
  const summary = {
    sourceTags: sourceIds.size,
    assignments: Object.fromEntries(affected.map((item) => [item.name, item.records.length])),
    groups: { employers: descendants(business).length, birthdayAges: (children.get(birthday.docId!) ?? []).filter((tag) => tag.name !== 'Birth').length, anniversaryNumbers: (children.get(anniversary.docId!) ?? []).length },
  };
  console.log(JSON.stringify({ projectId, apply, ...summary, writes: apply ? 'authorized' : 0 }, null, 2));
  if (!apply) return;
  if (projectId !== PROJECT_ID || confirmProject !== PROJECT_ID) throw new Error('Exact project confirmation is required');

  const backupPath = resolve(`temp/what-deterministic-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await mkdir(resolve('temp'), { recursive: true });
  await writeFile(backupPath, `${JSON.stringify({ projectId, createdAt: new Date().toISOString(), sourceTags: tags.filter((tag) => sourceIds.has(tag.docId!)), affected }, null, 2)}\n`, 'utf8');
  for (const collection of affected) {
    for (let start = 0; start < collection.records.length; start += BATCH_SIZE) {
      const batch = firestore.batch();
      for (const record of collection.records.slice(start, start + BATCH_SIZE)) {
        const payload: Record<string, unknown> = {
          [collection.tagField]: replace(record[collection.tagField], replacements),
          subjectTagIds: replace(record.subjectTagIds, replacements),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (Array.isArray(record.galleryImplicitSubjectTagIds)) payload.galleryImplicitSubjectTagIds = replace(record.galleryImplicitSubjectTagIds, replacements);
        if (typeof record.subjectTagId === 'string' && sourceIds.has(record.subjectTagId)) {
          const targets = replacements.get(record.subjectTagId) ?? [];
          payload.subjectTagId = targets[0] ?? FieldValue.delete();
        }
        batch.update(firestore.collection(collection.name).doc(record.docId), payload);
      }
      await batch.commit();
    }
  }
  const result = await mutateTagHierarchy({ kind: 'cleanup', tagId: 'what-deterministic-2026-07-22', reparentByTagId: {}, removeTagIds: [...sourceIds] });
  console.log(JSON.stringify({ backupPath, summary, result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
