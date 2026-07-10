/**
 * Full data backup: Firestore (all root collections), repo Firestore config files,
 * and optional Typesense document exports (JSONL).
 *
 * Does NOT include: Firebase Storage file bytes (use `npm run backup:storage`).
 *
 * Required env: Firebase Admin (`FIREBASE_SERVICE_ACCOUNT_*`), `ONEDRIVE_PATH`.
 * Optional: `TYPESENSE_*` to export `cards` and `media` indexes.
 *
 * CLI: `npm run backup:database` → `backup-firestore.ts` (dotenv preload).
 */

import path from 'path';
import fs from 'fs';
import { adminDb, getAdminApp } from '@/lib/config/firebase/admin';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import {
  pruneOldBackupRuns,
  resolveBackupRootPath,
  safeBackupTimestamp,
} from '@/lib/scripts/firebase/recoveryConstants';

const TYPESENSE_COLLECTIONS = ['cards', 'media'] as const;

const REPO_ROOT = process.cwd();
const INDEXES_SRC = path.join(REPO_ROOT, 'src/lib/config/firebase/firestore.indexes.json');
const RULES_SRC = path.join(REPO_ROOT, 'src/lib/config/firebase/firestore.rules');

export type FullBackupOptions = {
  runDir?: string;
  runId?: string;
  skipPrune?: boolean;
  bundledWithStorage?: boolean;
};

export type FullBackupResult = {
  runId: string;
  runDir: string;
  firestoreDocCount: number;
  firestoreJsonBytes: number;
  firestoreCollections: Record<string, number>;
  sourceProjectId: string | null;
};

export function serializeBackupDoc(
  docId: string,
  data: Record<string, unknown>
): { id: string; [k: string]: unknown } {
  // Reserve `id` for the Firestore document id in backup payloads so restore
  // does not depend on any legacy row-level `id` field stored inside the doc.
  return {
    ...data,
    id: docId,
  };
}

async function exportTypesenseCollection(
  collectionName: string,
  outPath: string
): Promise<{ ok: boolean; lineCount: number; error?: string }> {
  const client = getTypesenseClient();
  if (!client) {
    return { ok: false, lineCount: 0, error: 'Typesense client not configured' };
  }
  try {
    const jsonl = await client.collections(collectionName).documents().export();
    fs.writeFileSync(outPath, jsonl, 'utf8');
    const lineCount = jsonl.trim() ? jsonl.trim().split('\n').length : 0;
    return { ok: true, lineCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, lineCount: 0, error: message };
  }
}

function pruneOldRuns(backupRoot: string, log: (s: string) => void): void {
  pruneOldBackupRuns(backupRoot, log);
}

export async function runFullBackup(options: FullBackupOptions = {}): Promise<FullBackupResult> {
  const lines: string[] = [];
  const log = (s: string) => {
    lines.push(s);
    console.log(s);
  };

  const backupRoot = resolveBackupRootPath();
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const runId = options.runId ?? `run-${safeBackupTimestamp()}`;
  const runDir = options.runDir ?? path.join(backupRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const sourceProjectId =
    getAdminApp().options.projectId ??
    process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ??
    null;

  log(`=== Full database backup ===`);
  log(`Run directory: ${runDir}`);

  const collectionRefs = await adminDb.listCollections();
  log(`Found ${collectionRefs.length} root collection(s).`);

  const firestoreData: Record<string, Array<{ id: string; [k: string]: unknown }>> = {};

  for (const colRef of collectionRefs) {
    const name = colRef.id;
    log(`  Fetching "${name}"...`);
    const snapshot = await colRef.get();
    firestoreData[name] = snapshot.docs.map((doc) =>
      serializeBackupDoc(doc.id, doc.data() as Record<string, unknown>)
    );
    log(`    -> ${snapshot.size} document(s)`);
  }

  const firestorePath = path.join(runDir, 'firestore.json');
  fs.writeFileSync(firestorePath, JSON.stringify(firestoreData, null, 2), 'utf8');
  log(`Wrote ${firestorePath}`);

  const configMeta: Record<string, string> = {};
  if (fs.existsSync(INDEXES_SRC)) {
    const dest = path.join(runDir, 'firestore.indexes.json');
    fs.copyFileSync(INDEXES_SRC, dest);
    configMeta.firestoreIndexes = dest;
    log(`Copied firestore.indexes.json`);
  } else {
    log(`WARN: Missing ${INDEXES_SRC} (indexes not copied)`);
  }

  if (fs.existsSync(RULES_SRC)) {
    const dest = path.join(runDir, 'firestore.rules');
    fs.copyFileSync(RULES_SRC, dest);
    configMeta.firestoreRules = dest;
    log(`Copied firestore.rules`);
  } else {
    log(`WARN: Missing ${RULES_SRC} (rules not copied)`);
  }

  const typesenseResults: Record<string, { ok: boolean; lines?: number; error?: string }> = {};

  if (isTypesenseConfigured()) {
    for (const col of TYPESENSE_COLLECTIONS) {
      const out = path.join(runDir, `typesense-${col}.jsonl`);
      log(`Exporting Typesense collection "${col}"...`);
      const r = await exportTypesenseCollection(col, out);
      typesenseResults[col] = r.ok
        ? { ok: true, lines: r.lineCount }
        : { ok: false, error: r.error };
      if (r.ok) {
        log(`    -> ${r.lineCount} line(s) -> ${out}`);
      } else {
        log(`    -> skipped/failed: ${r.error}`);
      }
    }
  } else {
    log('Typesense not configured (TYPESENSE_HOST / TYPESENSE_API_KEY); skipping index export.');
    for (const col of TYPESENSE_COLLECTIONS) {
      typesenseResults[col] = { ok: false, error: 'Typesense not configured' };
    }
  }

  const metadata = {
    timestamp: new Date().toISOString(),
    runId,
    firestoreCollections: Object.fromEntries(
      Object.entries(firestoreData).map(([k, v]) => [k, v.length])
    ),
    firestoreJsonBytes: fs.statSync(firestorePath).size,
    configFiles: configMeta,
    typesense: typesenseResults,
    notes: options.bundledWithStorage
      ? [
          'Paired Firestore + Storage backup run (see run-manifest.json).',
          'Typesense schema lives in code (typesenseService / typesenseMediaService); documents exported as JSONL when configured.',
        ]
      : [
          'Firebase Storage object bytes are not in this backup; run `npm run backup:storage` or `npm run backup:run` for Storage bytes.',
          'Typesense schema lives in code (typesenseService / typesenseMediaService); documents exported as JSONL when configured.',
        ],
  };

  fs.writeFileSync(path.join(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
  log(`Wrote metadata.json`);

  const summaryPath = path.join(runDir, 'summary.txt');
  fs.writeFileSync(summaryPath, lines.join('\n') + '\n', 'utf8');

  const firestoreDocCount = Object.values(firestoreData).reduce((sum, docs) => sum + docs.length, 0);

  if (!options.skipPrune) {
    pruneOldRuns(backupRoot, log);
  }
  log('=== Backup finished ===');

  return {
    runId,
    runDir,
    firestoreDocCount,
    firestoreJsonBytes: fs.statSync(firestorePath).size,
    firestoreCollections: Object.fromEntries(
      Object.entries(firestoreData).map(([name, docs]) => [name, docs.length])
    ),
    sourceProjectId: sourceProjectId ? String(sourceProjectId) : null,
  };
}
