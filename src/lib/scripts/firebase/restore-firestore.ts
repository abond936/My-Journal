/**
 * Firestore restore helper for isolated recovery drills.
 *
 * Default behavior is dry-run only. To write, pass `--apply` and confirm the
 * target project with `--confirm-project=<projectId>`.
 *
 * Safety rules:
 * - Refuses to run against the production project id.
 * - Refuses to write into a non-empty Firestore target unless `--allow-non-empty`.
 * - Restores only the collections/documents present in `firestore.json`; it does
 *   not delete extra documents already in the target project.
 */

import fs from 'fs';
import path from 'path';
import { adminDb, getAdminApp } from '../../config/firebase/admin';

const PRODUCTION_PROJECT_ID = 'my-journal-936';
const MAX_BATCH_WRITES = 400;

type BackupDoc = {
  id: string;
  [key: string]: unknown;
};

type BackupData = Record<string, BackupDoc[]>;

type ParsedArgs = {
  allowNonEmpty: boolean;
  apply: boolean;
  backupPath: string | null;
  confirmProject: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  let allowNonEmpty = false;
  let apply = false;
  let backupPath: string | null = null;
  let confirmProject: string | null = null;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--allow-non-empty') {
      allowNonEmpty = true;
      continue;
    }
    if (arg.startsWith('--backup=')) {
      backupPath = arg.slice('--backup='.length).trim() || null;
      continue;
    }
    if (arg.startsWith('--confirm-project=')) {
      confirmProject = arg.slice('--confirm-project='.length).trim() || null;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsageAndExit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    allowNonEmpty,
    apply,
    backupPath,
    confirmProject,
  };
}

function printUsageAndExit(code: number): never {
  const lines = [
    'Usage:',
    '  npm run restore:database -- --backup="<path-to-run-dir-or-firestore.json>"',
    '  npm run restore:database -- --backup="<path>" --apply --confirm-project=<targetProjectId>',
    '',
    'Flags:',
    '  --backup=<path>             Path to a backup run directory or its firestore.json file',
    '  --apply                     Actually write to Firestore; otherwise dry-run only',
    '  --confirm-project=<id>      Required with --apply; must match the Firebase Admin target project id',
    '  --allow-non-empty           Allow writes when the target Firestore already has root collections',
    '  --help                      Show this help',
    '',
    'Safety:',
    `  - Writes are blocked for the production project (${PRODUCTION_PROJECT_ID}).`,
    '  - Dry-run is the default.',
  ];

  console.log(lines.join('\n'));
  process.exit(code);
}

function resolveFirestoreJsonPath(inputPath: string): string {
  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup path does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const jsonPath = path.join(resolved, 'firestore.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Backup directory does not contain firestore.json: ${resolved}`);
    }
    return jsonPath;
  }

  if (path.basename(resolved).toLowerCase() !== 'firestore.json') {
    throw new Error('Backup path must be a run directory or a firestore.json file.');
  }

  return resolved;
}

function loadBackupData(firestoreJsonPath: string): BackupData {
  const raw = fs.readFileSync(firestoreJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup file is not a valid Firestore collection map.');
  }

  const data = parsed as Record<string, unknown>;
  const out: BackupData = {};

  for (const [collectionName, value] of Object.entries(data)) {
    if (!Array.isArray(value)) {
      throw new Error(`Collection "${collectionName}" is not an array in firestore.json.`);
    }

    out[collectionName] = value.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Collection "${collectionName}" item ${index} is not an object.`);
      }

      const doc = row as Record<string, unknown>;
      if (typeof doc.id !== 'string' || doc.id.trim().length === 0) {
        throw new Error(`Collection "${collectionName}" item ${index} is missing a string id.`);
      }

      return doc as BackupDoc;
    });
  }

  return out;
}

async function getTargetProjectId(): Promise<string> {
  const app = getAdminApp();
  const projectId =
    app.options.projectId ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ||
    null;

  if (!projectId) {
    throw new Error('Could not determine target Firebase project id from Firebase Admin config.');
  }

  return String(projectId);
}

async function listExistingRootCollections(): Promise<Array<{ name: string; count: number }>> {
  const collections = await adminDb.listCollections();
  const out: Array<{ name: string; count: number }> = [];

  for (const collectionRef of collections) {
    const snapshot = await collectionRef.limit(1).get();
    out.push({ name: collectionRef.id, count: snapshot.size });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function commitRestore(data: BackupData): Promise<void> {
  let batch = adminDb.batch();
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
    await batch.commit();
    batch = adminDb.batch();
    pending = 0;
  };

  for (const [collectionName, docs] of Object.entries(data)) {
    for (const doc of docs) {
      const { id, ...payload } = doc;
      batch.set(adminDb.collection(collectionName).doc(id), payload);
      pending += 1;

      if (pending >= MAX_BATCH_WRITES) {
        await flush();
      }
    }
  }

  await flush();
}

function summarizeBackup(data: BackupData): {
  collectionCount: number;
  docCount: number;
  lines: string[];
} {
  const names = Object.keys(data).sort();
  const lines = names.map((name) => `  - ${name}: ${data[name].length} document(s)`);
  const docCount = names.reduce((sum, name) => sum + data[name].length, 0);
  return {
    collectionCount: names.length,
    docCount,
    lines,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.backupPath) {
    printUsageAndExit(1);
  }

  const firestoreJsonPath = resolveFirestoreJsonPath(args.backupPath);
  const backupData = loadBackupData(firestoreJsonPath);
  const backupSummary = summarizeBackup(backupData);
  const targetProjectId = await getTargetProjectId();
  const existingRootCollections = await listExistingRootCollections();
  const hasExistingData = existingRootCollections.some((row) => row.count > 0);

  console.log('=== Firestore restore helper ===');
  console.log(`Backup file: ${firestoreJsonPath}`);
  console.log(`Target project: ${targetProjectId}`);
  console.log(`Backup collections: ${backupSummary.collectionCount}`);
  console.log(`Backup documents: ${backupSummary.docCount}`);
  for (const line of backupSummary.lines) {
    console.log(line);
  }

  if (existingRootCollections.length === 0) {
    console.log('Target root collections: none');
  } else {
    console.log('Target root collections:');
    for (const row of existingRootCollections) {
      console.log(`  - ${row.name}: ${row.count > 0 ? 'non-empty' : 'empty'}`);
    }
  }

  if (targetProjectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Restore helper is blocked for the production project (${PRODUCTION_PROJECT_ID}). Use a disposable recovery target instead.`
    );
  }

  if (!args.apply) {
    console.log('\nDry run only. No Firestore writes were made.');
    console.log('To apply: add --apply --confirm-project=<targetProjectId>');
    return;
  }

  if (!args.confirmProject) {
    throw new Error('Missing --confirm-project=<targetProjectId> for apply mode.');
  }
  if (args.confirmProject !== targetProjectId) {
    throw new Error(
      `Confirmed project "${args.confirmProject}" does not match target Firebase project "${targetProjectId}".`
    );
  }
  if (hasExistingData && !args.allowNonEmpty) {
    throw new Error(
      'Target Firestore is not empty. Refusing to write without --allow-non-empty.'
    );
  }

  console.log('\nApplying restore...');
  await commitRestore(backupData);
  console.log('Restore write completed.');
  console.log('Next steps: deploy matching indexes/rules if needed, rebuild Typesense, then run integrity/build verification.');
}

main().catch((error) => {
  console.error('\nRestore failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
