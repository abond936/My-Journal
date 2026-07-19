import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { config as loadEnv } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { classifyMediaIdentityEvidence } from '@/lib/utils/mediaContentIdentityClassification';
import { resolveBackupRootPath } from './recoveryConstants';

loadEnv({ path: '.env.local', override: false, quiet: true });

const EXPECTED_PROJECT = 'my-journal-936';
const ASSESSMENT_VERSION = 1 as const;
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : process.argv.includes('--audit') ? 'audit' : 'dry-run';
const manifestArg = process.argv.find(arg => arg.startsWith('--manifest='));
const manifestPath = path.resolve(manifestArg?.slice('--manifest='.length) ?? 'temp/media-content-identity-classification.json');

type ClassificationStatus = 'local-original-not-found' | 'source-original-not-retained';
type Row = {
  docId: string;
  source?: string;
  sourcePath?: string;
  contentIdentity?: { digest?: string };
  contentIdentityAssessment?: { status?: string; basis?: string; assessmentVersion?: number; assessedAt?: number };
  updateTime: { seconds: number; nanoseconds: number };
};
type Entry = { mediaId: string; status: ClassificationStatus; source: string | null; sourcePath: string | null; updateTime: { seconds: number; nanoseconds: number } };
type Manifest = { version: 1; generatedAt: string; fingerprint: string; entries: Entry[]; applied: boolean };

function fingerprint(entries: Entry[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function requireProductionConfirmation(): void {
  const confirmation = process.argv.find(arg => arg.startsWith('--confirm-project='))?.split('=')[1];
  if (confirmation !== EXPECTED_PROJECT || process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID !== EXPECTED_PROJECT) {
    throw new Error(`Production mutation requires --confirm-project=${EXPECTED_PROJECT} and matching credentials`);
  }
}

function requireFreshBackup(): void {
  const root = resolveBackupRootPath();
  const pointer = JSON.parse(readFileSync(path.join(root, 'latest-complete-run.json'), 'utf8')) as { runDir?: string };
  if (!pointer.runDir) throw new Error('Latest complete backup pointer has no run directory');
  const manifest = JSON.parse(readFileSync(path.join(pointer.runDir, 'run-manifest.json'), 'utf8')) as {
    timestamp: string; complete: boolean; sourceProjectId: string | null; storage?: { mode?: string };
  };
  const age = Date.now() - Date.parse(manifest.timestamp);
  if (!manifest.complete || manifest.storage?.mode !== 'apply' || manifest.sourceProjectId !== EXPECTED_PROJECT ||
      !Number.isFinite(age) || age < 0 || age > MAX_BACKUP_AGE_MS) {
    throw new Error('A complete paired production backup less than 24 hours old is required');
  }
}

function safeLocalPath(sourcePath: string | undefined): string | null {
  const root = process.env.ONEDRIVE_ROOT_FOLDER;
  if (!root || !sourcePath) return null;
  const rootPath = path.resolve(root);
  const candidate = path.resolve(rootPath, ...sourcePath.replaceAll('\\', '/').split('/'));
  const relative = path.relative(rootPath, candidate);
  return relative.startsWith('..') || path.isAbsolute(relative) ? null : candidate;
}

async function localOriginalExists(row: Row): Promise<boolean> {
  const candidate = safeLocalPath(row.sourcePath);
  if (!candidate) return false;
  try { await access(candidate); return true; } catch { return false; }
}

async function currentRows(): Promise<{ firestore: FirebaseFirestore.Firestore; rows: Row[] }> {
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore.collection('media')
    .select('source', 'sourcePath', 'contentIdentity', 'contentIdentityAssessment').get();
  return {
    firestore,
    rows: snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data(),
      updateTime: { seconds: doc.updateTime.seconds, nanoseconds: doc.updateTime.nanoseconds },
    })) as Row[],
  };
}

async function buildEntries(rows: Row[]): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (const row of rows) {
    const classification = classifyMediaIdentityEvidence(row, await localOriginalExists(row));
    if (classification === 'local-original-not-found' || classification === 'source-original-not-retained') {
      entries.push({ mediaId: row.docId, status: classification, source: row.source ?? null, sourcePath: row.sourcePath ?? null, updateTime: row.updateTime });
    }
  }
  return entries.sort((a, b) => a.mediaId.localeCompare(b.mediaId));
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.version !== 1 || fingerprint(manifest.entries) !== manifest.fingerprint ||
      new Set(manifest.entries.map(entry => entry.mediaId)).size !== manifest.entries.length) {
    throw new Error('Classification manifest is invalid or modified');
  }
  return manifest;
}

async function dryRun(rows: Row[]): Promise<void> {
  const entries = await buildEntries(rows);
  const local = entries.filter(entry => entry.status === 'local-original-not-found').length;
  const nonLocal = entries.filter(entry => entry.status === 'source-original-not-retained').length;
  if (rows.length !== 3503 || local !== 101 || nonLocal !== 338) {
    throw new Error(`Population drift: total=${rows.length}, local-unavailable=${local}, source-not-retained=${nonLocal}`);
  }
  const manifest: Manifest = { version: 1, generatedAt: new Date().toISOString(), fingerprint: fingerprint(entries), entries, applied: false };
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ dryRun: true, mediaCount: rows.length, classifiedCount: entries.length, localOriginalNotFound: local, sourceOriginalNotRetained: nonLocal, manifestPath }, null, 2));
}

function audit(rows: Row[]): void {
  const verified = rows.filter(row => Boolean(row.contentIdentity?.digest));
  const assessed = rows.filter(row => Boolean(row.contentIdentityAssessment));
  const overlap = rows.filter(row => row.contentIdentity?.digest && row.contentIdentityAssessment);
  const invalid = assessed.filter(row => {
    const value = row.contentIdentityAssessment;
    return !value ||
      !['local-original-not-found', 'source-original-not-retained'].includes(value.status ?? '') ||
      value.basis !== 'source-audit' || value.assessmentVersion !== ASSESSMENT_VERSION ||
      typeof value.assessedAt !== 'number';
  });
  const unclassified = rows.filter(row => !row.contentIdentity?.digest && !row.contentIdentityAssessment);
  const local = assessed.filter(row => row.contentIdentityAssessment?.status === 'local-original-not-found');
  const nonLocal = assessed.filter(row => row.contentIdentityAssessment?.status === 'source-original-not-retained');
  if (rows.length !== 3503 || verified.length !== 3064 || assessed.length !== 439 || local.length !== 101 ||
      nonLocal.length !== 338 || overlap.length || invalid.length || unclassified.length) {
    throw new Error(`Audit failed: total=${rows.length}, verified=${verified.length}, assessed=${assessed.length}, local=${local.length}, nonLocal=${nonLocal.length}, overlap=${overlap.length}, invalid=${invalid.length}, unclassified=${unclassified.length}`);
  }
  console.log(JSON.stringify({ audit: true, mediaCount: rows.length, verifiedSourceBytes: verified.length,
    classifiedWithoutSourceBytes: assessed.length, localOriginalNotFound: local.length,
    sourceOriginalNotRetained: nonLocal.length, overlap: 0, invalid: 0, unclassified: 0 }, null, 2));
}

async function applyOrRollback(firestore: FirebaseFirestore.Firestore, rows: Row[], rollback: boolean): Promise<void> {
  requireProductionConfirmation();
  requireFreshBackup();
  const manifest = await loadManifest();
  if (rollback !== manifest.applied) throw new Error(rollback ? 'Manifest does not record an applied migration' : 'Manifest is already applied');
  const byId = new Map(rows.map(row => [row.docId, row]));
  const rebuilt = await buildEntries(rows);
  if (fingerprint(rebuilt) !== manifest.fingerprint) throw new Error('Media population changed after dry run');
  for (let start = 0; start < manifest.entries.length; start += 400) {
    const batch = firestore.batch();
    for (const entry of manifest.entries.slice(start, start + 400)) {
      const row = byId.get(entry.mediaId);
      if (!row || row.updateTime.seconds !== entry.updateTime.seconds || row.updateTime.nanoseconds !== entry.updateTime.nanoseconds) {
        throw new Error(`Media changed after dry run: ${entry.mediaId}`);
      }
      const ref = firestore.collection('media').doc(entry.mediaId);
      batch.update(
        ref,
        rollback ? { contentIdentityAssessment: FieldValue.delete() } : {
          contentIdentityAssessment: { status: entry.status, basis: 'source-audit', assessmentVersion: ASSESSMENT_VERSION, assessedAt: Date.now() },
        },
        { lastUpdateTime: new Timestamp(entry.updateTime.seconds, entry.updateTime.nanoseconds) }
      );
    }
    await batch.commit();
  }
  manifest.applied = !rollback;
  const refreshed = await currentRows();
  manifest.entries = await buildEntries(refreshed.rows);
  manifest.fingerprint = fingerprint(manifest.entries);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`${rollback ? 'Rolled back' : 'Applied'} ${manifest.entries.length} media identity classifications.`);
}

async function main(): Promise<void> {
  const app = getAdminApp();
  try {
    const { firestore, rows } = await currentRows();
    if (mode === 'dry-run') await dryRun(rows);
    else if (mode === 'audit') audit(rows);
    else await applyOrRollback(firestore, rows, mode === 'rollback');
  } finally { await app.delete(); }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
