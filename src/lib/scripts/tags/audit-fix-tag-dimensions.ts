#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Tag } from '@/lib/types/tag';

dotenv.config({ path: resolve(process.cwd(), '.env') });

type CanonicalDimension = 'who' | 'what' | 'when' | 'where';

function normalizeDimension(value: unknown): CanonicalDimension | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'who' || raw === 'what' || raw === 'when' || raw === 'where') return raw;
  return undefined;
}

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes('--apply'),
    limit: Number(argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || undefined,
  };
}

async function run() {
  const { apply, limit } = parseArgs(process.argv.slice(2));
  const admin = getAdminApp();
  const db = admin.firestore();

  let query: FirebaseFirestore.Query = db.collection('tags');
  if (limit) query = query.limit(limit);

  const snap = await query.get();
  const tags = snap.docs.map((doc) => ({ docId: doc.id, ...(doc.data() as Tag) }));
  const tagById = new Map(tags.map((tag) => [tag.docId!, tag]));

  const visitedCache = new Map<string, CanonicalDimension | undefined>();
  const resolveByAncestor = (tagId: string): CanonicalDimension | undefined => {
    if (visitedCache.has(tagId)) return visitedCache.get(tagId);
    const visited = new Set<string>();
    let current = tagById.get(tagId);
    while (current?.docId && !visited.has(current.docId)) {
      visited.add(current.docId);
      const direct = normalizeDimension(current.dimension);
      if (direct) {
        visitedCache.set(tagId, direct);
        return direct;
      }
      if (!current.parentId) break;
      current = tagById.get(current.parentId);
    }
    visitedCache.set(tagId, undefined);
    return undefined;
  };

  const missingDimension: string[] = [];
  const rootMissingDimension: string[] = [];
  const invalidDimension: string[] = [];
  const mismatchedWithParent: string[] = [];
  const orphanParent: string[] = [];
  const fixableByAncestor: Array<{ id: string; dimension: CanonicalDimension }> = [];
  const fixableByParentMatch: Array<{ id: string; dimension: CanonicalDimension }> = [];

  for (const tag of tags) {
    const id = tag.docId!;
    const ownDim = normalizeDimension(tag.dimension);
    const hasParent = Boolean(tag.parentId);
    const parent = tag.parentId ? tagById.get(tag.parentId) : undefined;
    const parentDim = parent ? normalizeDimension(parent.dimension) : undefined;

    if (tag.dimension !== undefined && !ownDim) invalidDimension.push(id);
    if (!ownDim) {
      missingDimension.push(id);
      if (!hasParent) rootMissingDimension.push(id);
      const resolved = resolveByAncestor(id);
      if (resolved) fixableByAncestor.push({ id, dimension: resolved });
    }
    if (hasParent && !parent) orphanParent.push(id);
    if (hasParent && ownDim && parentDim && ownDim !== parentDim) {
      mismatchedWithParent.push(id);
      fixableByParentMatch.push({ id, dimension: parentDim });
    }
  }

  console.log('Tag dimension integrity audit');
  console.log(`- Total tags: ${tags.length}`);
  console.log(`- Missing dimension: ${missingDimension.length}`);
  console.log(`- Missing dimension on roots: ${rootMissingDimension.length}`);
  console.log(`- Invalid dimension values: ${invalidDimension.length}`);
  console.log(`- Parent/child mismatches: ${mismatchedWithParent.length}`);
  console.log(`- Orphan parent references: ${orphanParent.length}`);
  console.log(`- Fixable missing dimensions (ancestor-derived): ${fixableByAncestor.length}`);
  console.log(`- Fixable mismatches (align to parent): ${fixableByParentMatch.length}`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to persist fixable missing dimensions.');
    return;
  }

  const updatesById = new Map<string, CanonicalDimension>();
  for (const item of fixableByAncestor) updatesById.set(item.id, item.dimension);
  for (const item of fixableByParentMatch) updatesById.set(item.id, item.dimension);
  const updates = Array.from(updatesById.entries()).map(([id, dimension]) => ({ id, dimension }));

  if (!updates.length) {
    console.log('\nNo fixable missing dimensions found. Nothing to write.');
    return;
  }

  const batchSize = 400;
  for (let i = 0; i < updates.length; i += batchSize) {
    const chunk = updates.slice(i, i + batchSize);
    const batch = db.batch();
    for (const item of chunk) {
      const ref = db.collection('tags').doc(item.id);
      batch.update(ref, {
        dimension: item.dimension,
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }

  console.log(`\nApplied dimensions to ${updates.length} tags.`);
}

run().catch((error) => {
  console.error('audit-fix-tag-dimensions failed', error);
  process.exit(1);
});

