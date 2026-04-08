import 'dotenv/config';
import { createTag, getAllTags } from '@/lib/firebase/tagService';
import type { Tag } from '@/lib/types/tag';

const SENTINEL_NAME = 'zNA';
const DIMENSIONS: Tag['dimension'][] = ['who', 'what', 'when', 'where'];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

async function main() {
  console.log('--- Seed zNA root tags (one per dimension) ---');
  const all = await getAllTags();

  for (const dimension of DIMENSIONS) {
    if (!dimension) continue;
    const exists = all.some(
      (t) =>
        !t.parentId &&
        t.dimension === dimension &&
        norm(t.name || '') === norm(SENTINEL_NAME)
    );
    if (exists) {
      console.log(`Skip ${dimension}: root "${SENTINEL_NAME}" already exists`);
      continue;
    }
    const created = await createTag({
      name: SENTINEL_NAME,
      dimension,
      defaultExpanded: false,
    });
    console.log(`Created ${dimension} root "${SENTINEL_NAME}" → ${created.docId}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
