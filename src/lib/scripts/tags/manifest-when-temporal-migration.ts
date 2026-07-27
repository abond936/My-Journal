import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { temporalFromWhenTagIds } from '@/lib/utils/temporalFromWhenTags';
import type { Tag } from '@/lib/types/tag';
import type { TemporalValue } from '@/lib/types/temporal';

loadEnv({ path: '.env.local', override: false, quiet: true });

type Entry = {
  collection: 'media' | 'cards';
  docId: string;
  result: 'convert' | 'ambiguous' | 'unparseable' | 'already-populated' | 'no-when-tags';
  whenTagIds: string[];
  whenTagNames: string[];
  existingTemporal: TemporalValue | null;
  proposedTemporal: TemporalValue | null;
  candidates?: TemporalValue[];
  updateTime: { seconds: number; nanoseconds: number };
};

const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = path.resolve(
  manifestArg?.slice('--manifest='.length) ?? 'temp/when-temporal-migration.json'
);

function fingerprint(entries: Entry[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

async function main(): Promise<void> {
  if (process.argv.includes('--apply') || process.argv.includes('--rollback')) {
    throw new Error('This command is manifest-only. It cannot write production data.');
  }
  const app = getAdminApp();
  try {
    const firestore = app.firestore();
    const [tagSnapshot, mediaSnapshot, cardSnapshot] = await Promise.all([
      firestore.collection('tags').get(),
      firestore.collection('media').select('when', 'temporal').get(),
      firestore.collection('cards').select('when', 'temporal').get(),
    ]);
    const tags = tagSnapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Tag));
    const tagMap = new Map(tags.map((tag) => [tag.docId!, tag]));
    const entries: Entry[] = [];

    for (const [collection, snapshot] of [
      ['media', mediaSnapshot],
      ['cards', cardSnapshot],
    ] as const) {
      for (const doc of snapshot.docs) {
        const data = doc.data() as { when?: string[]; temporal?: TemporalValue | null };
        const whenTagIds = data.when ?? [];
        const parsed = temporalFromWhenTagIds(whenTagIds, tagMap);
        const base = {
          collection,
          docId: doc.id,
          whenTagIds: parsed.tagIds,
          whenTagNames: parsed.tagNames,
          existingTemporal: data.temporal ?? null,
          updateTime: { seconds: doc.updateTime.seconds, nanoseconds: doc.updateTime.nanoseconds },
        };
        if (data.temporal) {
          entries.push({ ...base, result: 'already-populated', proposedTemporal: null });
        } else if (whenTagIds.length === 0) {
          entries.push({ ...base, result: 'no-when-tags', proposedTemporal: null });
        } else if (parsed.status === 'convertible') {
          entries.push({ ...base, result: 'convert', proposedTemporal: parsed.value });
        } else if (parsed.status === 'ambiguous') {
          entries.push({
            ...base,
            result: 'ambiguous',
            proposedTemporal: null,
            candidates: parsed.candidates,
          });
        } else {
          entries.push({ ...base, result: 'unparseable', proposedTemporal: null });
        }
      }
    }

    entries.sort((a, b) => a.collection.localeCompare(b.collection) || a.docId.localeCompare(b.docId));
    const summary = Object.fromEntries(
      ['media', 'cards'].map((collection) => [
        collection,
        Object.fromEntries(
          ['convert', 'ambiguous', 'unparseable', 'already-populated', 'no-when-tags'].map((result) => [
            result,
            entries.filter((entry) => entry.collection === collection && entry.result === result).length,
          ])
        ),
      ])
    );
    const manifest = {
      version: 1,
      projectId: app.options.projectId ?? null,
      generatedAt: new Date().toISOString(),
      fingerprint: fingerprint(entries),
      summary,
      entries,
    };
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ manifestPath, ...manifest, entries: undefined }, null, 2));
  } finally {
    await app.delete();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
