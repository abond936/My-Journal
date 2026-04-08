/**
 * One-time migration: merge the legacy `reflection` tag dimension into `what`.
 * - Reparents former reflection roots under a What root tag named "Reflections" (creates it if missing).
 * - Sets dimension to `what` on all tags that were `reflection`.
 * - Rebuilds `path` on all tags (same logic as backfill-tag-paths).
 * - Removes `reflection` / `hasReflection` from cards and media (merges any stray ids into `what`).
 *
 * Usage: npx tsx src/lib/scripts/tags/consolidate-reflection-dimension.ts [--dry-run]
 */
import 'dotenv/config';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const db = adminApp.firestore();
const TAGS = 'tags';
const CARDS = 'cards';
const MEDIA = 'media';

const REFLECTIONS_NAME = 'Reflections';

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

function findReflectionsHub(tags: Tag[]): Tag | null {
  const candidates = tags.filter(
    (t) =>
      t.dimension === 'what' &&
      (t.name || '').trim().toLowerCase() === REFLECTIONS_NAME.toLowerCase()
  );
  const root = candidates.find((c) => !c.parentId);
  return root ?? candidates[0] ?? null;
}

/** Full path from root to node (inclusive), matching backfill-tag-paths.ts. */
function rebuildAllPaths(tagMap: Map<string, Tag>): Map<string, string[]> {
  const childrenByParent = new Map<string, string[]>();
  tagMap.forEach((t, id) => {
    const p = t.parentId || '';
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p)!.push(id);
  });

  const rootIds = [...tagMap.keys()].filter((id) => !tagMap.get(id)!.parentId);

  const paths = new Map<string, string[]>();

  function walk(tagId: string, prefix: string[]) {
    const next = [...prefix, tagId];
    paths.set(tagId, next);
    const kids = childrenByParent.get(tagId);
    if (kids) {
      kids.forEach((c) => walk(c, next));
    }
  }

  rootIds.forEach((id) => walk(id, []));
  return paths;
}

async function migrateTags(dry: boolean): Promise<void> {
  const snap = await db.collection(TAGS).get();
  const tagMap = new Map<string, Tag>();
  snap.docs.forEach((d) => {
    tagMap.set(d.id, { docId: d.id, ...(d.data() as object) } as Tag);
  });

  const reflectionTags = [...tagMap.values()].filter((t) => t.dimension === 'reflection');
  const reflectionIds = new Set(reflectionTags.map((t) => t.docId!));

  let hubId: string | null = findReflectionsHub([...tagMap.values()])?.docId ?? null;

  if (reflectionTags.length === 0) {
    console.log('No tags with dimension "reflection". Skipping tag tree changes.');
  } else {
    console.log(`Found ${reflectionTags.length} tag(s) with dimension "reflection".`);

    if (!hubId) {
      const whatRoots = [...tagMap.values()].filter((t) => t.dimension === 'what' && !t.parentId);
      const maxOrder = whatRoots.reduce((m, t) => Math.max(m, t.order ?? 0), 0);
      if (dry) {
        console.log(`[dry-run] Would create What root "${REFLECTIONS_NAME}" with order ${maxOrder + 1}.`);
        hubId = '__new_reflections__';
      } else {
        const ref = db.collection(TAGS).doc();
        await ref.set({
          name: REFLECTIONS_NAME,
          dimension: 'what',
          path: [],
          order: maxOrder + 1,
          cardCount: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        hubId = ref.id;
        tagMap.set(hubId, {
          docId: hubId,
          name: REFLECTIONS_NAME,
          dimension: 'what',
          path: [],
          order: maxOrder + 1,
          cardCount: 0,
        });
        console.log(`Created What root "${REFLECTIONS_NAME}" (${hubId}).`);
      }
    } else {
      console.log(`Using existing Reflections hub tag ${hubId}.`);
    }

    const roots = reflectionTags.filter(
      (t) => !t.parentId || !reflectionIds.has(t.parentId)
    );

    for (const t of reflectionTags) {
      const isRoot = roots.some((r) => r.docId === t.docId);
      const dimension = 'what';

      if (dry) {
        console.log(
          `[dry-run] Tag ${t.docId} (${t.name}): dimension what` +
            (isRoot ? `, parentId -> ${hubId}` : '')
        );
        continue;
      }

      const ref = db.collection(TAGS).doc(t.docId!);
      if (isRoot) {
        await ref.update({
          dimension,
          parentId: hubId,
          updatedAt: Date.now(),
        });
        const updated = { ...t, dimension: 'what' as const, parentId: hubId! };
        tagMap.set(t.docId!, updated);
      } else {
        await ref.update({
          dimension,
          updatedAt: Date.now(),
        });
        tagMap.set(t.docId!, { ...t, dimension: 'what' });
      }
    }

    if (!dry) {
      const snapFresh = await db.collection(TAGS).get();
      const freshMap = new Map<string, Tag>();
      snapFresh.docs.forEach((d) => {
        freshMap.set(d.id, { docId: d.id, ...(d.data() as object) } as Tag);
      });
      const paths = rebuildAllPaths(freshMap);
      let batch = db.batch();
      let n = 0;
      for (const [id, path] of paths) {
        batch.update(db.collection(TAGS).doc(id), { path, updatedAt: Date.now() });
        n++;
        if (n >= 450) {
          await batch.commit();
          batch = db.batch();
          n = 0;
        }
      }
      if (n > 0) await batch.commit();
      console.log('Rebuilt tag paths for all tags.');
    }
  }
}

async function cleanupCards(dry: boolean): Promise<void> {
  const snap = await db.collection(CARDS).get();
  let updated = 0;
  let batch = db.batch();
  let n = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!('reflection' in data)) continue;
    const refArr = Array.isArray(data.reflection) ? (data.reflection as string[]) : [];
    const whatArr = Array.isArray(data.what) ? [...(data.what as string[])] : [];
    const merged = [...new Set([...whatArr, ...refArr])];

    if (dry) {
      console.log(`[dry-run] Card ${doc.id}: remove reflection, what -> ${merged.length} id(s)`);
      continue;
    }

    batch.update(doc.ref, {
      what: merged,
      reflection: FieldValue.delete(),
      updatedAt: Date.now(),
    });
    updated++;
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (!dry && n > 0) await batch.commit();
  if (!dry) console.log(`Updated ${updated} card document(s) (removed reflection field).`);
}

async function cleanupMedia(dry: boolean): Promise<void> {
  const snap = await db.collection(MEDIA).get();
  let updated = 0;
  let batch = db.batch();
  let n = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const hasRefField = 'reflection' in data;
    const hasFlag = data.hasReflection === true;
    if (!hasRefField && !hasFlag) continue;

    const refArr = Array.isArray(data.reflection) ? (data.reflection as string[]) : [];
    const whatArr = Array.isArray(data.what) ? [...(data.what as string[])] : [];
    const merged = [...new Set([...whatArr, ...refArr])];

    if (dry) {
      console.log(`[dry-run] Media ${doc.id}: remove reflection/hasReflection`);
      continue;
    }

    batch.update(doc.ref, {
      what: merged,
      reflection: FieldValue.delete(),
      hasReflection: FieldValue.delete(),
      updatedAt: Date.now(),
    });
    updated++;
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (!dry && n > 0) await batch.commit();
  if (!dry) console.log(`Updated ${updated} media document(s) (removed reflection fields).`);
}

async function main() {
  const dry = isDryRun();
  console.log(dry ? '--- DRY RUN (no writes) ---' : '--- Consolidate reflection dimension ---');
  await migrateTags(dry);
  await cleanupCards(dry);
  await cleanupMedia(dry);
  console.log(dry ? 'Dry run finished.' : 'Done.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
