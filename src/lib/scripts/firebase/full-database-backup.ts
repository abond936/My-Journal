/**
 * Full data backup: Firestore (all root collections), repo Firestore config files,
 * and optional Typesense document exports (JSONL).
 *
 * Does NOT include: Firebase Storage file bytes (use Firebase Console / gcloud export).
 *
 * Required env: Firebase Admin (`FIREBASE_SERVICE_ACCOUNT_*`), `ONEDRIVE_PATH`.
 * Optional: `TYPESENSE_*` to export `cards` and `media` indexes.
 *
 * CLI: `npm run backup:database` → `backup-firestore.ts` (dotenv preload).
 */

import path from 'path';
import fs from 'fs';
import { adminDb } from '@/lib/config/firebase/admin';
import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';

const TYPESENSE_COLLECTIONS = ['cards', 'media'] as const;

const REPO_ROOT = process.cwd();
const INDEXES_SRC = path.join(REPO_ROOT, 'src/lib/config/firebase/firestore.indexes.json');
const RULES_SRC = path.join(REPO_ROOT, 'src/lib/config/firebase/firestore.rules');

const BACKUPS_SUBDIR = 'Firebase Backups';
const KEEP_RUNS = 5;

function safeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  const entries = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('run-'))
    .map((d) => d.name)
    .sort()
    .reverse();

  if (entries.length <= KEEP_RUNS) return;

  for (const name of entries.slice(KEEP_RUNS)) {
    const p = path.join(backupRoot, name);
    fs.rmSync(p, { recursive: true, force: true });
    log(`Removed old backup run: ${name}`);
  }
}

export async function runFullBackup(): Promise<void> {
  const lines: string[] = [];
  const log = (s: string) => {
    lines.push(s);
    console.log(s);
  };

  const onedrive = process.env.ONEDRIVE_PATH?.trim();
  if (!onedrive) {
    throw new Error('ONEDRIVE_PATH is not set; cannot write backup under OneDrive.');
  }

  const backupRoot = path.join(onedrive, BACKUPS_SUBDIR);
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const runId = `run-${safeTimestamp()}`;
  const runDir = path.join(backupRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });

  log(`=== Full database backup ===`);
  log(`Run directory: ${runDir}`);

  const collectionRefs = await adminDb.listCollections();
  log(`Found ${collectionRefs.length} root collection(s).`);

  const firestoreData: Record<string, Array<{ id: string; [k: string]: unknown }>> = {};

  for (const colRef of collectionRefs) {
    const name = colRef.id;
    log(`  Fetching "${name}"...`);
    const snapshot = await colRef.get();
    firestoreData[name] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
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
    notes: [
      'Firebase Storage object bytes are not in this backup; use Google Cloud / Firebase export for blobs if needed.',
      'Typesense schema lives in code (typesenseService / typesenseMediaService); documents exported as JSONL when configured.',
    ],
  };

  fs.writeFileSync(path.join(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
  log(`Wrote metadata.json`);

  const summaryPath = path.join(runDir, 'summary.txt');
  fs.writeFileSync(summaryPath, lines.join('\n') + '\n', 'utf8');

  pruneOldRuns(backupRoot, log);
  log('=== Backup finished ===');
}
