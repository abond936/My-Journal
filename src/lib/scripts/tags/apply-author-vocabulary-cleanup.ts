import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { mutateTagHierarchy } from '@/lib/services/tagHierarchyMutationService';
import { buildMutatedTagCatalog } from '@/lib/utils/tagHierarchyMutation';
import type { Tag } from '@/lib/types/tag';

const PROJECT_ID = 'my-journal-936';
const FRIENDS_ID = 'P7o3H0wjWe3RMD7Fhb8s';
const FRIEND_IDS = [
  '7oDcYOyjddgA4COA9Tpo', 'VWhhxCIyTYxe5fBCJkZH', 'BMF76cQwztwzanmCVW9w',
  'h8pbyi0kpL4oQRWRaUlT', 'StYbIL3d22aZu3jIhmSU', 'Gunk8qRnRBzD3QIB78A8',
  '8PK9uYaIXeZs5u8n30Mh', '0V7KN3FXBBqQl2GQYOt1', 'o4r3kef9fl74hf62fhJv',
];
const REMOVE_IDS = [
  'ZfNsiXRr8lQc9Ijcz7Qz', 'XWH34qgqMrBZvYDrULYs', '6U8OY0SV0cQoTNTZPAcf',
  'DyLpkAcbIkuM4QfbQz5d', 'dSTq1TyBUnz4DH46nEbX', 'GZz0UauXwghbQlQlImvw',
  'WTZ252Vosa6pT08fEg14', 'egCfUt3LJ5XSNpxLsbm7', 'sMSE97SvEJZ8PskMHm2R',
];
const EXPECTED_FRIEND_NAMES = [
  'Karen Albright', 'Aileen Ferguson', 'Anne Frank', 'Betty Edwards', 'Ed Edwards',
  'Craig Neimiec', 'Gov. Carroll Campbell', 'Jerry Pierson', 'Stephanie Baker',
];
const EXPECTED_REMOVE_NAMES = [
  'Bob & Sandra', 'Children', 'Cousins', 'Father', 'Grandkids', 'Mother', 'Parents', 'Siblings', 'Spouse',
];

async function loadTags(): Promise<Tag[]> {
  const snap = await getAdminApp().firestore().collection('tags').get();
  return snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Tag);
}

function assertPlan(tags: Tag[]) {
  const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
  if (byId.get(FRIENDS_ID)?.name !== 'Friends') throw new Error('Friends target does not match');
  FRIEND_IDS.forEach((id, index) => {
    if (byId.get(id)?.name !== EXPECTED_FRIEND_NAMES[index]) throw new Error(`Friend match changed at ${id}`);
  });
  REMOVE_IDS.forEach((id, index) => {
    if (byId.get(id)?.name !== EXPECTED_REMOVE_NAMES[index]) throw new Error(`Removal match changed at ${id}`);
  });
}

async function main() {
  const app = getAdminApp();
  const projectId = app.options.projectId || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apply = process.argv.includes('--apply');
  const verify = process.argv.includes('--verify');
  const confirmProject = process.argv.find((arg) => arg.startsWith('--confirm-project='))?.slice(18);
  const tags = await loadTags();
  if (verify) {
    const byId = new Map(tags.map((tag) => [tag.docId!, tag]));
    const errors: string[] = [
      ...FRIEND_IDS.filter((id) => byId.get(id)?.parentId !== FRIENDS_ID).map((id) => `not under Friends: ${byId.get(id)?.name ?? id}`),
      ...REMOVE_IDS.filter((id) => byId.has(id)).map((id) => `not removed: ${byId.get(id)?.name ?? id}`),
    ];
    const referenceFields = ['tags', 'subjectTagId', 'subjectTagIds', 'galleryImplicitSubjectTagIds', 'filterTags', 'subjectFilterTags'];
    const checked: Record<string, number> = {};
    for (const collectionName of ['cards', 'media', 'questions']) {
      const snapshot = await app.firestore().collection(collectionName).get();
      checked[collectionName] = snapshot.size;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        referenceFields.forEach((field) => {
          const value = data[field];
          const ids = Array.isArray(value)
            ? value
            : value && typeof value === 'object'
              ? Object.keys(value).filter((key) => value[key] === true)
              : typeof value === 'string' ? [value] : [];
          const stale = ids.filter((id) => REMOVE_IDS.includes(id));
          if (stale.length > 0) errors.push(`${collectionName}/${doc.id}.${field}: ${stale.join(', ')}`);
        });
      });
    }
    console.log(JSON.stringify({ ok: errors.length === 0, checked, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
    return;
  }
  assertPlan(tags);
  const mutation = {
    kind: 'cleanup' as const,
    tagId: 'author-vocabulary-cleanup-2026-07-21',
    reparentByTagId: Object.fromEntries(FRIEND_IDS.map((id) => [id, FRIENDS_ID])),
    removeTagIds: REMOVE_IDS,
  };
  const prospective = buildMutatedTagCatalog(tags, mutation);
  console.log(JSON.stringify({
    projectId,
    apply,
    moves: EXPECTED_FRIEND_NAMES,
    removals: EXPECTED_REMOVE_NAMES,
    prospectiveTags: prospective.length,
    writes: apply ? 'authorized' : 0,
  }, null, 2));
  if (!apply) return;
  if (projectId !== PROJECT_ID || confirmProject !== PROJECT_ID) throw new Error('Exact project confirmation is required');
  console.log(JSON.stringify(await mutateTagHierarchy(mutation), null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
